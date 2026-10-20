import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env: Record<string, string> = {};
  for (const l of lines) {
    const idx = l.indexOf('=');
    if (idx !== -1) {
      const k = l.substring(0, idx).trim();
      let v = l.substring(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

async function runTest() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('Testing Statutory Corpus & Clauses API Logic...\n');

  // Query all DB instruments
  const { data: instruments, error: iErr } = await sb
    .from('regulatory_instruments')
    .select(`
      id,
      title,
      short_name,
      instrument_type,
      regulatory_bodies (code, name),
      regulatory_document_versions (id, is_active, reference_code)
    `);

  if (iErr || !instruments) {
    console.error('Failed to query instruments:', iErr);
    process.exit(1);
  }

  console.log(`Found ${instruments.length} statutory frameworks in database:\n`);

  let allPassed = true;

  for (const inst of instruments) {
    const versions = inst.regulatory_document_versions || [];
    const vIds = versions.map((v: any) => v.id);

    // Query clauses
    const { data: clauses } = await sb
      .from('regulatory_clauses')
      .select('id, section_reference, section_heading, clause_text')
      .in('document_version_id', vIds);

    const clauseCount = clauses?.length || 0;
    const regCode = Array.isArray(inst.regulatory_bodies)
      ? inst.regulatory_bodies[0]?.code
      : (inst.regulatory_bodies as any)?.code || 'REG';
    console.log(`- [${regCode}] "${inst.short_name}" (${inst.id})`);
    console.log(`    Official Title: "${inst.title}"`);
    console.log(`    Clauses Indexed: ${clauseCount}`);

    if (clauseCount === 0) {
      console.error(`    ❌ FAILED: Instrument has 0 clauses!`);
      allPassed = false;
    } else {
      console.log(`    ✅ PASSED: Clauses -> ${clauses?.map((c) => c.section_reference).join(', ')}`);
    }

    // Verify obligations for these clauses
    if (clauses && clauses.length > 0) {
      const cIds = clauses.map((c) => c.id);
      const { data: obls } = await sb
        .from('regulatory_obligations')
        .select('id, obligation_type, summary, severity_floor')
        .in('clause_id', cIds);

      console.log(`    Obligations Indexed: ${obls?.length || 0}`);
      if (!obls || obls.length === 0) {
        console.error(`    ❌ FAILED: Clauses have 0 obligations!`);
        allPassed = false;
      }
    }
    console.log('');
  }

  if (allPassed) {
    console.log('🎉 100% OF ALL REGULATORY INSTRUMENTS HAVE VERIFIED LIVE CLAUSES & OBLIGATIONS IN DATABASE!');
  } else {
    console.error('❌ Some instruments failed clause verification.');
    process.exit(1);
  }
}

runTest().catch(console.error);
