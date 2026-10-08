import { NextRequest, NextResponse } from 'next/server';
import { GapSynthesisService } from '@/modules/gap-matrix/services/gapSynthesisService';
import { getTenantContext } from '@/shared/auth';
import { EntitlementEngine } from '@/shared/billing';
import { AppError } from '@/shared/errors';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantCtx = await getTenantContext();

    // Enforce active subscription / trial before compute-heavy policy gap matrix evaluation
    EntitlementEngine.assertCanEvaluatePolicy(tenantCtx.subscription);

    const gapSynthesisService = new GapSynthesisService({ dbClient: tenantCtx.dbClient });

    const {
      policyId,
      benchmarkDocumentVersionId,
      policyTitle,
      department,
    } = body;
    const organizationId = tenantCtx.organizationId;
    const userId = tenantCtx.userId;

    if (!policyId || !benchmarkDocumentVersionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: policyId and benchmarkDocumentVersionId' },
        { status: 400 }
      );
    }

    const evaluation = await gapSynthesisService.evaluatePolicyGap({
      organizationId,
      policyId,
      benchmarkDocumentVersionId,
      policyTitle,
      department,
      userId,
    });

    return NextResponse.json({ success: true, data: evaluation });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      logger.warn(
        { errorCode: error.code, statusCode: error.statusCode, message: error.message },
        'Gap matrix evaluation halted by entitlement gate'
      );
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed executing 5-W gap evaluation');
    return NextResponse.json(
      { error: err.message || 'Internal evaluation error' },
      { status: 500 }
    );
  }
}
