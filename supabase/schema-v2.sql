-- ============================================================
-- CogniStudy Schema — v2 Migration
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add subscription fields to profiles
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_plan     TEXT,                         -- 'monthly' | 'annual'
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revenue_cat_user_id   TEXT;

-- Index so webhook lookups by RevenueCat user ID are fast
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat
  ON public.profiles(revenue_cat_user_id);

-- ------------------------------------------------------------
-- 2. AI usage tracking — one row per user per billing month
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id                  UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID      NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- ISO date of the first day of the billing month, e.g. '2026-02-01'
  period_start        DATE      NOT NULL,
  input_tokens_used   BIGINT    NOT NULL DEFAULT 0,
  output_tokens_used  BIGINT    NOT NULL DEFAULT 0,
  generations_count   INTEGER   NOT NULL DEFAULT 0,
  last_updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period_start)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage (displayed in Settings)
CREATE POLICY "Users can view own ai_usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role (edge functions) can write rows
-- No INSERT/UPDATE policy for users — writes go through edge functions only

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_period
  ON public.ai_usage(user_id, period_start);

-- ------------------------------------------------------------
-- 3. Helper: atomically increment total_cards_studied on profile
--    Called from the FlashcardPlayer edge after each session
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_cards_studied(
  p_user_id UUID,
  p_count    INTEGER
) RETURNS VOID AS $$
  UPDATE public.profiles
  SET total_cards_studied = total_cards_studied + p_count
  WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Allow authenticated users to call this function for themselves
REVOKE ALL ON FUNCTION increment_cards_studied(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_cards_studied(UUID, INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- 4. Helper: calculate GPT-4o cost in USD cents from tokens
--    For display purposes only; enforcement is in edge functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai_usage_cost_cents(
  input_tokens BIGINT,
  output_tokens BIGINT
) RETURNS NUMERIC AS $$
  -- GPT-4o: $2.50 / 1M input tokens, $10.00 / 1M output tokens
  SELECT ROUND(
    (input_tokens  / 1000000.0 * 2.50 * 100) +
    (output_tokens / 1000000.0 * 10.0 * 100),
    4
  );
$$ LANGUAGE sql IMMUTABLE;
