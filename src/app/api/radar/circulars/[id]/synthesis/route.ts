import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { RoleSynthesisService } from '@/modules/radar/services/roleSynthesisService';
import { ApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { logger } from '@/shared/logger';
import { RegulatorCode, LicenseType, PaymentRail } from '@/shared/types';
import { CircularTargetingContext } from '@/modules/radar/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: circularId } = await Promise.resolve(context.params);

    if (!circularId) {
      return NextResponse.json(
        { success: false, error: 'Circular ID is required' },
        { status: 400 }
      );
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient, organizationId } = tenantCtx;

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    // 1. Fetch circular record
    const { data: circular, error: circularError } = await dbClient
      .from('radar_circulars')
      .select('*, regulatory_document_versions(id, canonical_source_url, source_file_url)')
      .eq('id', circularId)
      .maybeSingle();

    if (circularError || !circular) {
      return NextResponse.json(
        { success: false, error: `Circular not found for ID: ${circularId}` },
        { status: 404 }
      );
    }

    // 2. Fetch tenant profile (licenses & rails)
    const applicabilityEngine = new ApplicabilityEngine({ dbClient });
    const profile = await applicabilityEngine.fetchTenantProfile(organizationId);

    let regulatorCode: RegulatorCode = 'CBN';
    const refPrefix = (circular.circular_number || '').split('/')[0]?.toUpperCase();
    if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
      regulatorCode = refPrefix as RegulatorCode;
    }

    const circularTargeting: CircularTargetingContext = {
      regulator: regulatorCode,
      targetedLicenses: (circular.targeted_license_types || []) as LicenseType[],
      affectedRails: (circular.affected_payment_rails || []) as PaymentRail[],
      appliesUniversally: circular.applies_universally || false,
    };

    const applicabilityResult = profile
      ? ApplicabilityEngine.evaluatePure(profile, circularTargeting)
      : {
          isApplicable: circular.applies_universally || false,
          reason: circular.applies_universally
            ? 'Universal statutory mandate applying to all regulated financial entities in Nigeria.'
            : 'Pending institutional license onboarding configuration.',
          matchedLicenses: [],
          matchedRails: [],
        };

    // 3. Fetch obligations if circular links to a document version
    let obligations: any[] = [];
    const docVersionId = (circular as any)?.regulatory_document_versions?.id || circular.document_version_id;
    if (docVersionId) {
      const { data: dbClauses } = await dbClient
        .from('regulatory_clauses')
        .select('id')
        .eq('document_version_id', docVersionId);

      if (dbClauses && dbClauses.length > 0) {
        const clauseIds = dbClauses.map((c) => c.id);
        const { data: dbObligations } = await dbClient
          .from('regulatory_obligations')
          .select('*')
          .in('clause_id', clauseIds);

        if (dbObligations && dbObligations.length > 0) {
          obligations = dbObligations.map((obl: any) => ({
            obligationId: obl.id,
            clauseId: obl.clause_id,
            obligationType: obl.obligation_type || 'MANDATORY',
            summary: obl.summary,
            verbatimQuote: obl.verbatim_quote || obl.summary,
            actor: obl.actor || 'Regulated Institution',
            action: obl.action || 'Implement statutory controls',
            targetObject: obl.target_object || 'Operational rail',
            condition: obl.condition || 'Upon statutory circular commencement',
            statutoryTimelineDays: obl.statutory_timeline_days || 30,
            deadlineText: obl.deadline_text || undefined,
            complianceCriteria: (obl.metadata as any)?.compliance_criteria || [],
            assessment: (obl.metadata as any)?.assessment || 'Deterministic regulatory mandate',
            penalties: [],
          }));
        }
      }
    }

    // 4. Trigger active role synthesis
    const roleSynthesisService = new RoleSynthesisService({ dbClient });
    const synthResult = await roleSynthesisService.synthesizeRoleImpacts({
      circular: {
        id: circular.id,
        circularNumber: circular.circular_number,
        regulatorCode,
        subject: circular.subject,
        summary: circular.summary,
        statutoryDeadline: circular.statutory_deadline,
        rawText: circular.raw_text || undefined,
        obligations: obligations.length > 0 ? obligations : undefined,
      },
      tenant: {
        organizationId,
        organizationName: profile?.organizationName || 'Licensed Financial Institution',
        matchedLicenses: applicabilityResult.matchedLicenses,
        matchedRails: applicabilityResult.matchedRails,
        applicabilityReason: applicabilityResult.reason,
      },
      userId: tenantCtx.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        circularId: circular.id,
        impactId: synthResult.impactId,
        analysisRunId: synthResult.analysisRunId,
        briefs: synthResult.output,
        actionItems: synthResult.output.actionChecklist,
        telemetry: synthResult.telemetry,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed triggering radar circular role synthesis');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error during circular synthesis' },
      { status: 500 }
    );
  }
}
