import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      companySize,
      rcNumber,
      companyWebsite,
      industryCategory,
      department,
      customDepartment,
      jobTitle,
      primaryRegulators,
      licenseType,
      licenseNumber,
      operatingEnvironment,
      paymentRails,
      productCategories,
      invitedMembers,
    } = body;

    const tenantCtx = await getTenantContext();
    const organizationId = tenantCtx.organizationId;
    const dbClient = tenantCtx.dbClient;

    logger.info(
      { organizationId, companyName, department, licenseType },
      'Processing tenant onboarding setup'
    );

    // Update organization details in Supabase if db client is available
    if (dbClient) {
      try {
        await dbClient
          .from('organizations')
          .update({
            name: companyName,
            rc_number: rcNumber || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId);

        // Insert primary license if selected
        if (licenseType && primaryRegulators && primaryRegulators.length > 0) {
          await dbClient
            .from('tenant_licenses')
            .upsert(
              {
                organization_id: organizationId,
                license_type: licenseType,
                license_number: licenseNumber || null,
                issuing_regulator: primaryRegulators[0],
                is_active: true,
              },
              { onConflict: 'organization_id,license_type' }
            );
        }

        // Insert payment rails if selected
        if (Array.isArray(paymentRails) && paymentRails.length > 0) {
          for (const rail of paymentRails) {
            await dbClient
              .from('tenant_payment_rails')
              .upsert(
                {
                  organization_id: organizationId,
                  rail_type: rail,
                  integration_status: operatingEnvironment === 'SANDBOX' ? 'SANDBOX_STAGING' : 'LIVE_PRODUCTION',
                  is_active: true,
                },
                { onConflict: 'organization_id,rail_type' }
              );
          }
        }
      } catch (dbErr: unknown) {
        const err = dbErr instanceof Error ? dbErr : new Error(String(dbErr));
        logger.warn({ err: err.message }, 'Non-blocking database sync note during onboarding');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      organizationId,
      workspaceName: companyName,
      nextUrl: '/overview',
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Onboarding setup failed');
    return NextResponse.json(
      { error: err.message || 'Failed to complete tenant onboarding' },
      { status: 500 }
    );
  }
}
