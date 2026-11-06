import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { ObligationUserOverride } from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();
    const organizationId = tenantCtx.organizationId;
    const userId = tenantCtx.userId;

    const body = await req.json();
    const { obligationId, override } = body as {
      obligationId: string;
      override: ObligationUserOverride;
    };

    if (!obligationId || !override) {
      return NextResponse.json(
        { success: false, error: 'obligationId and override data are required' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const { error: dbErr } = await (db as any).from('obligation_user_overrides').upsert(
      {
        organization_id: organizationId,
        obligation_id: obligationId,
        status: override.status,
        internal_notes: override.internalNotes || null,
        internal_sop_citation: override.internalSopCitation || null,
        assigned_owner: override.assignedOwner || null,
        verified_criteria_ids: override.verifiedCriteriaIds || [],
        updated_by: userId || null,
        updated_at: nowIso,
      },
      { onConflict: 'organization_id,obligation_id' }
    );

    if (dbErr) {
      logger.error({ error: dbErr.message, obligationId }, 'Failed persisting obligation override');
      return NextResponse.json(
        { success: false, error: `Failed saving obligation override: ${dbErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Obligation compliance override recorded successfully',
      data: {
        obligationId,
        override: {
          ...override,
          lastReviewedAt: nowIso,
        },
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to save obligation override');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
