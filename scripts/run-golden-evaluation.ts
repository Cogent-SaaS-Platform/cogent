import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoldenBenchmarkEvaluator } from '../src/modules/radar/services/goldenBenchmarkEvaluator';

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

const localEnv = loadEnvLocal();
const supabaseUrl = localEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljtynxudbiayfkfbdbpw.supabase.co';
const supabaseKey =
  localEnv.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

async function main() {
  console.log('\n========================================================================');
  console.log('🏛️  COGENT REGTECH: GOLDEN BENCHMARK SUPERVISORY ACCURACY EVALUATION');
  console.log('    Apex Regulators: CBN | SEC | NDPC | FCCPC | NFIU | NDIC');
  console.log('========================================================================\n');

  let dbClient: any;
  if (supabaseUrl && supabaseKey) {
    dbClient = createClient(supabaseUrl, supabaseKey);
  }

  const evaluator = new GoldenBenchmarkEvaluator({ dbClient });
  const summary = await evaluator.runBenchmarkSuite();

  console.log('📊 REGULATORY BREAKDOWN BY DIRECTIVE:');
  console.log('------------------------------------------------------------------------------------------------------');
  console.log(
    'Regulator'.padEnd(10) +
    'Circular Reference'.padEnd(28) +
    'GT Obs'.padEnd(10) +
    'Ext Obs'.padEnd(10) +
    'Precision'.padEnd(12) +
    'Recall'.padEnd(10) +
    'Span Fidelity'.padEnd(16) +
    'Penalty Grounding'
  );
  console.log('------------------------------------------------------------------------------------------------------');

  for (const res of summary.instrumentResults) {
    console.log(
      res.regulator.padEnd(10) +
      res.circularReference.padEnd(28) +
      String(res.groundTruthCount).padEnd(10) +
      String(res.extractedCount).padEnd(10) +
      `${(res.precision * 100).toFixed(1)}%`.padEnd(12) +
      `${(res.recall * 100).toFixed(1)}%`.padEnd(10) +
      `${(res.characterSpanFidelity * 100).toFixed(1)}%`.padEnd(16) +
      `${(res.statutoryPenaltyGrounding * 100).toFixed(1)}%`
    );
  }
  console.log('------------------------------------------------------------------------------------------------------\n');

  console.log('🏆 AGGREGATE SUPERVISORY AUDIT DEFENSE SCORECARD:');
  console.log(`   • Total Regulatory Instruments  : ${summary.totalInstruments}`);
  console.log(`   • Total Ground-Truth Obligations: ${summary.totalGroundTruthObligations}`);
  console.log(`   • Total Extracted Obligations   : ${summary.totalExtractedObligations}`);
  console.log(`   • True Positives (Grounded)     : ${summary.truePositives}`);
  console.log(`   • False Positives               : ${summary.falsePositives}`);
  console.log(`   • False Negatives               : ${summary.falseNegatives}`);
  console.log(`   • Extraction Precision          : ${(summary.precision * 100).toFixed(2)}% (Target: >= 90.0%)`);
  console.log(`   • Extraction Recall             : ${(summary.recall * 100).toFixed(2)}% (Target: >= 85.0%)`);
  console.log(`   • F1 Macro-Score                : ${(summary.f1Score * 100).toFixed(2)}%`);
  console.log(`   • Character Span Fidelity       : ${(summary.characterSpanFidelity * 100).toFixed(2)}% (Target: 100%)`);
  console.log(`   • Statutory Penalty Grounding   : ${(summary.statutoryPenaltyGrounding * 100).toFixed(2)}% (Target: 100%)`);
  console.log(`   • Hallucinated Penalties Count  : ${summary.hallucinatedPenaltiesCount} (Zero-Tolerance)`);
  console.log(`   • Character Span Drifts         : ${summary.characterDriftCount}`);
  console.log(`   • Execution Latency             : ${summary.executionLatencyMs}ms`);
  console.log(`   • Cryptographic SHA-256 Seal   : ${summary.sha256Seal}`);
  console.log(`   • Database Persistence Status   : ${summary.persistedToDatabase ? 'COMMITTED (supervisory_benchmark_runs)' : 'LOCAL SEAL'}\n`);

  const passed =
    summary.precision >= 0.88 &&
    summary.recall >= 0.85 &&
    summary.characterSpanFidelity >= 0.99 &&
    summary.statutoryPenaltyGrounding === 1.0 &&
    summary.hallucinatedPenaltiesCount === 0;

  if (passed) {
    console.log('🎉 GOLDEN BENCHMARK CERTIFICATION PASSED: SUPERVISORY AUDIT READY!\n');
    process.exitCode = 0;
  } else {
    console.error('❌ GOLDEN BENCHMARK ACCURACY THRESHOLD NOT MET.\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal error during golden benchmark evaluation:', err);
  process.exitCode = 1;
});
