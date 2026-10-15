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
  const { data: pols, error: polErr } = await supabase.from('policy_documents').select('id, title, department, organization_id');
  const { data: scans, error: scanErr } = await supabase.from('marketing_scans').select('id, campaign_name, channel, verdict, organization_id');
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id, name, clerk_organization_id');
  
  if (polErr) console.error('PolErr:', polErr.message);
  if (scanErr) console.error('ScanErr:', scanErr.message);
  if (orgErr) console.error('OrgErr:', orgErr.message);

  console.log('Orgs count:', orgs?.length);
  if (orgs) {
    orgs.forEach(o => console.log(`- [${o.id}] "${o.name}" (clerk: ${o.clerk_organization_id})`));
  }

  console.log('\nPolicies count:', pols?.length);
  if (pols) {
    pols.forEach(p => console.log(`- [${p.organization_id}] "${p.title}" (${p.department})`));
  }

  console.log('\nMarketing scans count:', scans?.length);
  if (scans) {
    scans.forEach(s => console.log(`- [${s.organization_id}] "${s.campaign_name}" (${s.channel} -> ${s.verdict})`));
  }


}

check().catch(console.error);
