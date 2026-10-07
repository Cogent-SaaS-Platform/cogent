import { NextRequest, NextResponse } from 'next/server';
import { StatutoryBenchmarkService } from '@/modules/gap-matrix/services/statutoryBenchmarkService';
import { getTenantContext } from '@/shared/auth';
import { OrgDepartment } from '@/shared/types';
import { logger } from '@/shared/logger';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const benchmarkService = new StatutoryBenchmarkService({ dbClient: tenantCtx.dbClient });
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') as OrgDepartment | null;

    const benchmarks = await benchmarkService.getAvailableBenchmarks(
      department || undefined
    );

    return NextResponse.json({ success: true, data: benchmarks });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed fetching statutory benchmarks');
    return NextResponse.json(
      { error: error.message || 'Failed fetching benchmarks' },
      { status: 500 }
    );
  }
}
