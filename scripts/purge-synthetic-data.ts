/**
 * Purge Synthetic & Fabricated Radar Data Script
 * 
 * Safely eliminates fabricated / fallback regulatory circulars, clauses, obligations,
 * penalties, tenant impacts, action items, and mock gap evaluations from the Supabase database.
 * 
 * Adheres to Cogent RegTech Master Moat Architecture: Zero Hallucinated / Fallback Regulatory Data.
 */

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

// Markers of known synthetic mock circulars from legacy fallback collector
const SYNTHETIC_CIRCULAR_NUMBERS = [
  'PSM/DIR/CON/CWS/08/014',
  'SEC/CIR/VASP/2026/009',
  'NDPC/GDPR/CIR/2024/001',
  'ARCON/VET/DIR/2023/004',
  'FCCPC/DLR/2022/001',
  'TEMPLARS/ADV/2026/001',
  'TC/POLICY/2026/012',
  'BOG/PSD/2025/11',
];

const SYNTHETIC_SUBJECT_SNIPPETS = [
  'Mandatory Compliance Directive: Customer Due Diligence, Biometric BVN/NIN Verification',
  'Advisory on SEC Accelerated Regulatory Incubation Program (ARIP)',
  'Cross-Border Data Transfer and AI Data Governance Guidance',
  'Mandatory Pre-Vetting of Digital and Social Media Advertisements',
  'Enforcement Framework for Digital Money Lenders & Micro-Credit Fintechs',
  'Fintech Regulatory Horizons 2026: Capital Requirements, Open Banking',
  'Policy Brief: CBN Open Banking Operational Rules',
  'Directive on Pan-African Cross-Border Remittances',
];

async function runPurge() {
  console.log('--- STARTING SYNTHETIC DATA PURGE ---');
  console.log(`Connecting to: ${supabaseUrl}`);

  // 1. Identify target circular IDs
  const { data: allCirculars, error: cErr } = await db
    .from('radar_circulars')
    .select('id, circular_number, subject, document_version_id');

  if (cErr) {
    console.error('Failed to query radar_circulars:', cErr.message);
    return;
  }

  const targetCircularIds: string[] = [];
  const targetCircularRefs: string[] = [];
  const targetVersionIds: string[] = [];

  for (const c of allCirculars || []) {
    const num = c.circular_number || '';
    const subj = c.subject || '';

    const isSynthetic =
      SYNTHETIC_CIRCULAR_NUMBERS.includes(num) ||
      SYNTHETIC_SUBJECT_SNIPPETS.some((s) => subj.toLowerCase().includes(s.toLowerCase())) ||
      subj.includes('1.0 STATUTORY MANDATE') ||
      subj.includes('NAIRAMETRICS FINANCIAL REGULATORY WIRE') ||
      subj.includes('ALUKO & OYEBODE REGULATORY') ||
      subj.includes('MANDATORY DIRECTIVE ON ADVANCED BIOMETRIC') ||
      subj.includes('CBN Mandatory Directive on Biometric') ||
      subj.includes('SECURITIES AND EXCHANGE COMMISSION (SEC)') ||
      subj === 'AND THE GENERAL PUBLIC' ||
      subj.startsWith('TED FEM FPC PUB') ||
      num.startsWith('CBN/DIR/BIO/') ||
      num.startsWith('CBN/DIR/AML/') ||
      num.startsWith('CBN/TEST/') ||
      num.startsWith('SEC/CIR/') ||
      num.startsWith('NM/FIN/') ||
      num.startsWith('AO/ADV/');

    if (isSynthetic) {
      targetCircularIds.push(c.id);
      targetCircularRefs.push(num);
      if (c.document_version_id) {
        targetVersionIds.push(c.document_version_id);
      }
    }
  }

  console.log(`Found ${targetCircularIds.length} synthetic circular records to purge:`, targetCircularRefs);

  if (targetCircularIds.length === 0) {
    console.log('No synthetic circulars found in database.');
    return;
  }

  console.log(`Found ${targetVersionIds.length} associated regulatory_document_versions.`);

  // 3. Identify associated clauses
  let targetClauseIds: string[] = [];
  if (targetVersionIds.length > 0) {
    const { data: clauses } = await db
      .from('regulatory_clauses')
      .select('id')
      .in('document_version_id', targetVersionIds);
    targetClauseIds = (clauses || []).map((cl) => cl.id);
    console.log(`Found ${targetClauseIds.length} associated regulatory_clauses.`);
  }

  // 4. Identify associated obligations
  let targetObligationIds: string[] = [];
  if (targetClauseIds.length > 0) {
    const { data: obligations } = await db
      .from('regulatory_obligations')
      .select('id')
      .in('clause_id', targetClauseIds);
    targetObligationIds = (obligations || []).map((o) => o.id);
    console.log(`Found ${targetObligationIds.length} associated regulatory_obligations.`);
  }

  // 5. Delete statutory penalties attached to these obligations
  if (targetObligationIds.length > 0) {
    const { error: penErr } = await db
      .from('statutory_penalties')
      .delete()
      .in('obligation_id', targetObligationIds);
    if (penErr) console.warn('Error deleting statutory_penalties:', penErr.message);
    else console.log(`Deleted statutory penalties for ${targetObligationIds.length} obligations.`);
  }

  // 6. Delete obligations
  if (targetObligationIds.length > 0) {
    const { error: oblErr } = await db
      .from('regulatory_obligations')
      .delete()
      .in('id', targetObligationIds);
    if (oblErr) console.warn('Error deleting regulatory_obligations:', oblErr.message);
    else console.log(`Deleted ${targetObligationIds.length} regulatory obligations.`);
  }

  // 7. Delete clauses
  if (targetClauseIds.length > 0) {
    const { error: clErr } = await db
      .from('regulatory_clauses')
      .delete()
      .in('id', targetClauseIds);
    if (clErr) console.warn('Error deleting regulatory_clauses:', clErr.message);
    else console.log(`Deleted ${targetClauseIds.length} regulatory clauses.`);
  }

  // 8. Delete gap matrix items & evaluations linked to these versions
  if (targetVersionIds.length > 0) {
    const { data: gapEvals } = await db
      .from('gap_evaluations')
      .select('id')
      .in('benchmark_document_version_id', targetVersionIds);
    const evalIds = (gapEvals || []).map((e) => e.id);

    if (evalIds.length > 0) {
      await db.from('gap_matrix_items').delete().in('evaluation_id', evalIds);
      await db.from('gap_evaluations').delete().in('id', evalIds);
      console.log(`Deleted ${evalIds.length} gap evaluations linked to synthetic versions.`);
    }
  }

  // 9. Delete document versions
  if (targetVersionIds.length > 0) {
    const { error: verErr } = await db
      .from('regulatory_document_versions')
      .delete()
      .in('id', targetVersionIds);
    if (verErr) console.warn('Error deleting regulatory_document_versions:', verErr.message);
    else console.log(`Deleted ${targetVersionIds.length} regulatory document versions.`);
  }

  // 10. Delete tenant impacts and action items attached to these circulars
  const { data: impacts } = await db
    .from('radar_tenant_impacts')
    .select('id')
    .in('circular_id', targetCircularIds);
  const impactIds = (impacts || []).map((i) => i.id);

  if (impactIds.length > 0) {
    await db.from('radar_action_items').delete().in('impact_id', impactIds);
    await db.from('radar_tenant_impacts').delete().in('id', impactIds);
    console.log(`Deleted ${impactIds.length} tenant impacts & action items.`);
  }

  // 11. Delete the radar_circulars themselves
  const { error: circErr } = await db
    .from('radar_circulars')
    .delete()
    .in('id', targetCircularIds);

  if (circErr) {
    console.error('Error deleting radar_circulars:', circErr.message);
  } else {
    console.log(`Successfully purged ${targetCircularIds.length} synthetic circulars!`);
  }

  console.log('--- PURGE COMPLETE ---');
}

runPurge().catch((err) => {
  console.error('Purge script error:', err);
  process.exit(1);
});
