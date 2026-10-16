-- ============================================================
-- FlashCardAI Schema — v3 Migration
-- Run in Supabase SQL Editor AFTER schema.sql AND schema-v2.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. AI Credits on profiles
--    Each credit = 1 AI flashcard generation.
--    Credits are purchased as consumable IAPs and never expire.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 0;

-- Ensure credits can never go below zero
ALTER TABLE public.profiles
  ADD CONSTRAINT ai_credits_non_negative CHECK (ai_credits >= 0);

-- ------------------------------------------------------------
-- 2. Hourly rate-limit columns on ai_usage
--    Tracks how many AI calls a user has made in the current
--    clock-hour. Resets automatically when the hour rolls over.
-- ------------------------------------------------------------
ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS requests_this_hour INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hour_window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ------------------------------------------------------------
-- 3. Credit pack catalogue
--    Source of truth for how many credits each product gives.
--    The RevenueCat webhook looks up rows here by product_id.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_packs (
  product_id   TEXT PRIMARY KEY,           -- matches RevenueCat / store product ID
  credits      INTEGER NOT NULL,           -- credits awarded on purchase
  price_usd    NUMERIC(6,2) NOT NULL,      -- display price (informational)
  label        TEXT NOT NULL               -- display label, e.g. "10 Generations"
);

-- Seed the catalogue — adjust prices to match your store listing
INSERT INTO public.credit_packs (product_id, credits, price_usd, label) VALUES
  ('flashcardai_credits_5',  5,  0.99, '5 Generations'),
  ('flashcardai_credits_15', 15, 1.99, '15 Generations'),
  ('flashcardai_credits_50', 50, 4.99, '50 Generations')
ON CONFLICT (product_id) DO UPDATE
  SET credits   = EXCLUDED.credits,
      price_usd = EXCLUDED.price_usd,
      label     = EXCLUDED.label;

-- Only the service role can write; users can read (for displaying pack info)
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read credit packs"
  ON public.credit_packs FOR SELECT USING (true);

-- ------------------------------------------------------------
-- 4. Atomic: consume_ai_generation()
--    Called by the edge function BEFORE the LLM call.
--    Handles rate limiting, free-tier gate, and credit deduction
--    in a single serialisable transaction — no race conditions.
--
--    Returns JSON:
--      { "allowed": true,  "source": "free"|"subscription"|"credits", "credits_remaining": N }
--      { "allowed": false, "reason": "RATE_LIMITED"|"UPGRADE_REQUIRED", ... }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION consume_ai_generation(
  p_user_id     UUID,
  p_is_paid     BOOLEAN,
  p_period_start DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile          RECORD;
  v_usage            RECORD;
  v_now              TIMESTAMPTZ := NOW();
  v_hour_start       TIMESTAMPTZ := date_trunc('hour', v_now);

  -- Tuneable limits
  c_free_monthly     CONSTANT INTEGER := 3;
  c_hourly_hard_cap  CONSTANT INTEGER := 10;  -- max AI calls per user per hour

  v_deduct_credit    BOOLEAN := false;
  v_source           TEXT;
BEGIN
  -- ── Lock profile row (serialises credit deductions) ─────────
  SELECT ai_credits, subscription_status
  INTO   v_profile
  FROM   public.profiles
  WHERE  id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'reason', 'PROFILE_NOT_FOUND');
  END IF;

  -- ── Upsert usage row, then lock it ───────────────────────────
  INSERT INTO public.ai_usage
    (user_id, period_start, input_tokens_used, output_tokens_used,
     generations_count, requests_this_hour, hour_window_start, last_updated_at)
  VALUES
    (p_user_id, p_period_start, 0, 0, 0, 0, v_hour_start, v_now)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT * INTO v_usage
  FROM   public.ai_usage
  WHERE  user_id = p_user_id AND period_start = p_period_start
  FOR UPDATE;

  -- ── Reset hourly counter when the clock-hour has rolled over ─
  IF v_usage.hour_window_start < v_hour_start THEN
    UPDATE public.ai_usage
    SET    requests_this_hour = 0,
           hour_window_start  = v_hour_start
    WHERE  user_id = p_user_id AND period_start = p_period_start;
    v_usage.requests_this_hour := 0;
  END IF;

  -- ── Hard hourly rate limit (all users, prevents abuse) ───────
  IF v_usage.requests_this_hour >= c_hourly_hard_cap THEN
    RETURN json_build_object(
      'allowed',              false,
      'reason',               'RATE_LIMITED',
      'retry_after_minutes',  60 - EXTRACT(MINUTE FROM v_now)::INTEGER
    );
  END IF;

  -- ── Determine generation source ───────────────────────────────
  IF p_is_paid THEN
    -- Paid subscribers always allowed (edge fn enforces dollar budget separately)
    v_source := 'subscription';

  ELSIF v_usage.generations_count < c_free_monthly THEN
    -- Free tier still has allowance
    v_source := 'free';

  ELSIF v_profile.ai_credits > 0 THEN
    -- Free tier exhausted but has purchased credits
    v_source        := 'credits';
    v_deduct_credit := true;

  ELSE
    -- No allowance, no credits, not subscribed
    RETURN json_build_object(
      'allowed',              false,
      'reason',               'UPGRADE_REQUIRED',
      'generations_used',     v_usage.generations_count,
      'free_limit',           c_free_monthly,
      'credits_remaining',    v_profile.ai_credits
    );
  END IF;

  -- ── Atomically deduct credit if needed ───────────────────────
  IF v_deduct_credit THEN
    UPDATE public.profiles
    SET    ai_credits = ai_credits - 1
    WHERE  id = p_user_id;
  END IF;

  -- ── Increment hourly counter ──────────────────────────────────
  UPDATE public.ai_usage
  SET    requests_this_hour = requests_this_hour + 1,
         last_updated_at    = v_now
  WHERE  user_id = p_user_id AND period_start = p_period_start;

  RETURN json_build_object(
    'allowed',           true,
    'source',            v_source,
    'credits_remaining', v_profile.ai_credits - (CASE WHEN v_deduct_credit THEN 1 ELSE 0 END)
  );
END;
$$;

-- Authenticated users may call this function
REVOKE ALL ON FUNCTION consume_ai_generation(UUID, BOOLEAN, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION consume_ai_generation(UUID, BOOLEAN, DATE) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 5. Atomic: add_ai_credits()
--    Called by the RevenueCat webhook after a credit-pack purchase.
--    Looks up the pack by product_id, adds the right credit count.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_ai_credits(
  p_user_id   UUID,
  p_product_id TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack   RECORD;
  v_new    INTEGER;
BEGIN
  SELECT credits INTO v_pack
  FROM   public.credit_packs
  WHERE  product_id = p_product_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'unknown_product', 'product_id', p_product_id);
  END IF;

  UPDATE public.profiles
  SET    ai_credits = ai_credits + v_pack.credits
  WHERE  id = p_user_id
  RETURNING ai_credits INTO v_new;

  RETURN json_build_object('ok', true, 'credits_added', v_pack.credits, 'credits_total', v_new);
END;
$$;

REVOKE ALL ON FUNCTION add_ai_credits(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION add_ai_credits(UUID, TEXT) TO service_role;

-- ------------------------------------------------------------
-- 7. Atomic: increment_token_usage()
--    Called after a successful LLM call to add token counts.
--    Separated from consume_ai_generation() so token tracking
--    is fire-and-forget and never blocks the response.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_user_id       UUID,
  p_period_start  DATE,
  p_input_tokens  BIGINT,
  p_output_tokens BIGINT,
  p_source        TEXT DEFAULT 'unknown'
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.ai_usage
    (user_id, period_start, input_tokens_used, output_tokens_used,
     generations_count, last_updated_at)
  VALUES
    (p_user_id, p_period_start, p_input_tokens, p_output_tokens, 1, NOW())
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET input_tokens_used  = public.ai_usage.input_tokens_used  + EXCLUDED.input_tokens_used,
        output_tokens_used = public.ai_usage.output_tokens_used + EXCLUDED.output_tokens_used,
        last_updated_at    = NOW();
$$;

REVOKE ALL ON FUNCTION increment_token_usage(UUID, DATE, BIGINT, BIGINT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION increment_token_usage(UUID, DATE, BIGINT, BIGINT, TEXT) TO service_role;

-- ------------------------------------------------------------
-- 8. Allow users to read their own credit balance
--    (already covered by the existing profile SELECT policy,
--     but the ai_credits column is now included in that row)
-- ------------------------------------------------------------
