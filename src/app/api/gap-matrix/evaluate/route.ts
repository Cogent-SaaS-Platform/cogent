import { NextRequest, NextResponse } from 'next/server';
import { GapSynthesisService } from '@/modules/gap-matrix/services/gapSynthesisService';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantCtx = await getTenantContext();
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
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed executing 5-W gap evaluation');
    return NextResponse.json(
      { error: error.message || 'Internal evaluation error' },
      { status: 500 }
    );
  }
}
