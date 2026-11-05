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

async function checkObligationFields() {
  const { data } = await supabase
    .from('regulatory_obligations')
    .select('*')
    .limit(3);

  console.log('Sample rows:');
  data?.forEach((row, i) => {
    console.log(`\nRow ${i + 1}:`);
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && v !== undefined && v !== '' && JSON.stringify(v) !== '[]') {
        console.log(`  ${k}: ${typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '...' : JSON.stringify(v)}`);
      }
    }
  });
}

checkObligationFields().catch(console.error);
