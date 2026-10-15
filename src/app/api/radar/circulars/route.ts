import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { defaultCountdownCalculator } from '@/modules/radar/services/deadlineCountdownCalculator';
import { ApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { RegulatorCode, RadarPriority, LicenseType, PaymentRail, LineageStatus } from '@/shared/types';
import { CircularTargetingContext } from '@/modules/radar/types';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const organizationId = tenantCtx.organizationId;
    const { searchParams } = new URL(req.url);
    const regulator = searchParams.get('regulator');
    const priority = searchParams.get('priority');
    const applicableOnly = searchParams.get('applicableOnly') === 'true';
    const licenseFilter = searchParams.get('license');

    // 1. Fetch tenant operating profile (licenses & payment rails)
    const applicabilityEngine = new ApplicabilityEngine({ dbClient: db });
    const profile = await applicabilityEngine.fetchTenantProfile(organizationId);

    // 2. Fetch circular master records
    let query = db
      .from('radar_circulars')
      .select('*, regulatory_document_versions(source_file_url, publication_date, effective_date)')
      .order('created_at', { ascending: false });

    if (priority) {
      query = query.eq('priority', priority as RadarPriority);
    }

    const { data: circularsData, error: circularsError } = await query;

    if (circularsError) {
      logger.warn({ error: circularsError.message }, 'Failed to query radar_circulars; returning empty array');
      return NextResponse.json({ success: true, circulars: [] });
    }

    const rawCirculars = circularsData || [];

    // 3. Fetch existing tenant impacts for this organization
    const { data: impactsData } = await db
      .from('radar_tenant_impacts')
      .select('*, radar_action_items(*)')
      .eq('organization_id', organizationId);

    const impactsMap = new Map<string, any>();
    if (impactsData) {
      for (const impact of impactsData) {
        impactsMap.set(impact.circular_id, impact);
      }
    }

    // 4. Enrich each circular with dynamic statutory countdowns and tenant applicability
    const enrichedCirculars = rawCirculars.map((c) => {
      let regulatorCode: RegulatorCode = 'CBN';
      const refPrefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
      if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
        regulatorCode = refPrefix as RegulatorCode;
      }

      const countdown = defaultCountdownCalculator.calculateCountdown({
        statutoryDeadline: c.statutory_deadline,
        publicationDate: c.issuance_date || c.created_at,
        regulator: regulatorCode,
      });

      const circularTargeting: CircularTargetingContext = {
        regulator: regulatorCode,
        targetedLicenses: (c.targeted_license_types || []) as LicenseType[],
        affectedRails: (c.affected_payment_rails || []) as PaymentRail[],
        appliesUniversally: c.applies_universally || false,
      };

      const existingImpact = impactsMap.get(c.id);

      let isApplicable = false;
      let applicabilityReason = 'Not applicable to current operating licenses or payment rails.';
      let matchedLicenses: LicenseType[] = [];
      let matchedRails: PaymentRail[] = [];

      if (existingImpact) {
        isApplicable = existingImpact.is_applicable;
        applicabilityReason = existingImpact.applicability_reason;
        // Compute matched lists for presentation
        if (profile) {
          matchedLicenses = profile.activeLicenses.filter((lic) =>
            circularTargeting.targetedLicenses.includes(lic)
          );
          matchedRails = profile.activeRails.filter((rail) =>
            circularTargeting.affectedRails.includes(rail)
          );
        }
      } else if (profile) {
        const evalResult = ApplicabilityEngine.evaluatePure(profile, circularTargeting);
        isApplicable = evalResult.isApplicable;
        applicabilityReason = evalResult.reason;
        matchedLicenses = evalResult.matchedLicenses;
        matchedRails = evalResult.matchedRails;
      } else {
        isApplicable = c.applies_universally || false;
        applicabilityReason = c.applies_universally
          ? 'Universal statutory mandate applying to all regulated financial entities in Nigeria.'
          : 'Pending institutional license onboarding configuration.';
      }

      // Resolve action items from stored impact or default synthesized task
      const actionItems = existingImpact?.radar_action_items?.length
        ? existingImpact.radar_action_items.map((act: any) => ({
            id: act.id,
            targetDepartment: act.target_department,
            actionTitle: act.action_title,
            actionDescription: act.action_description,
            suggestedDeadline: act.suggested_deadline,
            isCompleted: act.is_completed,
          }))
        : [
            {
              id: `act_${c.id.slice(0, 8)}`,
              targetDepartment: 'COMPLIANCE_LEGAL',
              actionTitle: `Statutory Compliance Review: ${c.circular_number}`,
              actionDescription: isApplicable
                ? `Execute operational impact assessment against ${matchedLicenses.join(', ') || 'tenant license'} requirements.`
                : 'Informational regulatory monitoring item.',
              suggestedDeadline: c.statutory_deadline,
              isCompleted: false,
            },
          ];

      return {
        id: c.id,
        circularNumber: c.circular_number,
        regulator: regulatorCode,
        subject: c.subject,
        summary: c.summary,
        publicationDate: c.issuance_date || c.created_at?.slice(0, 10),
        effectiveDate: c.effective_date || c.issuance_date || c.created_at?.slice(0, 10),
        statutoryDeadline: c.statutory_deadline,
        daysRemaining: countdown.daysRemaining,
        businessDaysRemaining: countdown.businessDaysRemaining,
        countdownTier: countdown.tier,
        urgencyWindow: countdown.urgencyWindow,
        priority: c.priority,
        enforcementRiskLevel: c.enforcement_risk_level,
        lineageStatus: (c.lineage_status || 'ACTIVE_LAW') as LineageStatus,
        targetedLicenses: c.targeted_license_types || [],
        affectedRails: c.affected_payment_rails || [],
        appliesUniversally: c.applies_universally || false,
        penaltyEscalationProjection: countdown.penaltyEscalation,
        applicability: {
          isApplicable,
          reason: applicabilityReason,
          matchedLicenses,
          matchedRails,
        },
        executiveBriefCco:
          existingImpact?.brief_cco?.summary ||
          existingImpact?.executive_brief_cco ||
          `Statutory mandate from ${regulatorCode}. Compliance required by ${c.statutory_deadline || 'statutory directive'}.`,
        actionBriefCoo:
          existingImpact?.brief_cfo?.summary ||
          existingImpact?.action_brief_coo ||
          `Review active payment rail routing and operational parameters.`,
        technicalBriefProductEng:
          existingImpact?.brief_cto?.summary ||
          existingImpact?.technical_brief_product_eng ||
          'Implement required system logic, API constraints, and validation logging.',
        technicalBriefCto:
          existingImpact?.brief_cto?.summary ||
          'Audit microservice architecture, API integration contracts, and key security stores.',
        financialBriefCfo:
          existingImpact?.brief_cfo?.summary ||
          existingImpact?.financial_brief_cfo ||
          'Evaluate balance sheet exposure, capital buffers, and penalty contingencies.',
        governanceBriefCeoCro:
          existingImpact?.brief_ceo_cro?.summary ||
          'Board oversight of regulatory governance and statutory risk posture.',
        actionItems,
      };
    });

    // 5. Apply filters
    let filteredCirculars = enrichedCirculars;

    if (regulator) {
      filteredCirculars = filteredCirculars.filter((c) => c.regulator === regulator.toUpperCase());
    }

    if (applicableOnly) {
      filteredCirculars = filteredCirculars.filter((c) => c.applicability.isApplicable);
    }

    if (licenseFilter && licenseFilter !== 'ALL') {
      filteredCirculars = filteredCirculars.filter(
        (c) => c.targetedLicenses.includes(licenseFilter as LicenseType) || c.appliesUniversally
      );
    }

    return NextResponse.json({
      success: true,
      circulars: filteredCirculars,
      tenantProfile: {
        organizationId,
        organizationName: profile?.organizationName || 'Authorized Tenant',
        activeLicenses: profile?.activeLicenses || [],
        activeRails: profile?.activeRails || [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ error: message }, 'Error fetching radar circulars');
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
