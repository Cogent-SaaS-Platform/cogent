/**
 * Regulatory Corpus Seeder for Cogent
 * Ingests verified statutory instruments, clauses, obligations, penalties, and prohibited terms
 * Adheres to docs/DATA_MODEL.md v1.1 and docs/BACKLOG.md Epic 3
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  REGULATORY_BODIES_SEED,
  REGULATORY_INSTRUMENTS_SEED,
} from '../src/shared/db/regulatoryCorpusData';

// Parse .env.local manually
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(import.meta.dirname, '../.env.local');
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
const geminiApiKey = env['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Privileged client for database seeding (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!geminiApiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Embedding API returned status ${response.status}: ${errorText}`);
      return null;
    }

    const data = (await response.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values || null;
  } catch (err) {
    console.warn('Failed to generate embedding via Gemini API:', err);
    return null;
  }
}

async function runSeed() {
  console.log('--- Starting Nigerian Regulatory Corpus Seeding ---');

  // 1. Ingest Regulatory Bodies
  console.log('Seeding regulatory bodies...');
  for (const body of REGULATORY_BODIES_SEED) {
    const { error } = await supabase
      .from('regulatory_bodies')
      .upsert(
        {
          code: body.code,
          name: body.name,
          enforcement_power_summary: body.enforcement_power_summary,
          official_portal_url: body.official_portal_url,
        },
        { onConflict: 'code' }
      );

    if (error) {
      console.error(`Error inserting regulatory body ${body.code}:`, error);
      throw error;
    }
  }

  // Fetch regulatory bodies for foreign key mapping
  const { data: bodies, error: bodiesErr } = await supabase
    .from('regulatory_bodies')
    .select('id, code');

  if (bodiesErr || !bodies) {
    throw new Error('Failed to fetch regulatory bodies');
  }

  const bodyMap = new Map<string, string>(bodies.map((b) => [b.code, b.id]));

  // 2. Ingest Instruments, Versions, Clauses, Obligations, Penalties, Rules, Prohibited Terms
  let totalClauses = 0;
  let totalObligations = 0;
  let totalPenalties = 0;
  let totalTerms = 0;

  for (const instrumentSeed of REGULATORY_INSTRUMENTS_SEED) {
    const bodyId = bodyMap.get(instrumentSeed.body_code);
    if (!bodyId) {
      console.warn(`No body found for code: ${instrumentSeed.body_code}`);
      continue;
    }

    console.log(`\nProcessing Instrument: ${instrumentSeed.short_name}`);

    // Check or insert instrument
    const { data: existingInst } = await supabase
      .from('regulatory_instruments')
      .select('id')
      .eq('short_name', instrumentSeed.short_name)
      .limit(1)
      .maybeSingle();

    let instrumentId = existingInst?.id;

    if (!instrumentId) {
      const { data: newInst, error: instErr } = await supabase
        .from('regulatory_instruments')
        .insert({
          body_id: bodyId,
          title: instrumentSeed.title,
          short_name: instrumentSeed.short_name,
          instrument_type: instrumentSeed.instrument_type,
        })
        .select('id')
        .single();

      if (instErr || !newInst) {
        console.error(`Failed to insert instrument ${instrumentSeed.short_name}:`, instErr);
        throw instErr;
      }
      instrumentId = newInst.id;
    }

    // Process versions
    for (const versionSeed of instrumentSeed.versions) {
      const { data: existingVer } = await supabase
        .from('regulatory_document_versions')
        .select('id')
        .eq('reference_code', versionSeed.reference_code)
        .limit(1)
        .maybeSingle();

      let versionId = existingVer?.id;

      if (!versionId) {
        const { data: newVer, error: verErr } = await supabase
          .from('regulatory_document_versions')
          .insert({
            instrument_id: instrumentId,
            version_number: versionSeed.version_number,
            reference_code: versionSeed.reference_code,
            publication_date: versionSeed.publication_date,
            effective_date: versionSeed.effective_date,
            canonical_source_url: versionSeed.canonical_source_url,
            source_file_url: versionSeed.source_file_url,
            source_file_hash: versionSeed.source_file_hash,
            verification_status: versionSeed.verification_status,
            verification_notes: versionSeed.verification_notes,
            is_active: true,
          })
          .select('id')
          .single();

        if (verErr || !newVer) {
          console.error(`Failed to insert version ${versionSeed.reference_code}:`, verErr);
          throw verErr;
        }
        versionId = newVer.id;
      }

      // Process clauses
      for (const clauseSeed of versionSeed.clauses) {
        console.log(`  Processing clause: ${clauseSeed.section_reference}`);

        const textToEmbed = `${clauseSeed.section_heading}: ${clauseSeed.clause_text}`;
        const embedding = await generateEmbedding(textToEmbed);

        const { data: clauseData, error: clauseErr } = await supabase
          .from('regulatory_clauses')
          .insert({
            document_version_id: versionId,
            section_reference: clauseSeed.section_reference,
            section_heading: clauseSeed.section_heading,
            clause_text: clauseSeed.clause_text,
            page_number: clauseSeed.page_number,
            paragraph_reference: clauseSeed.paragraph_reference,
            embedding: embedding,
          })
          .select('id')
          .single();

        if (clauseErr || !clauseData) {
          console.error(`Failed to insert clause ${clauseSeed.section_reference}:`, clauseErr);
          throw clauseErr;
        }
        totalClauses++;
        const clauseId = clauseData.id;

        // Process obligations
        for (const oblSeed of clauseSeed.obligations) {
          const { data: oblData, error: oblErr } = await supabase
            .from('regulatory_obligations')
            .insert({
              clause_id: clauseId,
              obligation_type: oblSeed.obligation_type,
              summary: oblSeed.summary,
              severity_floor: oblSeed.severity_floor,
              statutory_timeline_days: oblSeed.statutory_timeline_days,
              mandatory_disclosure_text: oblSeed.mandatory_disclosure_text,
            })
            .select('id')
            .single();

          if (oblErr || !oblData) {
            console.error(`Failed to insert obligation:`, oblErr);
            throw oblErr;
          }
          totalObligations++;
          const obligationId = oblData.id;

          // Insert statutory penalties
          for (const penSeed of oblSeed.penalties) {
            const { error: penErr } = await supabase
              .from('statutory_penalties')
              .insert({
                obligation_id: obligationId,
                penalty_min_naira: penSeed.penalty_min_naira,
                penalty_max_naira: penSeed.penalty_max_naira,
                daily_fine_naira: penSeed.daily_fine_naira,
                carries_personal_criminal_liability: penSeed.carries_personal_criminal_liability,
                carries_license_suspension_risk: penSeed.carries_license_suspension_risk,
                penalty_legal_citation: penSeed.penalty_legal_citation,
              });

            if (penErr) {
              console.error(`Failed to insert penalty:`, penErr);
              throw penErr;
            }
            totalPenalties++;
          }

          // Insert applicability rules
          for (const appSeed of oblSeed.applicability) {
            await supabase.from('applicability_rules').insert({
              obligation_id: obligationId,
              applicable_license_type: appSeed.applicable_license_type ?? null,
              applicable_payment_rail: appSeed.applicable_payment_rail ?? null,
              minimum_capital_threshold_naira: appSeed.minimum_capital_threshold_naira ?? null,
              all_institutions_flag: appSeed.all_institutions_flag ?? false,
            });
          }

          // Insert prohibited terms with backward FKs to obligation and clause
          for (const termSeed of oblSeed.prohibited_terms) {
            const { error: termErr } = await supabase
              .from('prohibited_terms')
              .insert({
                obligation_id: obligationId,
                clause_id: clauseId,
                regulator_code: instrumentSeed.body_code,
                exact_pattern: termSeed.exact_pattern,
                is_regex: termSeed.is_regex,
                severity: termSeed.severity,
                statutory_rationale: termSeed.statutory_rationale,
                mandatory_disclosure_required: termSeed.mandatory_disclosure_required,
              });

            if (termErr) {
              console.error(`Failed to insert prohibited term ${termSeed.exact_pattern}:`, termErr);
              throw termErr;
            }
            totalTerms++;
          }
        }
      }
    }
  }

  console.log('\n========================================');
  console.log('NIGERIAN REGULATORY CORPUS SEED SUCCESSFUL');
  console.log(`• Clauses Seeded: ${totalClauses}`);
  console.log(`• Statutory Obligations: ${totalObligations}`);
  console.log(`• Statutory Penalties: ${totalPenalties}`);
  console.log(`• Prohibited Terms: ${totalTerms}`);
  console.log('========================================\n');
}

runSeed().catch((err) => {
  console.error('Fatal Seeding Error:', err);
  process.exit(1);
});
