import { NextRequest, NextResponse } from 'next/server';
import { StatutoryBenchmarkService } from '@/modules/gap-matrix/services/statutoryBenchmarkService';
import { getTenantContext } from '@/shared/auth';
import { OrgDepartment } from '@/shared/types';
import { StatutoryBenchmarkFramework } from '@/modules/gap-matrix/types';
import { logger } from '@/shared/logger';

const FALLBACK_BENCHMARKS: StatutoryBenchmarkFramework[] = [
  {
    documentVersionId: 'bench-cbn-aml-2022',
    instrumentTitle: 'Central Bank of Nigeria (Anti-Money Laundering and Combating Financing of Terrorism) Regulations 2022',
    shortName: 'CBN AML/CFT Regulations 2022',
    referenceCode: 'CBN/AML/2022',
    regulatorCode: 'CBN',
    publicationDate: '2022-04-01',
    effectiveDate: '2022-04-01',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'OPERATIONS'],
    clausesCount: 42,
  },
  {
    documentVersionId: 'bench-mlppa-2022',
    instrumentTitle: 'Money Laundering (Prevention and Prohibition) Act 2022',
    shortName: 'MLPPA 2022',
    referenceCode: 'MLPPA/2022/ACT',
    regulatorCode: 'NFIU',
    publicationDate: '2022-05-12',
    effectiveDate: '2022-05-12',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'OPERATIONS'],
    clausesCount: 30,
  },
  {
    documentVersionId: 'bench-ndpa-2023',
    instrumentTitle: 'Nigeria Data Protection Act 2023',
    shortName: 'NDPA 2023',
    referenceCode: 'NDPA/2023/ACT',
    regulatorCode: 'NDPC',
    publicationDate: '2023-06-12',
    effectiveDate: '2023-06-12',
    suggestedDepartments: ['COMPLIANCE_LEGAL', 'ENGINEERING_TECH'],
    clausesCount: 65,
  },
];

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') as OrgDepartment | null;

    if (!tenantCtx.dbClient) {
      return NextResponse.json({
        success: true,
        data: FALLBACK_BENCHMARKS.filter(b => !department || b.suggestedDepartments.includes(department)),
      });
    }

    const benchmarkService = new StatutoryBenchmarkService({ dbClient: tenantCtx.dbClient });
    const benchmarks = await benchmarkService.getAvailableBenchmarks(
      department || undefined
    );

    return NextResponse.json({ success: true, data: benchmarks });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed fetching statutory benchmarks');
    return NextResponse.json(
      { error: err.message || 'Failed fetching benchmarks' },
      { status: 500 }
    );
  }
}
