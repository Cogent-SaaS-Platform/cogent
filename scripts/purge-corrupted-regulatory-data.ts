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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey);

async function purgeCorruptedData() {
  console.log('--- PURGING CORRUPTED & NON-STATUTORY SCRAPES FROM DATABASE ---');

  const junkSubjects = [
    'circular',
    'federal competition & consumer protection commission',
    'consumer rights & responsibilities',
    'civil society/consumer protection alliances',
    'data controllers/processors registration',
    'registered data controllers/data processors of major importance',
    'advancing global data governance: ndpc hosts sri lankan delegation on 2-day study tour',
    'full electronic registration (e-registration) now available on the eportal',
    'invitation for expression of interest (eoi) from qualified event management/organisation firms for the planning and hosting of the 2027 iosco/amerc meeting',
  ];

  // 1. Find radar_circulars matching junk titles
  const { data: circulars } = await db.from('radar_circulars').select('id, subject');
  const junkCircularIds: string[] = [];
  if (circulars) {
    for (const c of circulars) {
      const cleanSub = (c.subject || '').trim().toLowerCase();
      if (
        junkSubjects.includes(cleanSub) ||
        cleanSub.startsWith('securities and exchange commission (sec) nigeria') ||
        cleanSub.includes('sri lankan') ||
        cleanSub.includes('study tour')
      ) {
        junkCircularIds.push(c.id);
      }
    }
  }

  console.log(`Found ${junkCircularIds.length} junk radar circulars to remove.`);

  if (junkCircularIds.length > 0) {
    await db.from('radar_tenant_impacts').delete().in('circular_id', junkCircularIds);
    await db.from('circular_supersession_links').delete().in('parent_circular_id', junkCircularIds);
    await db.from('circular_supersession_links').delete().in('child_circular_id', junkCircularIds);
    await db.from('radar_circulars').delete().in('id', junkCircularIds);
    console.log('Deleted junk radar circulars and impacts.');
  }

  // 2. Find regulatory_instruments matching junk titles
  const { data: instruments } = await db.from('regulatory_instruments').select('id, title, short_name');
  const junkInstrumentIds: string[] = [];
  if (instruments) {
    for (const inst of instruments) {
      const cleanTitle = (inst.title || '').trim().toLowerCase();
      if (
        junkSubjects.includes(cleanTitle) ||
        cleanTitle.startsWith('securities and exchange commission (sec) nigeria') ||
        cleanTitle.includes('sri lankan') ||
        cleanTitle.includes('study tour')
      ) {
        junkInstrumentIds.push(inst.id);
      }
    }
  }

  console.log(`Found ${junkInstrumentIds.length} junk regulatory instruments to remove:`, junkInstrumentIds);

  if (junkInstrumentIds.length > 0) {
    // Delete attached versions, clauses, and obligations (cascades or delete explicitly)
    const { data: versions } = await db
      .from('regulatory_document_versions')
      .select('id')
      .in('instrument_id', junkInstrumentIds);

    const verIds = (versions || []).map((v) => v.id);
    if (verIds.length > 0) {
      const { data: clauses } = await db
        .from('regulatory_clauses')
        .select('id')
        .in('document_version_id', verIds);

      const clauseIds = (clauses || []).map((c) => c.id);
      if (clauseIds.length > 0) {
        await db.from('regulatory_obligations').delete().in('clause_id', clauseIds);
        await db.from('regulatory_clauses').delete().in('id', clauseIds);
      }
      await db.from('regulatory_document_versions').delete().in('id', verIds);
    }
    await db.from('regulatory_instruments').delete().in('id', junkInstrumentIds);
    console.log('Successfully purged all corrupted regulatory instruments.');
  }

  // Verify remaining instruments
  const { count } = await db.from('regulatory_instruments').select('*', { count: 'exact', head: true });
  console.log(`Remaining clean regulatory instruments in database: ${count}`);
}

purgeCorruptedData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Purge error:', err);
    process.exit(1);
  });
