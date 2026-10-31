import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { ApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { RoleSynthesisService } from '@/modules/radar/services/roleSynthesisService';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';
import { CircularTargetingContext } from '@/modules/radar/types';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const body = await req.json();
    const {
      circularId,
      synthesizeBriefs = true,
    } = body;
    const organizationId = tenantCtx.organizationId;

    if (!circularId) {
      return NextResponse.json(
        { success: false, error: 'circularId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch circular record from database
    const { data: circular, error: circularError } = await db
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

    const applicabilityEngine = new ApplicabilityEngine({ dbClient: db });
    const roleSynthesisService = new RoleSynthesisService({ dbClient: db });

    // 2. Fetch tenant profile (licenses & rails)
    const profile = await applicabilityEngine.fetchTenantProfile(organizationId);
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

    const applicabilityResult = applicabilityEngine.evaluateApplicability(
      profile,
      circularTargeting
    );

    // 4. Fetch obligations if circular links to document version
    let obligations: any[] = [];
    const docVersionId = (circular as any)?.regulatory_document_versions?.id || circular.document_version_id;
    if (docVersionId) {
      const { data: dbClauses } = await db
        .from('regulatory_clauses')
        .select('id')
        .eq('document_version_id', docVersionId);

      if (dbClauses && dbClauses.length > 0) {
        const clauseIds = dbClauses.map((c) => c.id);
        const { data: dbObligations } = await db
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

    let synthesisResult = null;

    // 5. If applicable and synthesis requested, invoke 5-way ExCo synthesis
    if (applicabilityResult.isApplicable && synthesizeBriefs) {
      synthesisResult = await roleSynthesisService.synthesizeRoleImpacts({
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
          executive_brief_cco: 'Non-applicable to institutional license profile.',
          action_brief_coo: 'No operational action required.',
          technical_brief_product_eng: 'No technical modification required.',
          financial_brief_cfo: 'No capital or financial exposure.',
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
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to evaluate circular applicability');
    return NextResponse.json(
      { success: false, error: err.message || 'Evaluation failed' },
      { status: 500 }
    );
  }
}
