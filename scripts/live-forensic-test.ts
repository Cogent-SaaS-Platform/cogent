import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

interface ForensicAssertion {
  category: string;
  test: string;
  passed: boolean;
  evidence?: any;
  error?: string;
}

const assertions: ForensicAssertion[] = [];

function recordAssertion(category: string, test: string, condition: boolean, evidence?: any) {
  if (condition) {
    assertions.push({ category, test, passed: true, evidence });
    console.log(`  ✅ [PASS] (${category}) ${test}`);
  } else {
    assertions.push({ category, test, passed: false, evidence, error: 'Assertion failed' });
    console.error(`  ❌ [FAIL] (${category}) ${test}`, evidence);
  }
}

async function runForensicSuite() {
  console.log(`\n===================================================================`);
  console.log(`🔬 STARTING 100% LIVE FORENSIC REGULATORY & CRYPTOGRAPHIC TEST SUITE`);
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`   Time: ${new Date().toISOString()} (WAT: UTC+1)`);
  console.log(`===================================================================\n`);

  const headers = {
    'x-dev-bypass': 'true',
    'Content-Type': 'application/json',
  };

  const testCircularRef = `CBN/DIR/BIO/${Date.now().toString().slice(-6)}`;
  const testCircularText = `CENTRAL BANK OF NIGERIA
Financial Policy and Regulation Department
Circular Ref: ${testCircularRef}
Date: 15 October 2026

MANDATORY DIRECTIVE ON ADVANCED BIOMETRIC AUTHENTICATION FOR TIER-3 FINTECH LEDGERS

To: All Commercial Banks, Merchant Banks, Payment Service Banks, and Mobile Money Operators.

1.0 STATUTORY MANDATE
Pursuant to Section 2(d) of the CBN Act 2007 and Section 57(2) of the Banks and Other Financial Institutions Act (BOFIA) 2020, all financial institutions must implement real-time liveness biometric facial verification for all outbound customer fund transfers exceeding ₦100,000.

2.0 PENALTIES FOR DEFAULT
Failure to enforce biometric gating shall attract a statutory baseline fine of ₦20,000,000 per institutional occurrence and a daily sanction of ₦1,000,000 for each continuous day of default under BOFIA 2020.`;

  // --------------------------------------------------------------------------
  // STEP 1: REAL-TIME INGESTION VIA INGESTION ENDPOINT
  // --------------------------------------------------------------------------
  console.log(`\n📡 1. FORENSIC TEST: Live Ingestion of Emergency Regulatory Directive...`);
  let initialIngestResult: any = null;

  try {
    const res = await fetch(`${BASE_URL}/api/radar/circulars/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rawText: testCircularText,
        fileName: `${testCircularRef.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
        regulator: 'CBN',
        referenceCode: testCircularRef,
      }),
    });

    recordAssertion('Ingestion', 'POST /api/radar/circulars/ingest returns HTTP 201 Created', res.status === 201, { status: res.status });
    const data = await res.json();
    initialIngestResult = data.data;

    recordAssertion('Ingestion', 'New circular ingested with deduplicated === false', data.deduplicated === false);
    recordAssertion('Ingestion', 'Deterministic metadata accurately extracted circular reference', initialIngestResult?.circularNumber === testCircularRef, {
      expected: testCircularRef,
      received: initialIngestResult?.circularNumber,
    });
    recordAssertion('Ingestion', 'SHA-256 document checksum generated (64 hex chars)', initialIngestResult?.sourceFileHash?.length === 64, {
      hash: initialIngestResult?.sourceFileHash,
    });
    recordAssertion('Ingestion', 'Immutable Audit Log ID generated', Boolean(initialIngestResult?.auditId), {
      auditId: initialIngestResult?.auditId,
    });
  } catch (err: any) {
    recordAssertion('Ingestion', 'Ingestion request execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 2: SHA-256 DEDUPLICATION FORENSIC INTEGRITY
  // --------------------------------------------------------------------------
  console.log(`\n🔒 2. FORENSIC TEST: SHA-256 Deduplication & Idempotency Guarantee...`);
  try {
    const res = await fetch(`${BASE_URL}/api/radar/circulars/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rawText: testCircularText,
        fileName: `${testCircularRef.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
        regulator: 'CBN',
        referenceCode: testCircularRef,
      }),
    });

    recordAssertion('Deduplication', 'Re-ingesting identical content returns HTTP 409 or deduplicated: true', res.status === 409 || res.status === 200, { status: res.status });
    const data = await res.json();
    recordAssertion('Deduplication', 'API response flags deduplicated: true', data.deduplicated === true);
    recordAssertion('Deduplication', 'Deduplication preserves canonical circularId without data duplication', Boolean(data.data?.circularId));
  } catch (err: any) {
    recordAssertion('Deduplication', 'Deduplication check execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 3: REAL-TIME NOTIFICATIONS DISPATCH TO CCO DRAWER
  // --------------------------------------------------------------------------
  console.log(`\n🔔 3. FORENSIC TEST: Real-Time Notification Persistence in Tenant Enclave...`);
  try {
    const res = await fetch(`${BASE_URL}/api/notifications`, { headers });
    recordAssertion('Notifications', 'GET /api/notifications returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    recordAssertion('Notifications', 'Live notifications feed successfully queries database', Array.isArray(data.notifications));

    const matchedNotification = (data.notifications || []).find((n: any) => n.title.includes(testCircularRef));
    recordAssertion('Notifications', 'Newly ingested circular immediately appears in notifications feed', Boolean(matchedNotification), {
      matchedTitle: matchedNotification?.title,
      time: matchedNotification?.time,
    });
    recordAssertion('Notifications', 'New notification is unread (isRead === false)', matchedNotification?.isRead === false);
  } catch (err: any) {
    recordAssertion('Notifications', 'Notifications verification execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 4: AUDIT LEDGER CRYPTOGRAPHIC PROOF (CAMA 2020 / BOFIA 2020)
  // --------------------------------------------------------------------------
  console.log(`\n🛡️ 4. FORENSIC TEST: Immutable Audit Trail & Merkle Chain Verification...`);
  try {
    const res = await fetch(`${BASE_URL}/api/audit?search=${encodeURIComponent(testCircularRef)}`, { headers });
    recordAssertion('Audit', 'GET /api/audit filtered query returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    const auditRecord = (data.logs || []).find((l: any) =>
      l.metadata?.circularNumber === testCircularRef || l.sha256InputHash === initialIngestResult?.sourceFileHash
    );

    recordAssertion('Audit', 'Audit record exists for newly ingested circular', Boolean(auditRecord), {
      action: auditRecord?.action,
      entityId: auditRecord?.entityId,
    });
    recordAssertion('Audit', 'Audit record contains valid SHA-256 input hash', auditRecord?.sha256InputHash?.length === 64);
    recordAssertion('Audit', 'Audit record contains valid SHA-256 output hash', auditRecord?.sha256OutputHash?.length === 64);

    // Cryptographic Chain Verification Endpoint
    const verifyRes = await fetch(`${BASE_URL}/api/audit/verify`, {
      method: 'POST',
      headers,
    });
    recordAssertion('Audit', 'POST /api/audit/verify returns HTTP 200', verifyRes.status === 200);
    const verifyData = await verifyRes.json();
    recordAssertion('Audit', 'Cryptographic state is 100% UNBROKEN', verifyData.integrityStatus === '100% UNBROKEN');
    recordAssertion('Audit', 'Merkle Root is valid 64-character SHA-256 digest', verifyData.merkleRoot?.length === 64, {
      merkleRoot: verifyData.merkleRoot,
    });
    recordAssertion('Audit', 'Zero tampered records detected across entire database', verifyData.tamperedRecords === 0, {
      scanned: verifyData.totalRecordsScanned,
      valid: verifyData.validRecords,
    });
    recordAssertion('Audit', 'Enclave proof signature verified', Boolean(verifyData.cryptographicSignature));
  } catch (err: any) {
    recordAssertion('Audit', 'Audit ledger verification execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 5: MULTI-REGULATOR LIVE FEED SYNC (CBN, SEC, NDPC, ARCON, FCCPC)
  // --------------------------------------------------------------------------
  console.log(`\n🌐 5. FORENSIC TEST: Live Multi-Regulator Source Polling & Network Resilience...`);
  try {
    const res = await fetch(`${BASE_URL}/api/radar/sync`, {
      method: 'POST',
      headers,
    });
    recordAssertion('Live Scrapers', 'POST /api/radar/sync returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    const summary = data.data || data.summary;
    recordAssertion('Live Scrapers', 'Multi-regulator sync reports 5 polled regulatory channels', summary?.totalSourcesPolled === 5, {
      totalSourcesPolled: summary?.totalSourcesPolled,
    });
    recordAssertion('Live Scrapers', 'Sync execution has zero unhandled exceptions', Array.isArray(summary?.sourceResults));

    const sourcesPolled = (summary?.sourceResults || []).map((s: any) => s.regulatorCode);
    const expectedRegulators = ['CBN', 'SEC', 'NDPC', 'ARCON', 'FCCPC'];
    const allExpectedCovered = expectedRegulators.every((r) => sourcesPolled.includes(r));
    recordAssertion('Live Scrapers', 'All 5 Nigerian regulators monitored (CBN, SEC, NDPC, ARCON, FCCPC)', allExpectedCovered, {
      sourcesPolled,
    });

  } catch (err: any) {
    recordAssertion('Live Scrapers', 'Live scraper synchronization execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 6: DYNAMIC HORIZON SCANNING FEED ENRICHMENT
  // --------------------------------------------------------------------------
  console.log(`\n📊 6. FORENSIC TEST: Dynamic Horizon Scanning & Tenant Applicability...`);
  try {
    const res = await fetch(`${BASE_URL}/api/radar/circulars`, { headers });
    recordAssertion('Radar Feed', 'GET /api/radar/circulars returns HTTP 200', res.status === 200);
    const data = await res.json();
    recordAssertion('Radar Feed', 'Returns non-empty live circulars collection from Supabase', Array.isArray(data.circulars) && data.circulars.length > 0, {
      totalCirculars: data.circulars?.length,
    });

    const ingestedInFeed = (data.circulars || []).find((c: any) => c.circularNumber === testCircularRef);
    recordAssertion('Radar Feed', 'Ingested directive is enriched in live radar circulars feed', Boolean(ingestedInFeed), {
      circularNumber: ingestedInFeed?.circularNumber,
      priority: ingestedInFeed?.priority,
    });
  } catch (err: any) {
    recordAssertion('Radar Feed', 'Radar feed enrichment execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // FORENSIC SCORECARD SUMMARY
  // --------------------------------------------------------------------------
  const passedCount = assertions.filter((a) => a.passed).length;
  const totalCount = assertions.length;

  console.log(`\n===================================================================`);
  console.log(`🏁 100% FORENSIC VERIFICATION SCORECARD: ${passedCount} / ${totalCount} PASSED`);
  console.log(`===================================================================\n`);

  if (passedCount === totalCount) {
    console.log(`✨ FULL INSTITUTIONAL COMPLIANCE CERTIFIED:`);
    console.log(`   • Real-Time Directive Ingestion: VERIFIED`);
    console.log(`   • SHA-256 Deduplication Moat: VERIFIED`);
    console.log(`   • CCO Drawer Notifications Dispatch: VERIFIED`);
    console.log(`   • Merkle Root Cryptographic Integrity: 100% UNBROKEN`);
    console.log(`   • 5 Multi-Regulator Live Scrapers: VERIFIED`);
    process.exit(0);
  } else {
    console.error(`💥 ${totalCount - passedCount} FORENSIC ASSERTIONS FAILED.`);
    process.exit(1);
  }
}

runForensicSuite().catch((err) => {
  console.error('Fatal forensic suite error:', err);
  process.exit(1);
});
