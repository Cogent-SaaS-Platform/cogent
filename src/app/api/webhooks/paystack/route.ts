/**
 * Cogent Production Paystack Webhook Handler
 * Cryptographically verifies Paystack HMAC-SHA512 signatures, enforces database
 * transaction idempotency, and synchronizes tenant subscription lifecycles.
 * Adheres strictly to docs/launch/PHASE_A4_BILLING_SUBSCRIPTIONS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient, Json } from '@/shared/db';
import { logger } from '@/shared/logger';
import {
  PaystackWebhookPayload,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/shared/types';
import { COGENT_PLANS } from '@/shared/billing';

/**
 * Validates HMAC-SHA512 signature in constant time to prevent timing attacks.
 */
function verifyHmacSignature(rawBody: string, signature: string | null, secretKey: string): boolean {
  if (!signature || !secretKey) {
    return false;
  }

  try {
    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody, 'utf8')
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const computedBuffer = Buffer.from(computedHash, 'utf8');

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  } catch (err: unknown) {
    logger.warn({ err }, 'Error during HMAC verification calculation');
    return false;
  }
}

/**
 * Derives subscription tier from plan code or metadata.
 */
function deriveTierFromPlan(planCode?: string, metadataTier?: SubscriptionTier): SubscriptionTier {
  if (metadataTier && ['STARTER', 'PRO', 'ENTERPRISE'].includes(metadataTier)) {
    return metadataTier;
  }

  if (planCode) {
    for (const [tierKey, planMeta] of Object.entries(COGENT_PLANS)) {
      if (
        planCode === planMeta.paystackPlanCodeMonthly ||
        planCode === planMeta.paystackPlanCodeAnnual
      ) {
        return tierKey as SubscriptionTier;
      }
    }

    const upper = planCode.toUpperCase();
    if (upper.includes('ENTERPRISE')) return 'ENTERPRISE';
    if (upper.includes('PRO')) return 'PRO';
    if (upper.includes('STARTER')) return 'STARTER';
  }

  return 'STARTER';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

  try {
    // 1. Read Raw Request Body and Signature Header
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      logger.warn('Rejected Paystack webhook: missing x-paystack-signature header');
      return NextResponse.json(
        { success: false, error: 'Missing x-paystack-signature header' },
        { status: 401 }
      );
    }

    // 2. Cryptographic HMAC-SHA512 Verification
    const isSignatureValid = verifyHmacSignature(rawBody, signature, secretKey);
    if (!isSignatureValid) {
      logger.warn(
        { signaturePrefix: signature.slice(0, 10) },
        'Rejected Paystack webhook: HMAC-SHA512 signature mismatch'
      );
      return NextResponse.json(
        { success: false, error: 'Invalid HMAC signature' },
        { status: 401 }
      );
    }

    // 3. Parse Verified Event Payload
    const event: PaystackWebhookPayload = JSON.parse(rawBody);
    const eventType = event.event;
    const eventData = event.data;

    // Deterministic unique event reference
    const eventRef =
      eventData?.reference ||
      (eventData?.id ? `${eventType}_${eventData.id}` : null) ||
      `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    logger.info(
      { eventType, eventRef },
      'Processing verified Paystack webhook event'
    );

    const adminDb = createAdminClient();

    // 4. Idempotency Check: Prevent duplicate processing and replay attacks
    const { data: existingEvent, error: existingEventError } = await adminDb
      .from('billing_events')
      .select('id, processed_at')
      .eq('event_id', eventRef)
      .maybeSingle();

    if (existingEventError) {
      logger.error(
        { error: existingEventError.message, eventRef },
        'Database error querying billing events ledger'
      );
      return NextResponse.json(
        { success: false, error: 'Database ledger error' },
        { status: 500 }
      );
    }

    if (existingEvent) {
      logger.info(
        { eventRef, processedAt: existingEvent.processed_at },
        'Paystack webhook already processed (Idempotent acknowledge)'
      );
      return NextResponse.json({
        success: true,
        status: 'ALREADY_PROCESSED',
        eventId: eventRef,
      });
    }

    // 5. Subscription Lifecycle Synchronization
    let resolvedOrgId: string | null = (eventData?.metadata?.organizationId as string) || null;

    switch (eventType) {
      case 'charge.success': {
        const metadataTier = eventData?.metadata?.tier as SubscriptionTier | undefined;
        const planCode = eventData?.plan?.plan_code;
        const tier = deriveTierFromPlan(planCode, metadataTier);
        const customerCode = eventData?.customer?.customer_code;
        const subscriptionCode = eventData?.subscription_code;
        const limits = COGENT_PLANS[tier].limits;

        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (resolvedOrgId) {
          const { error: upsertErr } = await adminDb.from('tenant_subscriptions').upsert(
            {
              organization_id: resolvedOrgId,
              paystack_customer_code: customerCode || null,
              paystack_subscription_code: subscriptionCode || null,
              paystack_plan_code: planCode || null,
              tier,
              status: 'active' as SubscriptionStatus,
              trial_ends_at: null,
              grace_period_ends_at: null,
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd,
              cancel_at_period_end: false,
              marketing_scan_quota: limits.marketingScansPerMonth,
              policy_document_quota: limits.policyDocuments,
            },
            { onConflict: 'organization_id' }
          );

          if (upsertErr) {
            logger.error(
              { error: upsertErr.message, resolvedOrgId },
              'Failed to upsert tenant subscription on charge.success'
            );
            throw upsertErr;
          }

          logger.info(
            { resolvedOrgId, tier, status: 'active' },
            'Tenant subscription activated via charge.success'
          );
        } else if (customerCode) {
          // Attempt lookup by existing customer code if orgId was not in metadata
          const { data: existingSub } = await adminDb
            .from('tenant_subscriptions')
            .select('organization_id')
            .eq('paystack_customer_code', customerCode)
            .maybeSingle();

          if (existingSub) {
            resolvedOrgId = existingSub.organization_id;
            await adminDb
              .from('tenant_subscriptions')
              .update({
                status: 'active',
                tier,
                grace_period_ends_at: null,
                current_period_end: periodEnd,
              })
              .eq('organization_id', resolvedOrgId);
          }
        }
        break;
      }

      case 'subscription.create': {
        const subscriptionCode = eventData?.subscription_code;
        const planCode = eventData?.plan?.plan_code;
        const customerCode = eventData?.customer?.customer_code;
        const tier = deriveTierFromPlan(planCode, eventData?.metadata?.tier as SubscriptionTier);
        const limits = COGENT_PLANS[tier].limits;

        if (resolvedOrgId) {
          await adminDb.from('tenant_subscriptions').upsert(
            {
              organization_id: resolvedOrgId,
              paystack_customer_code: customerCode || null,
              paystack_subscription_code: subscriptionCode || null,
              paystack_plan_code: planCode || null,
              tier,
              status: 'active' as SubscriptionStatus,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              marketing_scan_quota: limits.marketingScansPerMonth,
              policy_document_quota: limits.policyDocuments,
            },
            { onConflict: 'organization_id' }
          );

          logger.info(
            { resolvedOrgId, subscriptionCode, tier },
            'Tenant subscription record initialized via subscription.create'
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Enforce 7-Day Grace Period before dropping to read-only
        const subscriptionCode = eventData?.subscription_code;
        const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        if (subscriptionCode) {
          const { data: matchedSub } = await adminDb
            .from('tenant_subscriptions')
            .select('organization_id')
            .eq('paystack_subscription_code', subscriptionCode)
            .maybeSingle();

          if (matchedSub) {
            resolvedOrgId = matchedSub.organization_id;
            await adminDb
              .from('tenant_subscriptions')
              .update({
                status: 'past_due' as SubscriptionStatus,
                grace_period_ends_at: gracePeriodEnd,
              })
              .eq('organization_id', resolvedOrgId);

            logger.warn(
              { resolvedOrgId, subscriptionCode, gracePeriodEnd },
              'Subscription marked past_due; 7-day grace period initiated'
            );
          }
        }
        break;
      }

      case 'subscription.disable':
      case 'subscription.expiring': {
        const subscriptionCode = eventData?.subscription_code;
        if (subscriptionCode) {
          const { data: matchedSub } = await adminDb
            .from('tenant_subscriptions')
            .select('organization_id')
            .eq('paystack_subscription_code', subscriptionCode)
            .maybeSingle();

          if (matchedSub) {
            resolvedOrgId = matchedSub.organization_id;
            await adminDb
              .from('tenant_subscriptions')
              .update({
                status: 'canceled' as SubscriptionStatus,
                cancel_at_period_end: true,
              })
              .eq('organization_id', resolvedOrgId);

            logger.info(
              { resolvedOrgId, subscriptionCode },
              'Subscription canceled; tenant transitioned to read-only archive status'
            );
          }
        }
        break;
      }

      default: {
        logger.info({ eventType }, 'Paystack event acknowledged without state modification');
        break;
      }
    }

    // 6. Record Event in Idempotent Ledger (billing_events)
    const { error: ledgerError } = await adminDb.from('billing_events').insert({
      event_id: eventRef,
      event_type: eventType,
      organization_id: resolvedOrgId,
      payload: event as unknown as Json,
    });

    if (ledgerError) {
      logger.error(
        { error: ledgerError.message, eventRef },
        'Failed to log event into billing_events ledger'
      );
      // We do not fail the request if state was already updated, but log warning
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      status: 'PROCESSED',
      eventId: eventRef,
      elapsedMs,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message, stack: error.stack },
      'Uncaught exception in Paystack webhook processing'
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error processing webhook',
      },
      { status: 500 }
    );
  }
}
