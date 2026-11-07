import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { MarketingComplianceService } from '@/modules/marketing-shield/services/marketingComplianceService';
import { verifyEntitlement } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const complianceService = new MarketingComplianceService();

/**
 * GET /api/marketing/rules
 * Returns active statutory rules (baseline + connected /library obligations + tenant custom rules)
 * in the Marketing Knowledge Base.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const regulator = searchParams.get('regulator');
    const scopedRegulators = regulator && regulator !== 'ALL' ? [regulator] : undefined;

    const rules = await complianceService.getApplicableRules(
      db,
      organizationId,
      undefined,
      undefined,
      scopedRegulators
    );

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ err }, 'Unexpected error in GET /api/marketing/rules');
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/marketing/rules
 * Allows Compliance Officers to add a custom marketing rule or link from Regulation Library.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    let db = dbClient;
    try {
      db = createAdminClient();
    } catch {
      db = dbClient;
    }

    if (!db) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    // Enforce Pro entitlement for adding custom marketing rules (+ Add Rule)
    const entitlement = await verifyEntitlement(db, organizationId, 'MARKETING_CUSTOM_RULE');
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const body = await req.json();
    const title = body.title?.trim();
    const ruleCode = body.ruleCode?.trim() || `RULE-${Date.now().toString(36).toUpperCase()}`;
    const regulatorCode = body.regulatorCode?.trim() || 'INTERNAL_POLICY';
    const statutoryCitation = body.statutoryCitation?.trim() || 'Internal Compliance Manual';
    const verbatimClause = body.verbatimClause?.trim() || '';
    const prohibitedTerms = Array.isArray(body.prohibitedTerms) ? body.prohibitedTerms : [];
    const mandatoryDisclosures = Array.isArray(body.mandatoryDisclosures) ? body.mandatoryDisclosures : [];
    const appliesToCategories = Array.isArray(body.appliesToCategories) ? body.appliesToCategories : [];
    const appliesToChannels = Array.isArray(body.appliesToChannels) ? body.appliesToChannels : [];

    if (!title || !verbatimClause) {
      return NextResponse.json({ success: false, error: 'Title and verbatim clause are required' }, { status: 400 });
    }

    const { data, error } = await db
      .from('marketing_knowledge_rules')
      .insert({
        organization_id: organizationId,
        rule_code: ruleCode,
        title,
        regulator_code: regulatorCode,
        regulation_id: body.regulationId || null,
        statutory_citation: statutoryCitation,
        verbatim_clause: verbatimClause,
        prohibited_terms: prohibitedTerms,
        mandatory_disclosures: mandatoryDisclosures,
        applies_to_categories: appliesToCategories,
        applies_to_channels: appliesToChannels,
        is_custom: true,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error({ error }, 'Error inserting custom rule');
      return NextResponse.json({ success: false, error: error?.message || 'Failed to add rule' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rule: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error({ err }, 'Unexpected error in POST /api/marketing/rules');
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
