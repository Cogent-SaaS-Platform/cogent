/**
 * Backfill Vector Embeddings for Nigerian Regulatory Clauses
 * Generates 768-dimensional embeddings using Google Gemini gemini-embedding-2
 * Adheres to docs/AI_ENGINE.md Section 2
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

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
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

if (!geminiApiKey) {
  console.error('Missing GEMINI_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (values && values.length === 768) {
      return values;
    }
    return null;
  } catch (err) {
    console.error('Error generating embedding with gemini-embedding-2:', err);
    return null;
  }
}

async function runBackfill() {
  console.log('--- Generating 768d Vector Embeddings (gemini-embedding-2) ---');

  const { data: clauses, error } = await supabase
    .from('regulatory_clauses')
    .select('id, section_reference, section_heading, clause_text')
    .is('embedding', null);

  if (error || !clauses) {
    console.error('Failed to fetch clauses:', error);
    process.exit(1);
  }

  console.log(`Found ${clauses.length} clauses requiring vector embeddings.`);

  let updated = 0;
  for (const clause of clauses) {
    const text = `${clause.section_heading}: ${clause.clause_text}`;
    console.log(`Generating 768d embedding for ${clause.section_reference}...`);
    const embedding = await generateEmbedding(text);

    if (embedding && embedding.length === 768) {
      const { error: updateErr } = await supabase
        .from('regulatory_clauses')
        .update({ embedding })
        .eq('id', clause.id);

      if (updateErr) {
        console.error(`Failed to update clause ${clause.id}:`, updateErr);
      } else {
        updated++;
        console.log(`✓ Successfully updated ${clause.section_reference}`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`VECTOR EMBEDDINGS BACKFILL COMPLETE`);
  console.log(`• Successfully embedded: ${updated}/${clauses.length} clauses`);
  console.log(`• Model: gemini-embedding-2 (768 dimensions)`);
  console.log(`========================================\n`);
}

runBackfill().catch((err) => {
  console.error('Fatal embedding error:', err);
  process.exit(1);
});
