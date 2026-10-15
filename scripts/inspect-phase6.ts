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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljtynxudbiayfkfbdbpw.supabase.co';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Phase 6 Database State Inspection ---');

  // 1. Regulatory Instruments & Bodies
  const { data: instruments, count: instCount, error: instErr } = await supabase
    .from('regulatory_instruments')
    .select('id, title, short_name, instrument_type, regulatory_bodies(code, name), regulatory_document_versions(id, version_number, publication_date, is_active)', { count: 'exact' });
  
  console.log(`Instruments: count=${instCount}, err=${instErr?.message || 'none'}`);
  if (instruments) {
    instruments.forEach((inst) => {
      console.log(`- [${(inst.regulatory_bodies as any)?.code}] ${inst.short_name}: "${inst.title}" (${(inst.regulatory_document_versions as any[])?.length || 0} versions)`);
    });
  }

  // 2. Regulatory Clauses
  const { count: clauseCount, error: clauseErr } = await supabase
    .from('regulatory_clauses')
    .select('id', { count: 'exact', head: true });
  console.log(`\nClauses: total count=${clauseCount}, err=${clauseErr?.message || 'none'}`);

  const { data: clausesSample } = await supabase
    .from('regulatory_clauses')
    .select('id, section_reference, section_heading, clause_text, document_version_id')
    .limit(3);
  console.log('Sample clause:', clausesSample?.[0]);

  // 3. Audit Logs
  const { count: auditCount, error: auditErr } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact', head: true });
  console.log(`\nAudit Logs: total count=${auditCount}, err=${auditErr?.message || 'none'}`);

  const { data: sampleAudits } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, sha256_input_hash, sha256_output_hash, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log('Sample audit logs:', sampleAudits);

  // 4. Radar Notifications & General Notifications
  const { count: notifCount, error: notifErr } = await supabase
    .from('radar_notifications')
    .select('id', { count: 'exact', head: true });
  console.log(`\nRadar Notifications: total count=${notifCount}, err=${notifErr?.message || 'none'}`);

  const { count: genNotifCount, error: genNotifErr } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true });
  console.log(`General Notifications: total count=${genNotifCount}, err=${genNotifErr?.message || 'none'}`);

  const { data: sampleGeneralNotifs } = await supabase
    .from('notifications')
    .select('id, title, message, link, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log('Sample general notifications:', sampleGeneralNotifs);



  const { data: sampleNotifs } = await supabase
    .from('radar_notifications')
    .select('id, title, message, type, priority, is_read, action_url, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log('Sample notifications:', sampleNotifs);
}

main().catch(console.error);
