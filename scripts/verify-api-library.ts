import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl!, serviceRoleKey!);

async function main() {
  console.log('=== VERIFYING STATUTORY LIBRARY & CLAUSE DATA ===');

  // 1. Fetch top 5 instruments
  const { data: instruments, error: instErr } = await db
    .from('regulatory_instruments')
    .select(`
      id,
      title,
      short_name,
      created_at,
      regulatory_bodies ( code, name ),
      regulatory_document_versions ( id, reference_code, version_number )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (instErr) {
    console.error('Error fetching instruments:', instErr);
    return;
  }

  console.log(`\nTop 5 Regulatory Instruments in Database:`);
  for (const inst of instruments || []) {
    const body = (inst as any).regulatory_bodies;
    const versions = (inst as any).regulatory_document_versions || [];
    console.log(`- [${body?.code || 'NO_BODY'}] ID: ${inst.id}`);
    console.log(`  Title: ${inst.title}`);
    console.log(`  Short: ${inst.short_name}`);
    console.log(`  Created: ${inst.created_at}`);
    console.log(`  Versions (${versions.length}): ${versions.map((v: any) => v.reference_code).join(', ')}`);
  }

  // 2. Test BOG Act 987 clauses & obligations
  const bogId = 'b0900000-0000-0000-0000-000000000987';
  const { data: bogVersions } = await db
    .from('regulatory_document_versions')
    .select('id, reference_code')
    .eq('instrument_id', bogId);

  console.log(`\nBOG Act 987 Versions:`, bogVersions);
  if (bogVersions && bogVersions.length > 0) {
    const versionId = bogVersions[0].id;
    const { data: clauses } = await db
      .from('regulatory_clauses')
      .select('id, section_reference, section_heading, clause_text')
      .eq('document_version_id', versionId);

    console.log(`BOG Act 987 Clauses (${clauses?.length || 0}):`);
    for (const c of clauses || []) {
      const { data: obls } = await db
        .from('regulatory_obligations')
        .select('id, summary, obligation_type')
        .eq('clause_id', c.id);
      console.log(`  - ${c.section_reference}: "${c.section_heading}" (${obls?.length || 0} obligations)`);
      for (const o of obls || []) {
        console.log(`      * [${o.obligation_type}] ${o.summary}`);
      }
    }
  }

  // 3. Test Discount Window Circular clauses & obligations
  const discountId = '4e5aabc2-8391-4217-a604-e68b61eac71f';
  const { data: dwVersions } = await db
    .from('regulatory_document_versions')
    .select('id, reference_code')
    .eq('instrument_id', discountId);

  console.log(`\nDiscount Window Circular Versions:`, dwVersions);
  if (dwVersions && dwVersions.length > 0) {
    const versionId = dwVersions[0].id;
    const { data: clauses } = await db
      .from('regulatory_clauses')
      .select('id, section_reference, section_heading, clause_text')
      .eq('document_version_id', versionId);

    console.log(`Discount Window Clauses (${clauses?.length || 0}):`);
    for (const c of clauses || []) {
      const { data: obls } = await db
        .from('regulatory_obligations')
        .select('id, summary, obligation_type')
        .eq('clause_id', c.id);
      console.log(`  - ${c.section_reference}: "${c.section_heading}" (${obls?.length || 0} obligations)`);
      for (const o of obls || []) {
        console.log(`      * [${o.obligation_type}] ${o.summary.slice(0, 80)}...`);
      }
    }
  }
}

main().catch(console.error);
