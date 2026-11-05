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

async function inspect() {
  console.log('=== POLICIES ===');
  const { data: pols } = await supabase.from('policy_documents').select('id, title, department, version_tag, raw_text').limit(10);
  console.log(`Total policies: ${pols?.length}`);
  pols?.forEach(p => {
    console.log(`- ID: ${p.id} | Title: "${p.title}" | Dept: ${p.department} | Text length: ${p.raw_text?.length} | Preview: ${p.raw_text?.slice(0, 100).replace(/\n/g, ' ')}`);
  });

  console.log('\n=== REGULATORY INSTRUMENTS (REGULATION LIBRARY) ===');
  const { data: regs } = await supabase.from('regulatory_instruments').select('id, title, short_name').limit(10);
  console.log(`Total regulations: ${regs?.length}`);
  regs?.forEach(r => {
    console.log(`- ID: ${r.id} | Title: "${r.title}" | Short: "${r.short_name}"`);
  });

  console.log('\n=== REGULATORY OBLIGATIONS SAMPLE ===');
  const { data: obls } = await supabase.from('regulatory_obligations').select('id, instrument_id, obligation_title, obligation_code, full_text, assessment_criteria').limit(5);
  console.log(`Sample obligations: ${obls?.length}`);
  obls?.forEach(o => {
    console.log(`- Code: ${o.obligation_code} | Title: "${o.obligation_title}"`);
    console.log(`  Criteria:`, JSON.stringify(o.assessment_criteria)?.slice(0, 150));
  });
}

inspect().catch(console.error);
