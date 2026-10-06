import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { defaultApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { defaultRoleSynthesisService } from '@/modules/radar/services/roleSynthesisService';
import { createAdminClient, createClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';
import { CircularTargetingContext } from '@/modules/radar/types';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const body = await req.json();
    const {
      circularId,
      organizationId = tenantCtx.organizationId,
      synthesizeBriefs = true,
    } = body;

    if (!circularId) {
      return NextResponse.json(
        { success: false, error: 'circularId is required' },
        { status: 400 }
      );
    }

    let db: any;
    try {
      db = createAdminClient();
    } catch {
      db = createClient();
    }

    // 1. Fetch circular record from database
    const { data: circular, error: circularError } = await db
      .from('radar_circulars')
      .select('*')
      .eq('id', circularId)
      .single();

    if (circularError || !circular) {
      return NextResponse.json(
        { success: false, error: `Circular not found for ID: ${circularId}` },
        { status: 404 }
      );
    }

    // 2. Fetch tenant profile (licenses & rails)
    const profile = await defaultApplicabilityEngine.fetchTenantProfile(organizationId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: `Tenant profile not found for organization: ${organizationId}` },
        { status: 404 }
      );
    }

    // 3. Extract regulator and evaluate applicability deterministically
    let regulatorCode: RegulatorCode = 'CBN';
    const refPrefix = (circular.circular_number || '').split('/')[0]?.toUpperCase();
    if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
      regulatorCode = refPrefix as RegulatorCode;
    }

    const circularTargeting: CircularTargetingContext = {
      regulator: regulatorCode,
      targetedLicenses: circular.targeted_license_types || [],
      affectedRails: circular.affected_payment_rails || [],
      appliesUniversally: circular.applies_universally || false,
    };

    const applicabilityResult = defaultApplicabilityEngine.evaluateApplicability(
      profile,
      circularTargeting
    );

    let synthesisResult = null;

    // 4. If applicable and synthesis requested, invoke 4-way ExCo synthesis
    if (applicabilityResult.isApplicable && synthesizeBriefs) {
      synthesisResult = await defaultRoleSynthesisService.synthesizeRoleImpacts({
        circular: {
          id: circular.id,
          circularNumber: circular.circular_number,
          regulatorCode,
          subject: circular.subject,
          summary: circular.summary,
          statutoryDeadline: circular.statutory_deadline,
          rawText: circular.raw_text || undefined,
        },
        tenant: {
          organizationId,
          organizationName: profile.organizationName,
          matchedLicenses: applicabilityResult.matchedLicenses,
          matchedRails: applicabilityResult.matchedRails,
          applicabilityReason: applicabilityResult.reason,
        },
        userId: tenantCtx.userId,
      });
    } else {
      // Record non-applicable or unsynthesized status in radar_tenant_impacts
      await db.from('radar_tenant_impacts').upsert(
        {
          organization_id: organizationId,
          circular_id: circularId,
          is_applicable: applicabilityResult.isApplicable,
          applicability_reason: applicabilityResult.reason,
          status: applicabilityResult.isApplicable ? 'PENDING_SYNTHESIS' : 'FILTERED_OUT',
        },
        { onConflict: 'organization_id,circular_id' }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        circularId,
        organizationId,
        isApplicable: applicabilityResult.isApplicable,
        applicability: applicabilityResult,
        synthesis: synthesisResult,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to evaluate circular applicability');
    return NextResponse.json(
      { success: false, error: error.message || 'Evaluation failed' },
      { status: 500 }
    );
  }
}
