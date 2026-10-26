import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExecutiveOverviewService } from '@/modules/executive/services/executiveOverviewService';
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
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId =
      tenantCtx.isDevFallback && parsed.success && parsed.data.organizationId
        ? parsed.data.organizationId
        : tenantCtx.organizationId;
    let organizationName: string =
      parsed.success && parsed.data.organizationName ? parsed.data.organizationName.trim() : '';
    if (!organizationName) {
      const response = await tenantCtx.dbClient
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();
      const org = response.data as { name: string } | null;
      organizationName = org?.name || 'Authorized Tenant';
    }

    const executiveOverviewService = new ExecutiveOverviewService({ dbClient: tenantCtx.dbClient });
    const exportResult = await executiveOverviewService.generateExecutiveComplianceExport(
      organizationId,
      organizationName
    );

    return NextResponse.json({
      success: true,
      data: exportResult,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed generating executive compliance export');
    return NextResponse.json(
      { error: err.message || 'Failed generating executive compliance export' },
      { status: 500 }
    );
  }
}
