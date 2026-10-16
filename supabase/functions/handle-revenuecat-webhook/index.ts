// ============================================================
// Supabase Edge Function: handle-revenuecat-webhook
// ============================================================
// Deploy: supabase functions deploy handle-revenuecat-webhook
// Secrets: supabase secrets set REVENUECAT_WEBHOOK_AUTH_TOKEN=<your_token>
//
// In RevenueCat dashboard:
//   Project → Integrations → Webhooks
//   URL: https://<project>.supabase.co/functions/v1/handle-revenuecat-webhook
//   Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH_TOKEN>
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_AUTH_TOKEN = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN')!;

// RevenueCat sends server-to-server — no CORS headers needed
const JSON_HEADER = { 'Content-Type': 'application/json' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  // Webhooks are POST only; reject anything else
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADER,
    });
  }

  // ── 1. Verify RevenueCat webhook token ─────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${WEBHOOK_AUTH_TOKEN}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADER,
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: JSON_HEADER,
    });
  }

  const event = payload?.event as Record<string, unknown> | undefined;
  if (!event) {
    return new Response(JSON.stringify({ error: 'Missing event' }), {
      status: 400,
      headers: JSON_HEADER,
    });
  }

  const eventType = event.type as string;
  const appUserId = event.app_user_id as string;          // This is our Supabase user UUID

  // Validate UUID format — prevents malformed IDs from reaching the DB
  if (!appUserId || !UUID_RE.test(appUserId)) {
    return new Response(JSON.stringify({ error: 'Invalid app_user_id' }), {
      status: 400,
      headers: JSON_HEADER,
    });
  }
  const expiresAt = event.expiration_at_ms              // ms epoch, may be null
    ? new Date(event.expiration_at_ms as number).toISOString()
    : null;
  const productId = event.product_id as string | undefined; // e.g. cognistudy_pro_monthly


  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Determine plan from product ID
  const plan = productId?.includes('annual') ? 'annual'
    : productId?.includes('monthly') ? 'monthly'
    : null;

  // ── Handle consumable credit-pack purchases ───────────────────
  // RevenueCat fires NON_SUBSCRIPTION_PURCHASE for consumable IAPs.
  // We call add_ai_credits() which looks up the product in credit_packs
  // and atomically adds the right number of credits to the user's profile.
  if (eventType === 'NON_SUBSCRIPTION_PURCHASE') {
    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing product_id for credit purchase' }), {
        status: 400,
        headers: JSON_HEADER,
      });
    }

    const { data: creditResult, error: creditError } = await adminClient
      .rpc('add_ai_credits', { p_user_id: appUserId, p_product_id: productId });

    if (creditError) {
      console.error('add_ai_credits error:', creditError);
      return new Response(JSON.stringify({ error: 'Failed to add credits' }), {
        status: 500,
        headers: JSON_HEADER,
      });
    }

    const result = creditResult as Record<string, unknown>;
    if (!result?.ok) {
      console.error('add_ai_credits returned not-ok:', result);
      return new Response(JSON.stringify({ error: 'Unknown credit product', product_id: productId }), {
        status: 400,
        headers: JSON_HEADER,
      });
    }

    console.log(`Credits added for ${appUserId}: +${result.credits_added} → total ${result.credits_total} (${productId})`);
    return new Response(JSON.stringify({ ok: true, credits_added: result.credits_added }), {
      status: 200,
      headers: JSON_HEADER,
    });
  }

  // ── Map subscription event types to state ─────────────────────
  //  INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, REACTIVATION → active
  //  EXPIRATION, CANCELLATION → free
  //  BILLING_ISSUE → grace (keep access, flag for dunning)
  let status: string;

  switch (eventType) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'REACTIVATION':
      status = 'active';
      break;
    case 'EXPIRATION':
    case 'CANCELLATION':
      status = 'free';
      break;
    case 'BILLING_ISSUE':
      status = 'grace';
      break;
    default:
      console.log(`Unhandled RevenueCat event type: ${eventType}`);
      return new Response(JSON.stringify({ ok: true, msg: 'event ignored' }), {
        status: 200,
        headers: JSON_HEADER,
      });
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      subscription_status:    status,
      subscription_plan:      status !== 'free' ? plan : null,
      subscription_expires_at: expiresAt,
      revenue_cat_user_id:    appUserId,
    })
    .eq('id', appUserId);

  if (error) {
    console.error('Failed to update subscription:', error);
    return new Response(JSON.stringify({ error: 'DB update failed' }), {
      status: 500,
      headers: JSON_HEADER,
    });
  }

  console.log(`Subscription updated for ${appUserId}: ${status} (${eventType})`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: JSON_HEADER,
  });
});
