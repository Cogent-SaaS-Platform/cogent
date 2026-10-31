import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { ObligationMetricsService } from '@/modules/regulatory/services/obligationMetricsService';
import { ControlEffectivenessStatus, EvidenceStatus } from '@/modules/regulatory/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/regulatory/obligations/[id]
 * Updates control mapping (controlId, policyId, custodianRole, effectivenessStatus, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId = tenantCtx.organizationId;
    const dbClient = tenantCtx.dbClient;

    const { id: obligationId } = await params;
    if (!obligationId) {
      return NextResponse.json(
        { success: false, error: 'Obligation ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      controlId,
      controlName,
      policyId,
      policyName,
      custodianRole,
      department,
      effectivenessStatus,
      evidenceStatus,
      evidenceArtifactName,
      notes,
    } = body as {
      controlId?: string | null;
      controlName?: string | null;
      policyId?: string | null;
      policyName?: string | null;
      custodianRole?: string;
      department?: string;
      effectivenessStatus?: ControlEffectivenessStatus;
      evidenceStatus?: EvidenceStatus;
      evidenceArtifactName?: string | null;
      notes?: string | null;
    };

    const service = new ObligationMetricsService(dbClient);
    const updated = await service.updateObligationControlMapping(
      organizationId,
      obligationId,
      {
        controlId,
        controlName,
        policyId,
        policyName,
        custodianRole,
        department,
        effectivenessStatus,
        evidenceStatus,
        evidenceArtifactName,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Obligation control mapping successfully updated',
      data: updated,
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed to update obligation control mapping');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update control mapping' },
      { status: 500 }
    );
  }
}
