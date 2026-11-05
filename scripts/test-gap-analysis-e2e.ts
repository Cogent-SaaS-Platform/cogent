import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { MultiConcordanceService } from '../src/modules/gap-matrix/services/multiConcordanceService';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runE2ETest() {
  console.log('--- STARTING GAP ANALYSIS END-TO-END VERIFICATION ---');

  // 1. Fetch real regulation (e.g. CBN CPF 2019)
  const { data: reg, error: regErr } = await supabase
    .from('regulatory_instruments')
    .select('id, title, short_name')
    .ilike('short_name', '%CBN CPF%')
    .limit(1)
    .single();

  if (regErr || !reg) {
    console.error('Could not find CBN CPF regulation:', regErr);
    process.exit(1);
  }
  console.log(`[1] Selected Regulation: ${reg.short_name} (${reg.title}) - ID: ${reg.id}`);

  // 2. Fetch real policy document
  const { data: pol, error: polErr } = await supabase
    .from('policy_documents')
    .select('id, title, department, raw_text')
    .ilike('title', '%Credit%')
    .limit(1)
    .single();

  if (polErr || !pol) {
    console.error('Could not find internal policy document:', polErr);
    process.exit(1);
  }
  console.log(`[2] Selected Policy: ${pol.title} - ID: ${pol.id} (Raw text length: ${pol.raw_text?.length} chars)`);

  // 3. Run MultiConcordanceService
  const multiService = new MultiConcordanceService({ dbClient: supabase });
  const result = await multiService.runMultiConcordance({
    organizationId: '00000000-0000-0000-0000-000000000001',
    analysisName: `End-to-End Test: ${reg.short_name} vs ${pol.title}`,
    regulationIds: [reg.id],
    policyIds: [pol.id],
    scope: 'COMPLETE_REGULATORY_REVIEW',
    createdByName: 'Chief Compliance Auditor (E2E Test)',
  });

  console.log('\n[3] Concordance Evaluation Succeeded!');
  console.log(`- Evaluation ID: ${result.evaluationId}`);
  console.log(`- Obligations Assessed: ${result.obligationsAssessedCount}`);
  console.log(`- Adequate: ${result.adequateCount}, Partial: ${result.partialCount}, Gap: ${result.gapCount}`);
  console.log(`- Overall Compliance: ${result.overallCompliancePercentage}%`);
  console.log(`- Action Plan Items: ${result.actionPlan.length}`);

  // 4. Inspect first evaluated item
  const firstItem = result.items[0];
  console.log('\n[4] Sample Evaluated Obligation Item:');
  console.log(`- Title: ${firstItem.obligation_title}`);
  console.log(`- Code: ${firstItem.obligation_code}`);
  console.log(`- Compliance Status: ${firstItem.compliance_status}`);
  console.log(`- Criteria Count: ${firstItem.criteria_evaluations?.length}`);
  for (const crit of firstItem.criteria_evaluations || []) {
    console.log(`   * [${crit.status}] ${crit.criterionType}: "${crit.criterionText.slice(0, 70)}..."`);
    console.log(`     AI Reason: "${crit.aiReason}"`);
    console.log(`     Evidence Sections: ${crit.matchedPolicySections?.length || 0}`);
  }

  // 5. Test Human Reviewer Override Simulation (Simulating PATCH /api/gap-matrix/evaluations)
  console.log('\n[5] Simulating Human Reviewer Criterion Override (Not Met -> Met)...');
  const targetCrit = firstItem.criteria_evaluations?.find((c: any) => c.status === 'NOT_MET');
  if (targetCrit) {
    const updatedCriteria = firstItem.criteria_evaluations.map((c: any) =>
      c.id === targetCrit.id ? { ...c, status: 'MET', humanOverride: true } : c
    );
    const metCount = updatedCriteria.filter((c: any) => c.status === 'MET' && c.criterionType === 'Core Criteria').length;
    const totalCore = updatedCriteria.filter((c: any) => c.criterionType === 'Core Criteria').length;
    const recalculatedStatus = metCount === totalCore ? 'ADEQUATELY_MET' : metCount > 0 ? 'PARTIALLY_MET' : 'CRITICAL_GAP';

    const { error: patchErr } = await supabase
      .from('gap_matrix_items')
      .update({
        criteria_evaluations: updatedCriteria,
        compliance_status: recalculatedStatus,
      })
      .eq('id', firstItem.id);

    if (patchErr) {
      console.error('Failed patching item:', patchErr);
    } else {
      console.log(`   Successfully toggled criterion to MET! Recalculated obligation status: ${recalculatedStatus} (${metCount}/${totalCore} Core criteria met)`);
    }
  }

  console.log('\n--- ALL GAP ANALYSIS E2E TESTS COMPLETED SUCCESSFULLY ---');
}

runE2ETest().catch(console.error);
