/**
 * Live Regulatory Sources Synchronizer Script
 * 
 * Ingests authentic, live circulars and advisories from Nigerian Apex Regulators
 * (CBN, SEC, NDPC, FCCPC, NFIU, NDIC) and Tier-1 legal/intelligence feeds into Cogent.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { LiveFeedCollector } from '../src/modules/radar/services/liveFeedCollector';

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
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey);
const collector = new LiveFeedCollector({ dbClient: db });

async function run() {
  console.log('=== STARTING LIVE REGULATORY FEED RE-SYNC ===');
  console.log(`Target: Real Nigerian Sources (CBN, SEC, NDPC, FCCPC, NFIU, NDIC, Law Firms, FinTech Media)`);
  
  const summary = await collector.syncAllLiveSources();
  
  console.log('\n=== FEED SYNC COMPLETE ===');
  console.log(`Timestamp: ${summary.timestamp}`);
  console.log(`Total Sources Polled: ${summary.totalSourcesPolled}`);
  console.log(`Total New Ingested: ${summary.totalNewIngested}`);
  console.log(`Total Deduplicated: ${summary.totalDeduplicated}`);
  console.log('\nDetailed Breakdown:');
  for (const res of summary.sourceResults) {
    console.log(`- ${res.sourceName} (${res.regulatorCode}): Found ${res.itemsFound}, Ingested ${res.newIngested}, Dedup ${res.deduplicated}`);
    if (res.errors.length > 0) {
      console.log(`  Warnings/Errors (${res.errors.length}):`, res.errors.slice(0, 3));
    }
  }
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
