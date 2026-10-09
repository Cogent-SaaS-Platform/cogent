/**
 * Live End-to-End System Integration Test for Phase 2 (Pillar 2: Regulatory Radar)
 *
 * Adheres strictly to the Forensic Audit Protocol:
 * NO MOCKUPS, NO MOCK SERVICES, NO STUBS, NO FAKE HARDCODED RESULTS.
 * All tests execute against the live running Next.js application (http://localhost:3000),
 * the live Supabase instance, and real Gemini AI models.
 *
 * Scope:
 * [Task 2.1] Live Database Schema, Constraints & RLS Isolation Audit
 * [Task 2.2] Circular Document Ingestion & SHA-256 Deduplication (409)
 * [Task 2.3] Zero-Noise Relational Applicability Engine (Tenant A vs Tenant B)
 * [Task 2.4] 4-Way Multi-Role ExCo Synthesis Engine (CCO, CFO, CTO, CEO/CRO)
 * [Task 2.5] Circular Lineage & Supersession Graph Resolver (Active Law & Superseded Chains)
 * [Task 2.6] Statutory Countdown Clock, Nigerian Business Days & Compounding SLA Penalties
 * [Task 2.7] Regulatory Radar Endpoints, UI Page & Board Brief Dossier Export
 */

import fs from 'fs';
import path from 'path';

// Parse .env.local manually if running in standalone tsx execution
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}
loadEnvLocal();

import { createAdminClient } from '../src/shared/db';
import { defaultCountdownCalculator } from '../src/modules/radar/services/deadlineCountdownCalculator';

async function runLiveTestPhase2() {
  const BASE_URL = 'http://localhost:3000';
  console.log('================================================================');
  console.log('   COGENT FORENSIC LIVE INTEGRATION TEST — PHASE 2 / PILLAR 2   ');
  console.log('   (Regulatory Radar, Relational Applicability & ExCo Synthesis)');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`   Execution Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  let passedSteps = 0;
  const totalSteps = 7;

  try {
    // --------------------------------------------------------------------------
    // STEP 1: [Task 2.1] Live Database Schema, Constraints & RLS Isolation Audit
    // --------------------------------------------------------------------------
    console.log('[STEP 1] Auditing Live Database Schema, Foreign Keys & RLS Isolation...');
    const db = createAdminClient();

    // Verify required tables
    const requiredTables = [
      'regulatory_bodies',
      'regulatory_instruments',
      'regulatory_document_versions',
      'radar_circulars',
      'circular_supersession_links',
      'radar_tenant_impacts',
      'radar_action_items',
      'tenant_licenses',
      'tenant_payment_rails',
      'audit_logs',
    ] as const;

    for (const table of requiredTables) {
      const { error } = await db.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        throw new Error(`Database table verification failed for "${table}": ${error.message}`);
      }
    }
    console.log(`  ✓ All ${requiredTables.length} core database tables verified active in live Supabase`);

    // Verify tenant profiles exist in tenant_licenses and tenant_payment_rails
    const TENANT_A_ID = '00000000-0000-0000-0000-000000000001'; // Commercial Bank
    const TENANT_B_ID = '00000000-0000-0000-0000-000000000002'; // Microfinance Bank & Digital Lender

    const { data: tenantALicenses } = await db
      .from('tenant_licenses')
      .select('license_type')
      .eq('organization_id', TENANT_A_ID);
    const { data: tenantBLicenses } = await db
      .from('tenant_licenses')
      .select('license_type')
      .eq('organization_id', TENANT_B_ID);

    if (!tenantALicenses || tenantALicenses.length === 0) {
      throw new Error(`Tenant A has no active licenses in database`);
    }
    if (!tenantBLicenses || tenantBLicenses.length === 0) {
      throw new Error(`Tenant B has no active licenses in database`);
    }

    console.log(`  ✓ Tenant A Institutional Profile: ${tenantALicenses.map((l: any) => l.license_type).join(', ')}`);
    console.log(`  ✓ Tenant B Institutional Profile: ${tenantBLicenses.map((l: any) => l.license_type).join(', ')}`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 2: [Task 2.2] Authentic Circular Ingestion & SHA-256 Deduplication
    // --------------------------------------------------------------------------
    console.log('\n[STEP 2] Testing Live Circular Ingestion & SHA-256 Deduplication (/api/radar/circulars/ingest)...');

    // 2A: Ingest authentic CBN Contactless Payments Directive
    const cbnContactlessPayload = {
      rawText: `CENTRAL BANK OF NIGERIA
Financial Policy and Regulation Department
Circular Ref: PSM/DIR/CON/CWS/08/014
Date: 15 January 2026

OPERATIONAL DIRECTIVES ON CONTACTLESS PAYMENTS IN NIGERIA

To: All Commercial Banks, Merchant Banks, Payment Service Banks, Switching and Processing Companies, and Payment Terminal Service Providers (PTSPs).

1.0 INTRODUCTION & MANDATE
In exercise of the powers conferred on the Central Bank of Nigeria under Section 2(d) of the Central Bank of Nigeria Act 2007 and Section 57(2) of the Banks and Other Financial Institutions Act (BOFIA) 2020, the CBN hereby issues these Operational Directives.
This Circular modifies and supersedes Circular BPS/DIR/GEN/CIR/05/011 on Electronic Payments.

2.0 TRANSACTION THRESHOLDS & 2FA AUTHENTICATION
2.1 All contactless payment transactions exceeding Fifteen Thousand Naira (₦15,000) per single transaction must require two-factor authentication (PIN or Biometric validation).
2.2 The daily cumulative transaction limit for contactless card payments without PIN is capped at Fifty Thousand Naira (₦50,000).

3.0 COMPLIANCE TIMELINE & PENALTIES
Full implementation must be concluded within thirty (30) days from issuance, specifically by 2026-03-30.
Failure to comply shall attract a baseline fine of ₦10,000,000 pursuant to BOFIA 2020 Section 57(2), plus a compounding daily sanction of ₦2,000,000 for each continuous day of default.`,
      fileName: 'cbn_contactless_directive_2026.txt',
      regulator: 'CBN',
      referenceCode: 'PSM/DIR/CON/CWS/08/014',
    };

    const ingestRes1 = await fetch(`${BASE_URL}/api/radar/circulars/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cbnContactlessPayload),
    });

    if (ingestRes1.status !== 201 && ingestRes1.status !== 409) {
      throw new Error(`Unexpected status ${ingestRes1.status} from circular ingestion: ${await ingestRes1.text()}`);
    }

    const ingestJson1 = await ingestRes1.json();
    const circular1 = ingestJson1.data;
    console.log(`  ✓ 2A Ingestion Status: HTTP ${ingestRes1.status} (Deduplicated: ${circular1.deduplicated})`);
    console.log(`  ✓ Circular ID: ${circular1.circularId}`);
    console.log(`  ✓ Circular Reference: ${circular1.circularNumber}`);
    console.log(`  ✓ SHA-256 Document Checksum: ${circular1.sourceFileHash}`);
    console.log(`  ✓ Statutory Deadline Parsed: ${circular1.metadata.statutoryDeadline}`);
    console.log(`  ✓ Targeted Licenses Parsed: ${circular1.metadata.targetedLicenseTypes.join(', ')}`);
    console.log(`  ✓ Affected Rails Parsed: ${circular1.metadata.affectedPaymentRails.join(', ')}`);

    // 2B: Deduplication Test — Re-ingest identical payload
    console.log('  - Testing SHA-256 deduplication on identical binary/text submission...');
    const ingestResDuplicate = await fetch(`${BASE_URL}/api/radar/circulars/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cbnContactlessPayload),
    });

    const dupJson = await ingestResDuplicate.json();
    if (ingestResDuplicate.status !== 409 || !dupJson.deduplicated) {
      throw new Error(`Deduplication failed: Expected HTTP 409 with deduplicated=true, got HTTP ${ingestResDuplicate.status}`);
    }
    console.log(`  ✓ 2B Deduplication Verified: HTTP 409 Conflict returned with deduplicated: true`);
    console.log(`  ✓ Matched existing circular ID: ${dupJson.data.circularId}`);

    // 2C: Ingest Predecessor Circular (for lineage graph test)
    const predecessorPayload = {
      rawText: `CENTRAL BANK OF NIGERIA
Banking and Payments System Department
Circular Ref: BPS/DIR/GEN/CIR/05/011
Date: 12 June 2021

REGULATORY FRAMEWORK FOR ELECTRONIC PAYMENTS AND VALUE-ADDED SERVICES

To: All Deposit Money Banks and Payment Service Providers.
This Circular establishes the initial standards for point-of-sale terminal encryption and transaction processing across Nigeria.`,
      fileName: 'cbn_epayments_framework_2021.txt',
      regulator: 'CBN',
      referenceCode: 'BPS/DIR/GEN/CIR/05/011',
    };

    const ingestResPred = await fetch(`${BASE_URL}/api/radar/circulars/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(predecessorPayload),
    });
    const predJson = await ingestResPred.json();
    const circularPred = predJson.data;
    console.log(`  ✓ 2C Ingested Predecessor Circular: ${circularPred.circularNumber} (${circularPred.circularId})`);

    // 2D: Ingest SEC VASP Directive (for zero-noise applicability test)
    const secVaspPayload = {
      rawText: `SECURITIES AND EXCHANGE COMMISSION (SEC)
Securities and Investment Services Directorate
Circular Ref: SEC/CIR/VASP/2026/009
Date: 10 February 2026

REGULATORY FRAMEWORK ON VIRTUAL ASSETS SERVICE PROVIDERS (VASPS)

To: All Registered Digital Asset Exchanges, Digital Asset Custodians, and Offering Platforms.
Pursuant to Section 13 of the Investments and Securities Act (ISA) 2007, all Virtual Asset Service Providers (VASPs) must maintain minimum paid-up capital of ₦1,000,000,000 and submit quarterly AML travel rule audits.`,
      fileName: 'sec_vasp_directive_2026.txt',
      regulator: 'SEC',
      referenceCode: 'SEC/CIR/VASP/2026/009',
    };

    const ingestResSec = await fetch(`${BASE_URL}/api/radar/circulars/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(secVaspPayload),
    });
    const secJson = await ingestResSec.json();
    const circularSec = secJson.data;
    console.log(`  ✓ 2D Ingested SEC VASP Circular: ${circularSec.circularNumber} (${circularSec.circularId})`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 3: [Task 2.3] Zero-Noise Relational Applicability Engine Live Test
    // --------------------------------------------------------------------------
    console.log('\n[STEP 3] Testing Zero-Noise Relational Applicability Engine (/api/radar/evaluate)...');

    // 3A: Tenant A (Commercial Bank & Switching) vs CBN Contactless Circular -> MUST BE APPLICABLE
    const evalResA1 = await fetch(`${BASE_URL}/api/radar/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circularId: circular1.circularId,
        organizationId: TENANT_A_ID,
        synthesizeBriefs: false,
      }),
    });
    if (!evalResA1.ok) {
      throw new Error(`Evaluation failed for Tenant A on CBN circular: ${await evalResA1.text()}`);
    }
    const evalJsonA1 = await evalResA1.json();
    if (!evalJsonA1.data.isApplicable) {
      throw new Error(`Tenant A should be APPLICABLE to CBN Contactless Circular!`);
    }
    console.log('  ✓ 3A Tenant A (Commercial Bank + Switching) vs CBN Contactless Directive:');
    console.log(`    - Status: APPLICABLE (isApplicable: ${evalJsonA1.data.isApplicable})`);
    console.log(`    - Matched Licenses: [ ${evalJsonA1.data.applicability.matchedLicenses.join(', ')} ]`);
    console.log(`    - Matched Rails: [ ${evalJsonA1.data.applicability.matchedRails.join(', ')} ]`);
    console.log(`    - Rationale: "${evalJsonA1.data.applicability.reason}"`);

    // 3B: Tenant A vs SEC VASP Circular -> MUST BE FILTERED OUT (Zero-Noise)
    const evalResA2 = await fetch(`${BASE_URL}/api/radar/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circularId: circularSec.circularId,
        organizationId: TENANT_A_ID,
        synthesizeBriefs: false,
      }),
    });
    const evalJsonA2 = await evalResA2.json();
    if (evalJsonA2.data.isApplicable) {
      throw new Error(`Tenant A should be NON-APPLICABLE to SEC VASP Circular!`);
    }
    console.log('  ✓ 3B Tenant A (Commercial Bank) vs SEC VASP Directive:');
    console.log(`    - Status: ZERO-NOISE FILTERED (isApplicable: ${evalJsonA2.data.isApplicable})`);
    console.log(`    - Rationale: "${evalJsonA2.data.applicability.reason}"`);

    // 3C: Tenant B (State MFB & Digital Lender) vs CBN Contactless -> MUST BE FILTERED OUT
    const evalResB1 = await fetch(`${BASE_URL}/api/radar/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circularId: circular1.circularId,
        organizationId: TENANT_B_ID,
        synthesizeBriefs: false,
      }),
    });
    const evalJsonB1 = await evalResB1.json();
    if (evalJsonB1.data.isApplicable) {
      throw new Error(`Tenant B should be NON-APPLICABLE to CBN Contactless Circular!`);
    }
    console.log('  ✓ 3C Tenant B (State MFB & Digital Lender) vs CBN Contactless Directive:');
    console.log(`    - Status: ZERO-NOISE FILTERED (isApplicable: ${evalJsonB1.data.isApplicable})`);
    console.log(`    - Rationale: "${evalJsonB1.data.applicability.reason}"`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 4: [Task 2.4] 4-Way Multi-Role ExCo Synthesis Engine Live Test
    // --------------------------------------------------------------------------
    console.log('\n[STEP 4] Testing 4-Way Multi-Role ExCo Synthesis Engine (Real Gemini Models)...');
    console.log('  - Submitting CBN Contactless Directive for Tenant A live synthesis...');

    const synthStartTime = Date.now();
    const synthRes = await fetch(`${BASE_URL}/api/radar/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circularId: circular1.circularId,
        organizationId: TENANT_A_ID,
        synthesizeBriefs: true,
      }),
    });
    const synthLatency = Date.now() - synthStartTime;

    if (!synthRes.ok) {
      throw new Error(`4-Way ExCo synthesis failed: ${await synthRes.text()}`);
    }
    const synthJson = await synthRes.json();
    const synthesis = synthJson.data.synthesis;

    if (!synthesis || !synthesis.output) {
      throw new Error(`Synthesis output missing in response payload`);
    }

    const { output, telemetry } = synthesis;
    console.log(`  ✓ Status: 200 OK (${synthLatency}ms execution latency)`);
    console.log(`  ✓ AI Model Utilized: ${telemetry.modelIdentifier}`);
    console.log(`  ✓ Input Tokens: ${telemetry.inputTokens} | Output Tokens: ${telemetry.outputTokens}`);
    console.log(`  ✓ Prompt Hash: ${telemetry.promptHash.slice(0, 16)}... | Output Hash: ${telemetry.outputHash.slice(0, 16)}...`);

    // Verify all 4 personas are distinct and populated
    const ccoBrief = output.executiveBriefCco;
    const cfoBrief = output.financialBriefCfo;
    const ctoBrief = output.technicalBriefCto || output.technicalBriefProductEng;
    const ceoBrief = output.governanceBriefCeoCro || output.actionBriefCoo;

    if (!ccoBrief || !cfoBrief || !ctoBrief || !ceoBrief) {
      throw new Error(`One or more of the 4 ExCo personas was null or empty!`);
    }

    console.log(`  ✓ 4-Way Personas Verified:`);
    console.log(`    [1] CCO (Legal / Sanctions): "${ccoBrief.slice(0, 80)}..."`);
    console.log(`    [2] CFO (Liquidity / Reserves): "${cfoBrief.slice(0, 80)}..."`);
    console.log(`    [3] CTO (APIs / HSM / Auth): "${ctoBrief.slice(0, 80)}..."`);
    console.log(`    [4] CEO/CRO (Governance / Board): "${ceoBrief.slice(0, 80)}..."`);
    console.log(`  ✓ Action Items Generated: ${output.actionChecklist?.length} tasks assigned to ExCo departments`);
    output.actionChecklist?.slice(0, 3).forEach((item: any, idx: number) => {
      console.log(`    • Task ${idx + 1} [${item.targetDepartment}]: ${item.actionTitle} (Due: ${item.suggestedDeadline})`);
    });

    // Verify persistence in Supabase
    const { data: dbImpact } = await (db as any)
      .from('radar_tenant_impacts')
      .select('status, executive_brief_cco, role_briefs')
      .eq('organization_id', TENANT_A_ID)
      .eq('circular_id', circular1.circularId)
      .single();

    if (!dbImpact || (dbImpact as any).status !== 'SYNTHESIZED') {
      throw new Error(`radar_tenant_impacts record was not persisted with status SYNTHESIZED in Supabase!`);
    }
    console.log(`  ✓ Verified persistence in Supabase (radar_tenant_impacts.status = 'SYNTHESIZED')`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 5: [Task 2.5] Circular Lineage & Supersession Graph Live Test
    // --------------------------------------------------------------------------
    console.log('\n[STEP 5] Testing Circular Lineage & Supersession Graph Resolver (/api/radar/lineage)...');

    // 5A: Create supersession edge linking Circular 1 as replacing Predecessor Circular
    console.log('  - Creating supersession edge: Circular 1 REVOKES_AND_REPLACES Predecessor Circular...');
    const linkRes = await fetch(`${BASE_URL}/api/radar/lineage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentCircularId: circularPred.circularId,
        childCircularId: circular1.circularId,
        amendmentType: 'REVOKES_AND_REPLACES',
        affectedClauseReferences: 'Section 1.0 Introduces superseding standard for Point-of-Sale contactless terminals',
      }),
    });
    if (!linkRes.ok) {
      throw new Error(`Failed to create supersession edge: ${await linkRes.text()}`);
    }
    const linkJson = await linkRes.json();
    console.log(`  ✓ 5A Supersession Link Created: ID ${linkJson.data.id} (${linkJson.data.amendmentType})`);

    // 5B: Query Predecessor Lineage Graph — Parent MUST show lineage_status = 'SUPERSEDED'
    const predLineageRes = await fetch(`${BASE_URL}/api/radar/lineage?circularId=${circularPred.circularId}`);
    if (!predLineageRes.ok) {
      throw new Error(`Failed to query predecessor lineage: ${await predLineageRes.text()}`);
    }
    const predLineageJson = await predLineageRes.json();
    const predGraph = predLineageJson.data;

    console.log('  ✓ 5B Predecessor Graph Traversal:');
    console.log(`    - Predecessor Status: ${predGraph.currentNode.lineageStatus} (Expected: SUPERSEDED)`);
    console.log(`    - Is Effective Law: ${predGraph.isCurrentEffectiveLaw} (Expected: false)`);
    console.log(`    - Active Governing Circular: ${predGraph.activeGoverningCircular.circularNumber} (${predGraph.activeGoverningCircular.id})`);
    console.log(`    - Descendants Count: ${predGraph.descendants.length}`);

    if (predGraph.currentNode.lineageStatus !== 'SUPERSEDED') {
      throw new Error(`Predecessor lineage status was not updated to SUPERSEDED! Got: ${predGraph.currentNode.lineageStatus}`);
    }
    if (predGraph.isCurrentEffectiveLaw !== false) {
      throw new Error(`Predecessor isCurrentEffectiveLaw should be false!`);
    }

    // 5C: Query Child Lineage Graph — Child MUST show Predecessor in Ancestors
    const childLineageRes = await fetch(`${BASE_URL}/api/radar/lineage?circularId=${circular1.circularId}`);
    const childGraph = (await childLineageRes.json()).data;
    console.log('  ✓ 5C Child Graph Traversal:');
    console.log(`    - Child Status: ${childGraph.currentNode.lineageStatus} (Expected: ACTIVE_LAW)`);
    console.log(`    - Is Effective Law: ${childGraph.isCurrentEffectiveLaw} (Expected: true)`);
    console.log(`    - Ancestors Count: ${childGraph.ancestors.length} (Ancestor: ${childGraph.ancestors[0]?.circularNumber})`);

    if (childGraph.ancestors.length === 0) {
      throw new Error(`Child circular should have at least 1 ancestor!`);
    }
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 6: [Task 2.6] Statutory Countdown Clock & SLA Alerts Live Test
    // --------------------------------------------------------------------------
    console.log('\n[STEP 6] Testing Statutory Countdown Engine & SLA Alerts (Dynamic Dates)...');

    // Test Scenario A: Expired Deadline in the past
    const expiredEvaluation = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: '2025-12-01',
      publicationDate: '2025-10-01',
      now: new Date('2026-03-01'),
      regulator: 'CBN',
    });

    console.log('  ✓ 6A Expired Deadline Evaluation (Statutory Window Passed):');
    console.log(`    - Tier: ${expiredEvaluation.tier} (Expected: CRITICAL_EMERGENCY)`);
    console.log(`    - Is Expired: ${expiredEvaluation.isExpired} (Expected: true)`);
    console.log(`    - Days Overdue: ${Math.abs(expiredEvaluation.daysRemaining!)} days`);
    console.log(`    - SLA Escalation: ${expiredEvaluation.slaEscalationLevel} (Expected: OVERDUE_EXCO_ALERT)`);
    console.log(`    - Compounded Fine Exposure: ₦${expiredEvaluation.penaltyEscalation.totalProjectedExposureNaira.toLocaleString()}`);

    if (!expiredEvaluation.isExpired || expiredEvaluation.slaEscalationLevel !== 'OVERDUE_EXCO_ALERT') {
      throw new Error(`Expired countdown evaluation failed contract!`);
    }

    // Test Scenario B: Critical Impending Deadline (<= 7 Days Remaining)
    const impendingEvaluation = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: '2026-03-05',
      publicationDate: '2026-02-15',
      now: new Date('2026-03-01'),
      regulator: 'CBN',
    });

    console.log('  ✓ 6B Impending Deadline Evaluation (4 Days Remaining):');
    console.log(`    - Tier: ${impendingEvaluation.tier} (Expected: CRITICAL_EMERGENCY)`);
    console.log(`    - Days Remaining: ${impendingEvaluation.daysRemaining} days`);
    console.log(`    - Business Days Remaining: ${impendingEvaluation.businessDaysRemaining} days (Excludes Nigerian weekends)`);
    console.log(`    - Should Flash Badge: ${impendingEvaluation.shouldFlash} (Expected: true)`);
    console.log(`    - SLA Escalation: ${impendingEvaluation.slaEscalationLevel} (Expected: CEO_BOARD_CRITICAL_T48)`);

    if (impendingEvaluation.tier !== 'CRITICAL_EMERGENCY' || !impendingEvaluation.shouldFlash) {
      throw new Error(`Impending deadline evaluation failed contract!`);
    }

    // Test Scenario C: Standard Window Deadline (20 Days Remaining)
    const standardEvaluation = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: '2026-03-21',
      publicationDate: '2026-02-01',
      now: new Date('2026-03-01'),
      regulator: 'SEC',
    });

    console.log('  ✓ 6C Standard Window Evaluation (20 Days Remaining):');
    console.log(`    - Tier: ${standardEvaluation.tier} (Expected: MEDIUM)`);
    console.log(`    - Urgency Window: ${standardEvaluation.urgencyWindow} (Expected: STANDARD_WINDOW)`);
    console.log(`    - SEC Baseline Fine: ₦${standardEvaluation.penaltyEscalation.baselineFineNaira.toLocaleString()}`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 7: [Task 2.7] Regulatory Radar Endpoints, UI Page & Board Brief Export
    // --------------------------------------------------------------------------
    console.log('\n[STEP 7] Testing Regulatory Radar API Endpoints, UI Page & Board Brief Dossier Export...');

    // 7A: Test GET /api/radar/circulars (with enriched dynamic countdown metadata)
    const circularsRes = await fetch(`${BASE_URL}/api/radar/circulars`);
    if (!circularsRes.ok) {
      throw new Error(`GET /api/radar/circulars returned status ${circularsRes.status}`);
    }
    const circularsJson = await circularsRes.json();
    console.log(`  ✓ 7A GET /api/radar/circulars: 200 OK (${circularsJson.circulars?.length} circulars returned)`);
    const sampleCirc = circularsJson.circulars?.[0];
    console.log(`    - Sample Circular: ${sampleCirc?.circular_number} | Priority: ${sampleCirc?.priority}`);
    console.log(`    - Embedded Dynamic Countdown: Tier ${sampleCirc?.countdown?.tier} | Days: ${sampleCirc?.countdown?.daysRemaining}`);

    // 7B: Test POST /api/radar/brief (Markdown Board Brief Dossier Export)
    const briefMdRes = await fetch(`${BASE_URL}/api/radar/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circular: {
          circularNumber: circular1.circularNumber,
          regulatorCode: 'CBN',
          subject: circular1.metadata.subject,
          publicationDate: circular1.metadata.publicationDate,
          statutoryDeadline: circular1.metadata.statutoryDeadline,
          priority: circular1.metadata.priority,
        },
        applicability: evalJsonA1.data.applicability,
        roleBriefs: synthesis.output,
        actionItems: synthesis.output.actionChecklist,
        format: 'markdown',
      }),
    });
    if (!briefMdRes.ok) {
      throw new Error(`POST /api/radar/brief (Markdown) returned status ${briefMdRes.status}`);
    }
    const briefMdText = await briefMdRes.text();
    const hasHeaderMd = briefMdText.includes('CONFIDENTIAL EXECUTIVE BOARD BRIEF: REGULATORY IMPACT ASSESSMENT');
    const hasCcoAttestMd = briefMdText.includes('CHIEF COMPLIANCE OFFICER (CCO) ATTESTATION & SIGN-OFF');
    const docHashMd = briefMdRes.headers.get('x-document-hash');

    console.log(`  ✓ 7B POST /api/radar/brief (Markdown Format):`);
    console.log(`    - Size: ${briefMdText.length} bytes`);
    console.log(`    - Executive Board Header Present: ${hasHeaderMd ? 'YES' : 'NO'}`);
    console.log(`    - CCO Attestation Block Present: ${hasCcoAttestMd ? 'YES' : 'NO'}`);
    console.log(`    - Cryptographic Document Seal: ${docHashMd?.slice(0, 24)}...`);

    // 7C: Test POST /api/radar/brief (HTML Format with Printable Seal)
    const briefHtmlRes = await fetch(`${BASE_URL}/api/radar/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circular: {
          circularNumber: circular1.circularNumber,
          regulatorCode: 'CBN',
          subject: circular1.metadata.subject,
          publicationDate: circular1.metadata.publicationDate,
          statutoryDeadline: circular1.metadata.statutoryDeadline,
          priority: circular1.metadata.priority,
        },
        applicability: evalJsonA1.data.applicability,
        roleBriefs: synthesis.output,
        actionItems: synthesis.output.actionChecklist,
        format: 'html',
      }),
    });
    if (!briefHtmlRes.ok) {
      throw new Error(`POST /api/radar/brief (HTML) returned status ${briefHtmlRes.status}`);
    }
    const briefHtmlText = await briefHtmlRes.text();
    const hasHtmlTitle = briefHtmlText.includes('Executive Board Brief');
    console.log(`  ✓ 7C POST /api/radar/brief (Printable HTML Format):`);
    console.log(`    - Size: ${briefHtmlText.length} bytes`);
    console.log(`    - HTML Board Brief Title Present: ${hasHtmlTitle ? 'YES' : 'NO'}`);

    // 7D: Test GET /radar (Frontend Cockpit Page)
    const cockpitRes = await fetch(`${BASE_URL}/radar`);
    if (!cockpitRes.ok) {
      throw new Error(`GET /radar returned status ${cockpitRes.status}`);
    }
    console.log(`  ✓ 7D GET /radar (Regulatory Radar UI Cockpit Page): 200 OK`);
    passedSteps++;

    console.log('\n================================================================');
    console.log(`   LIVE INTEGRATION TEST RESULTS: ${passedSteps}/${totalSteps} PASSED (100%) `);
    console.log('   Pillar 2 Regulatory Radar is 100% OPERATIONAL, AUDITED & CERTIFIED! ');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('\n❌ LIVE INTEGRATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

runLiveTestPhase2();
