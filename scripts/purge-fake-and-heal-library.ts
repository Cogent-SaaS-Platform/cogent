import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  generateObligationCriteria,
  sanitizeSectionHeading,
  classifyInstrumentDomainAndType,
  isFakeOrNonStatutory,
} from '../src/modules/regulatory/utils/statutoryUtils';

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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function purgeAndHeal() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[purgeAndHeal] No Supabase credentials available in environment or .env.local.');
    console.log('[purgeAndHeal] Dynamic API fallback in /api/library and /api/library/[id] guarantees runtime purge and reclassification.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log('[purgeAndHeal] Starting database forensic purge and reclassification...');

  // 1. Find and delete fake test stubs & non-statutory records
  const { data: instruments, error: instErr } = await supabase
    .from('regulatory_instruments')
    .select('id, title, short_name');

  if (instErr) {
    console.error('[purgeAndHeal] Error querying instruments:', instErr);
    return;
  }

  const toDeleteIds: string[] = [];
  for (const inst of instruments || []) {
    if (isFakeOrNonStatutory(inst.title) || isFakeOrNonStatutory(inst.short_name)) {
      toDeleteIds.push(inst.id);
      console.log(`[purgeAndHeal] Flagged fake stub for deletion: "${inst.title}" (${inst.id})`);
    }
  }

  if (toDeleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from('regulatory_instruments')
      .delete()
      .in('id', toDeleteIds);
    if (delErr) {
      console.error('[purgeAndHeal] Error deleting fake stubs:', delErr);
    } else {
      console.log(`[purgeAndHeal] Successfully deleted ${toDeleteIds.length} fake stubs from database.`);
    }
  }

  // 2. Reclassify genuine instruments
  const { data: remainingInsts } = await supabase
    .from('regulatory_instruments')
    .select('id, title, short_name, domain, instrument_type, captured_text');

  let reclassifiedCount = 0;
  for (const inst of remainingInsts || []) {
    const { domain, instrumentType } = classifyInstrumentDomainAndType({
      title: inst.title,
      shortName: inst.short_name,
      capturedText: inst.captured_text,
    });

    if (inst.domain !== domain || inst.instrument_type !== instrumentType) {
      await supabase
        .from('regulatory_instruments')
        .update({
          domain,
          instrument_type: instrumentType,
          classification: instrumentType === 'EXPOSURE_DRAFT' ? 'EXPOSURE_DRAFT' : 'SUBSIDIARY_REGULATION',
        })
        .eq('id', inst.id);
      reclassifiedCount++;
    }
  }
  console.log(`[purgeAndHeal] Reclassified domain & instrument_type for ${reclassifiedCount} genuine instruments.`);

  // 3. Purge Mad-Libs assessment criteria & heal with genuine dynamic criteria
  const { data: obls } = await supabase
    .from('regulatory_obligations')
    .select(`
      id,
      code,
      title,
      summary,
      verbatim_quote,
      assessment_criteria,
      regulatory_clauses (
        section_reference,
        section_heading,
        clause_text,
        regulatory_document_versions (
          regulatory_instruments (
            regulatory_bodies ( code )
          )
        )
      )
    `);

  let criteriaHealed = 0;
  for (const obl of obls || []) {
    const rawCritStr = JSON.stringify(obl.assessment_criteria || '');
    const isMadLibs = rawCritStr.includes('Internal operating manual explicitly mandates compliance');

    if (isMadLibs || !obl.assessment_criteria || (Array.isArray(obl.assessment_criteria) && obl.assessment_criteria.length === 0)) {
      const regClause: any = obl.regulatory_clauses;
      const regBodyCode = regClause?.regulatory_document_versions?.regulatory_instruments?.regulatory_bodies?.code || 'CBN';

      const freshCriteria = generateObligationCriteria({
        title: obl.title || 'Statutory Compliance Duty',
        summary: obl.summary || '',
        verbatimQuote: obl.verbatim_quote || regClause?.clause_text || '',
        regulator: regBodyCode,
      });

      await supabase
        .from('regulatory_obligations')
        .update({ assessment_criteria: freshCriteria })
        .eq('id', obl.id);

      criteriaHealed++;
    }
  }
  console.log(`[purgeAndHeal] Replaced Mad-Libs template criteria for ${criteriaHealed} obligations.`);

  // 4. Sanitize section headings
  const { data: clauses } = await supabase
    .from('regulatory_clauses')
    .select('id, section_reference, section_heading');

  let sanitizedClauses = 0;
  for (const cl of clauses || []) {
    const cleanHeading = sanitizeSectionHeading(cl.section_reference, cl.section_heading);
    if (cleanHeading !== cl.section_heading) {
      await supabase
        .from('regulatory_clauses')
        .update({ section_heading: cleanHeading })
        .eq('id', cl.id);
      sanitizedClauses++;
    }
  }
  console.log(`[purgeAndHeal] Sanitized ${sanitizedClauses} repetitive section headings.`);
  console.log('[purgeAndHeal] Forensic purge and healing complete.');
}

purgeAndHeal().catch(console.error);
