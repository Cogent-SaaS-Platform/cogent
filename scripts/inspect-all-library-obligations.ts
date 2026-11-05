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

async function inspectAllInstruments() {
  const { data: instruments } = await supabase
    .from('regulatory_instruments')
    .select(`
      id,
      title,
      short_name,
      regulatory_document_versions (
        id,
        is_active,
        regulatory_clauses (
          id,
          section_reference,
          section_heading,
          regulatory_obligations (
            id,
            code,
            title,
            rule_type,
            assessment_criteria
          )
        )
      )
    `);

  console.log(`Found ${instruments?.length} instruments in Regulation Library:`);
  for (const inst of instruments || []) {
    const versions = inst.regulatory_document_versions || [];
    const activeVer = versions.find((v: any) => v.is_active) || versions[0];
    const clauses = activeVer?.regulatory_clauses || [];
    let oblCount = 0;
    clauses.forEach((c: any) => {
      oblCount += (c.regulatory_obligations || []).length;
    });
    console.log(`- [${inst.id}] "${inst.short_name || inst.title}" | Clauses: ${clauses.length} | Obligations: ${oblCount}`);
    if (clauses.length > 0 && oblCount > 0) {
      const firstObl = clauses[0].regulatory_obligations?.[0];
      if (firstObl) {
        console.log(`    Sample Obl: Code=${firstObl.code} | Title="${firstObl.title}" | Criteria=${JSON.stringify(firstObl.assessment_criteria)?.slice(0, 80)}`);
      }
    }
  }
}

inspectAllInstruments().catch(console.error);
