import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { TenantBootstrapService } from '@/modules/onboarding/services/tenantBootstrapService';
import { logger } from '@/shared/logger';
import { LicenseType, PaymentRail } from '@/shared/types';

export const dynamic = 'force-dynamic';

/**
 * Institutional Rapid Onboarding Bootstrap API (Phase 5 / Epic 4)
 * Generates an instant, license-matched regulatory feed, an anchored obligation register,
 * and baseline departmental readiness within seconds.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const body = await req.json();

    const {
      licenseType,
      additionalLicenses = [],
      paymentRails = [],
      policyManualText,
      policyManualTitle,
    } = body;

    if (!licenseType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: licenseType' },
        { status: 400 }
      );
    }

    const service = new TenantBootstrapService(tenantCtx.dbClient);

    const result = await service.bootstrapTenantProfile({
      organizationId: tenantCtx.organizationId,
      licenseType: licenseType as LicenseType,
      additionalLicenses: additionalLicenses as LicenseType[],
      paymentRails: paymentRails as PaymentRail[],
      policyManualText,
      policyManualTitle,
    });

    return NextResponse.json({
      success: true,
      message: `Tenant onboarded successfully in ${result.timeToValueSeconds}s: ${result.matchedCircularsCount} active circulars matched, ${result.obligationRegister.totalObligationsRegistered} obligations registered.`,
      data: result,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ error: error.message }, 'Failed executing tenant bootstrap onboarding');
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal failure during rapid onboarding bootstrap',
      },
      { status: 500 }
    );
  }
}
