import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

import { RoleSynthesisService } from '../src/modules/radar/services/roleSynthesisService';
import { ApplicabilityEngine } from '../src/modules/radar/services/applicabilityEngine';
import { RegulatorCode } from '../src/shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('[1/4] Starting elevation process...');

  const roleSynth = new RoleSynthesisService({ dbClient: supabase });

  const { data: circulars, error: cErr } = await supabase
    .from('radar_circulars')
    .select('*')
    .order('created_at', { ascending: false });

  if (cErr || !circulars) {
    console.error('Failed to query circulars:', cErr);
    process.exit(1);
  }

  const { data: orgs, error: oErr } = await supabase
    .from('organizations')
    .select('id, name');

  if (oErr || !orgs) {
    console.error('Failed to query organizations:', oErr);
    process.exit(1);
  }

  console.log(`[2/4] Retrieved ${circulars.length} circulars and ${orgs.length} organizations.`);

  for (const org of orgs) {
    console.log(`[3/4] Processing tenant: ${org.name} (${org.id})...`);

    const { data: licenses } = await supabase
      .from('tenant_licenses')
      .select('license_type')
      .eq('organization_id', org.id)
      .eq('is_active', true);

    const { data: rails } = await supabase
      .from('tenant_payment_rails')
      .select('rail_type')
      .eq('organization_id', org.id)
      .eq('is_active', true);

    const activeLicenses = (licenses || []).map((l: any) => l.license_type);
    const activeRails = (rails || []).map((r: any) => r.rail_type);

    let orgCount = 0;

    for (const c of circulars) {
      let regulatorCode: RegulatorCode = 'CBN';
      const refPrefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
      if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
        regulatorCode = refPrefix as RegulatorCode;
      }

      const targetingCtx = {
        regulator: regulatorCode,
        targetedLicenses: c.targeted_license_types || [],
        affectedRails: c.affected_payment_rails || [],
        appliesUniversally: c.applies_universally || false,
      };

      const evalResult = ApplicabilityEngine.evaluatePure(
        { organizationId: org.id, activeLicenses, activeRails },
        targetingCtx
      );

      const synthesis = roleSynth.generateDeterministicFallback({
        circular: {
          id: c.id,
          circularNumber: c.circular_number,
          regulatorCode,
          subject: c.subject,
          summary: c.summary,
          statutoryDeadline: c.statutory_deadline,
          rawText: c.raw_text,
        },
        tenant: {
          organizationId: org.id,
          organizationName: org.name,
          matchedLicenses: evalResult.matchedLicenses,
          matchedRails: evalResult.matchedRails,
          applicabilityReason: evalResult.reason,
        },
      });

      // Find existing impact
      const { data: existingImpact } = await supabase
        .from('radar_tenant_impacts')
        .select('id')
        .eq('organization_id', org.id)
        .eq('circular_id', c.id)
        .maybeSingle();

      const impactId = existingImpact?.id || crypto.randomUUID();

      const { error: upsertErr } = await supabase.from('radar_tenant_impacts').upsert({
        id: impactId,
        organization_id: org.id,
        circular_id: c.id,
        is_applicable: evalResult.isApplicable,
        applicability_reason: evalResult.reason,
        executive_brief_cco: synthesis.executiveBriefCco,
        action_brief_coo: synthesis.actionBriefCoo,
        technical_brief_product_eng: synthesis.technicalBriefProductEng,
        financial_brief_cfo: synthesis.financialBriefCfo,
        role_briefs: synthesis,
        brief_cco: { brief: synthesis.executiveBriefCco },
        brief_cfo: { brief: synthesis.financialBriefCfo },
        brief_cto: { brief: synthesis.technicalBriefCto || synthesis.technicalBriefProductEng },
        brief_ceo_cro: { brief: synthesis.governanceBriefCeoCro || synthesis.actionBriefCoo },
        status: 'SYNTHESIZED',
      });

      if (upsertErr) {
        console.warn(`Upsert warning for circular ${c.circular_number}:`, upsertErr.message);
      }

      if (evalResult.isApplicable && synthesis.actionChecklist?.length > 0) {
        await supabase.from('radar_action_items').delete().eq('impact_id', impactId);

        const actionRows = synthesis.actionChecklist.map((act) => ({
          id: crypto.randomUUID(),
          organization_id: org.id,
          impact_id: impactId,
          target_department: act.targetDepartment,
          action_title: act.actionTitle,
          action_description: act.actionDescription,
          suggested_deadline: act.suggestedDeadline,
          is_completed: false,
        }));

        await supabase.from('radar_action_items').insert(actionRows);
      }

      orgCount++;
    }

    console.log(`  -> Finished tenant ${org.name}: updated ${orgCount} impacts.`);
  }

  console.log('[4/4] Successfully completed tenant impact elevation across all organizations.');
}

main().catch((err) => {
  console.error('Fatal error during elevation:', err);
  process.exit(1);
});
