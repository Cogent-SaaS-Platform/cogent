/**
 * Developer & Founder Test Mode Tier Switcher Route
 * POST /api/billing/dev-switch-tier
 * 
 * Allows testing and verifying quota gates, upgrade popovers, and read-only mode in 1 click.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { PlanTier, PLAN_CONFIG } from '@/lib/plans';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Developer tier switcher is disabled in production' },
      { status: 403 }
    );
  }

  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const adminDb = createAdminClient();

    const body = await req.json();
    const organizationId = body.organizationId || tenantCtx.organizationId;
    const rawTarget = (body.targetTier || body.tier || 'STARTER').toUpperCase();
    let targetTier: PlanTier = 'STARTER';
    let simulateExpired = Boolean(body.simulateExpired);

    if (rawTarget === 'TRIAL_EXPIRED') {
      targetTier = 'TRIAL';
      simulateExpired = true;
    } else if (rawTarget === 'TRIAL') {
      targetTier = 'TRIAL';
    } else if (rawTarget === 'PRO') {
      targetTier = 'PRO';
    } else if (rawTarget === 'ENTERPRISE') {
      targetTier = 'ENTERPRISE';
    } else {
      targetTier = 'STARTER';
    }

    let status = 'active';
    let trialEndsAt: string | null = null;
    let dbTier = targetTier;

    if (targetTier === 'TRIAL') {
      dbTier = 'STARTER';
      status = 'trialing';
      if (simulateExpired) {
        // Expired 1 hour ago
        trialEndsAt = new Date(Date.now() - 3600000).toISOString();
      } else {
        // 6 days remaining
        trialEndsAt = new Date(Date.now() + 6 * 86400000).toISOString();
      }
    }

    const planLimits = PLAN_CONFIG[targetTier];

    // Upsert subscription record in tenant_subscriptions
    const { data: updatedSub, error: updateErr } = await (adminDb.from('tenant_subscriptions') as any)
      .upsert(
        {
          organization_id: organizationId,
          tier: dbTier,
          status,
          trial_ends_at: trialEndsAt,
          marketing_scan_quota: planLimits.maxMarketingCampaignsPerMonth,
          policy_document_quota: planLimits.maxPoliciesUploaded,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )
      .select('*')
      .single();

    if (updateErr) {
      logger.error({ error: updateErr.message, organizationId }, 'Failed updating test subscription tier');
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    logger.info(
      { organizationId, targetTier, simulateExpired, status },
      'Developer test mode tier successfully updated'
    );

    return NextResponse.json({
      success: true,
      effectiveTier: targetTier,
      isExpired: simulateExpired,
      message: `Test workspace tier updated to ${targetTier}${simulateExpired ? ' (EXPIRED READ-ONLY)' : ''}`,
      data: {
        tier: targetTier,
        effectiveTier: targetTier,
        status,
        trialEndsAt,
        isReadOnly: simulateExpired,
        isExpired: simulateExpired,
        subscription: updatedSub,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ error: error.message }, 'Unexpected error in dev tier switcher');
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
