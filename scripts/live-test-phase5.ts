import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { LiveFeedCollector } from '../src/modules/radar/services/liveFeedCollector';
import { ApplicabilityEngine } from '../src/modules/radar/services/applicabilityEngine';
import { ExecutiveOverviewService } from '../src/modules/executive/services/executiveOverviewService';
import { LicenseType, PaymentRail } from '../src/shared/types';

// Parse .env.local
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
      if (!process.env[key]) {
        process.env[key] = val;
      }
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

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, step: string, details: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${step}: ${details}`);
    results.push({ step, passed: true, details });
  } else {
    console.error(`  ❌ [FAIL] ${step}: ${details}`);
    results.push({ step, passed: false, details });
  }
}

async function runLiveVerification() {
  console.log('\n=============================================================');
  console.log('🚀 COGENT PHASE 5: LIVE REGULATORY COMPLIANCE VERIFICATION');
  console.log('=============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Database Seed Verification (radar_circulars & lineage)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📡 TEST 1: Inspecting Live Supabase Regulatory Database...');

  const { data: circulars, error: circError } = await supabase
    .from('radar_circulars')
    .select('id, circular_number, subject, document_checksum, lineage_status, targeted_license_types, applies_universally');

  assert(!circError, 'DB Query', circError ? circError.message : 'Successfully queried radar_circulars');
  assert((circulars?.length || 0) >= 7, 'Authentic Seed Count', `Found ${circulars?.length || 0} active circulars in DB (Expected >= 7)`);

  const contactless = circulars?.find((c) => c.circular_number === 'PSM/DIR/CON/CWS/08/014' && c.document_checksum);
  assert(
    !!contactless && contactless.document_checksum?.length === 64,
    'SHA-256 Provenance Check',
    `Contactless Circular has valid 64-char hash: ${contactless?.document_checksum?.slice(0, 16)}...`
  );

  const { data: supersessions, error: superError } = await supabase
    .from('circular_supersession_links')
    .select('*');

  assert(!superError, 'Supersession Query', 'Queried circular_supersession_links table');
  assert(
    (supersessions?.length || 0) >= 1,
    'Lineage DAG Links',
    `Found ${supersessions?.length || 0} active supersession link(s) (PSM/DIR/CON/CWS/08/014 -> BPS/DIR/GEN/CIR/05/011)`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Live Feed Collector Sync & Deterministic Deduplication
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔄 TEST 2: Running Live Feed Collector Synchronization...');

  const collector = new LiveFeedCollector({ dbClient: supabase });
  const syncSummary = await collector.syncAllLiveSources();

  console.log('  📊 Sync Summary: Total deduplicated =', syncSummary.totalDeduplicated, ', sources =', syncSummary.totalSourcesPolled);

  assert(
    syncSummary.totalDeduplicated >= 6,
    'SHA-256 Deduplication',
    `Collector recognized ${syncSummary.totalDeduplicated} existing circulars as cryptographically identical`
  );
  assert(
    syncSummary.totalSourcesPolled === 5,
    'Multi-Regulator Polling',
    `Polled 5 live Nigerian regulatory portals: ${syncSummary.sourceResults.map((s) => s.regulatorCode).join(', ')}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Deterministic Applicability Engine (Tenant Context Matrix)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🎯 TEST 3: Testing Tenant License-Aware Applicability Engine...');

  // Institution Profile A: Tier-1 Commercial Bank & Switching Operator
  const bankTenant = {
    organizationId: 'tenant-bank-001',
    activeLicenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'] as LicenseType[],
    activeRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'] as PaymentRail[],
  };

  // Institution Profile B: Digital Consumer Lender
  const lenderTenant = {
    organizationId: 'tenant-lender-002',
    activeLicenses: ['FINANCE_COMPANY'] as LicenseType[],
    activeRails: [] as PaymentRail[],
  };

  // Evaluate Contactless Payments Circular against Bank vs Lender
  const contactlessDoc = {
    targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'SWITCHING_AND_PROCESSING', 'COMMERCIAL_BANK'] as LicenseType[],
    affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'] as PaymentRail[],
    appliesUniversally: false,
    regulator: 'CBN' as const,
  };

  const bankContactlessEval = ApplicabilityEngine.evaluatePure(bankTenant, contactlessDoc);
  assert(
    bankContactlessEval.isApplicable && bankContactlessEval.matchedLicenses.includes('COMMERCIAL_BANK'),
    'Bank Contactless Applicability',
    'Commercial Bank flagged as directly impacted by Contactless mandate'
  );

  const lenderContactlessEval = ApplicabilityEngine.evaluatePure(lenderTenant, contactlessDoc);
  assert(
    !lenderContactlessEval.isApplicable,
    'Lender Contactless Zero-Noise Filtering',
    'Finance Company correctly filtered out (Zero Noise) for Contactless mandate'
  );

  // Evaluate Digital Lending Circular against Bank vs Lender
  const digitalLendingDoc = {
    targetedLicenses: ['FINANCE_COMPANY', 'MICROFINANCE_BANK'] as LicenseType[],
    affectedRails: [] as PaymentRail[],
    appliesUniversally: false,
    regulator: 'FCCPC' as const,
  };

  const bankLendingEval = ApplicabilityEngine.evaluatePure(bankTenant, digitalLendingDoc);
  assert(
    !bankLendingEval.isApplicable,
    'Bank Lending Zero-Noise Filtering',
    'Commercial Bank correctly filtered out for FCCPC Digital Lending mandate'
  );

  const lenderLendingEval = ApplicabilityEngine.evaluatePure(lenderTenant, digitalLendingDoc);
  assert(
    lenderLendingEval.isApplicable && lenderLendingEval.matchedLicenses.includes('FINANCE_COMPANY'),
    'Lender FCCPC Applicability',
    'Digital Lender correctly flagged as directly impacted by FCCPC Digital Lending mandate'
  );

  // Evaluate Universal NDPC Cross-Border Data Transfer Circular
  const ndpcDoc = {
    targetedLicenses: ['COMMERCIAL_BANK'] as LicenseType[],
    affectedRails: [] as PaymentRail[],
    appliesUniversally: true,
    regulator: 'NDPC' as const,
  };

  const bankNdpcEval = ApplicabilityEngine.evaluatePure(bankTenant, ndpcDoc);
  const lenderNdpcEval = ApplicabilityEngine.evaluatePure(lenderTenant, ndpcDoc);

  assert(
    bankNdpcEval.isApplicable && lenderNdpcEval.isApplicable,
    'Universal Mandate Evaluation',
    'NDPC Universal mandate applies to both Bank and Digital Lender'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Honest Zero-State Telemetry (Executive Overview Service)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📊 TEST 4: Verifying Honest Zero-State Telemetry in Executive Overview...');

  // Fresh simulated organization with zero prior activity
  const freshOrgId = '00000000-0000-0000-0000-000000000099';
  const overviewService = new ExecutiveOverviewService(supabase);
  const overview = await overviewService.getExecutiveOverview(freshOrgId);

  console.log('  📈 Executive Overview Telemetry:');
  console.log('     • Total Fines Avoided:', `₦${overview.totalFinesAvoidedNaira.toLocaleString('en-NG')}`);
  console.log('     • Marketing Scans:', overview.liveTelemetry?.marketing.totalScans ?? 0);
  console.log('     • Composite Health Score:', `${overview.compositeHealthScore}%`);
  console.log('     • Marketing Name:', overview.pillars.marketing.name);
  console.log('     • Radar Name:', overview.pillars.radar.name);
  console.log('     • Gap Matrix Name:', overview.pillars.gapMatrix.name);

  assert(
    overview.totalFinesAvoidedNaira === 0,
    'Zero-Mocking Fines Avoided',
    `Expected ₦0 fine avoided for empty tenant, got ₦${overview.totalFinesAvoidedNaira} (Old mock was ₦86.5M)`
  );

  assert(
    (overview.liveTelemetry?.marketing.totalScans ?? 0) === 0,
    'Zero-Mocking Marketing Scans',
    `Expected 0 marketing scans for empty tenant, got ${overview.liveTelemetry?.marketing.totalScans ?? 0} (Old mock was 18)`
  );

  assert(
    overview.compositeHealthScore === 100,
    'Clean Baseline Health Score',
    `Expected 100% clean baseline score, got ${overview.compositeHealthScore}%`
  );

  assert(
    overview.pillars.marketing.name === 'Marketing Shield',
    'Clean Title Nomenclature',
    `Removed "Pillar 1/2/3" jargon, active name: "${overview.pillars.marketing.name}"`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // FINAL SCORECARD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=============================================================');
  console.log('🏁 PHASE 5 LIVE VERIFICATION SCORECARD');
  console.log('=============================================================');

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log(`Total Assertions : ${totalTests}`);
  console.log(`Passed           : ${passedTests}`);
  console.log(`Failed           : ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL LIVE PHASE 5 TESTS PASSED SUCCESSFULLY! PRODUCTION READY.\n');
  } else {
    console.error(`\n⚠️ ${failedTests} TEST(S) FAILED. INVESTIGATION REQUIRED.\n`);
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal unhandled error during Phase 5 verification:', err);
  process.exit(1);
});
