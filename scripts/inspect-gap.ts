import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal(): Record<string, string> {
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

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log('=== GAP EVALUATIONS IN SUPABASE ===');
  const { data: evals, error: evalErr } = await supabase
    .from('gap_evaluations')
    .select('id, analysis_name, scope, status, metadata, created_at, organization_id');

  if (evalErr) {
    console.error('Eval error:', evalErr);
  } else {
    console.log(`Evaluations count: ${evals?.length}`);
    for (const e of evals || []) {
      console.log(`- ID: ${e.id} | Org: ${e.organization_id} | Name: "${e.analysis_name || e.metadata?.analysisName}" | Scope: ${e.scope} | Status: ${e.status}`);
    }
  }

  console.log('\n=== GAP MATRIX ITEMS IN SUPABASE ===');
  const { data: items, error: itemErr } = await supabase
    .from('gap_matrix_items')
    .select('id, evaluation_id, obligation_title, what_happened, criteria_evaluations')
    .limit(10);

  if (itemErr) {
    console.error('Item error:', itemErr);
  } else {
    console.log(`Items count: ${items?.length}`);
    for (const it of items || []) {
      console.log(`- ID: ${it.id} | EvalID: ${it.evaluation_id} | Obligation: "${it.obligation_title}"`);
      console.log(`  What happened: "${it.what_happened?.slice(0, 100)}"`);
      if (it.criteria_evaluations && Array.isArray(it.criteria_evaluations)) {
        console.log(`  Criteria count: ${it.criteria_evaluations.length}`);
        it.criteria_evaluations.forEach((c: any, idx: number) => {
          console.log(`    Crit ${idx + 1}: [${c.status}] ${c.criterionText?.slice(0, 70)}...`);
        });
      }
    }
  }
}

check().catch(console.error);
