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

async function purgeCorrupted() {
  console.log('Purging corrupted policy documents where raw_text starts with %PDF or contains corrupted metadata...');
  
  // 1. Delete any gap evaluations or items referencing corrupted policies
  const { data: corruptedPols } = await supabase
    .from('policy_documents')
    .select('id, title')
    .or('raw_text.like.%PDF%,raw_text.ilike.%corrupted%');

  if (corruptedPols && corruptedPols.length > 0) {
    const pIds = corruptedPols.map(p => p.id);
    console.log(`Found ${pIds.length} corrupted policy documents:`, corruptedPols.map(p => p.title));

    // Delete gap evaluations using these policies
    const { data: evals } = await supabase.from('gap_evaluations').select('id').in('policy_id', pIds);
    if (evals && evals.length > 0) {
      const eIds = evals.map(e => e.id);
      await supabase.from('gap_matrix_items').delete().in('evaluation_id', eIds);
      await supabase.from('gap_evaluations').delete().in('id', eIds);
      console.log(`Deleted ${eIds.length} gap evaluations linked to corrupted policies.`);
    }

    // Delete policy clauses
    await supabase.from('policy_clauses').delete().in('policy_id', pIds);

    // Delete corrupted policy documents
    await supabase.from('policy_documents').delete().in('id', pIds);
    console.log('Deleted corrupted policy documents successfully!');
  } else {
    console.log('No corrupted policy documents found.');
  }

  // Also purge any gap matrix items mentioning "corrupted file metadata"
  const { data: badItems } = await supabase
    .from('gap_matrix_items')
    .select('id, evaluation_id')
    .or('what_happened.ilike.%corrupted file metadata%,obligation_title.ilike.%The CBN enforces strict transp%');

  if (badItems && badItems.length > 0) {
    const iIds = badItems.map(i => i.id);
    const evalIds = Array.from(new Set(badItems.map(i => i.evaluation_id)));
    await supabase.from('gap_matrix_items').delete().in('id', iIds);
    await supabase.from('gap_evaluations').delete().in('id', evalIds);
    console.log(`Purged ${badItems.length} bad gap items and ${evalIds.length} evaluations.`);
  }
}

purgeCorrupted().catch(console.error);
