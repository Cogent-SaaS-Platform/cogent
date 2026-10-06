import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultExecutiveOverviewService } from '@/modules/executive/services/executiveOverviewService';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

const ExportExecutiveBriefSchema = z.object({
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable; fallback to tenant context
    }

    const parsed = ExportExecutiveBriefSchema.safeParse(body);
    const tenantCtx = await getTenantContext();
    const organizationId = parsed.success && parsed.data.organizationId
      ? parsed.data.organizationId
      : tenantCtx.organizationId;
    const organizationName = parsed.success && parsed.data.organizationName
      ? parsed.data.organizationName
      : 'Apex Paystack FinTech Ltd';

    const exportResult = await defaultExecutiveOverviewService.generateExecutiveComplianceExport(
      organizationId,
      organizationName
    );

    return NextResponse.json({
      success: true,
      data: exportResult,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed generating executive compliance export');
    return NextResponse.json(
      { error: error.message || 'Failed generating executive compliance export' },
      { status: 500 }
    );
  }
}
