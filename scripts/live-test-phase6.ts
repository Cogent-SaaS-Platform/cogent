import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, details?: any) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`✅ [PASS] ${name}`);
  } else {
    results.push({ name, passed: false, details, error: 'Assertion failed' });
    console.error(`❌ [FAIL] ${name}`, details);
  }
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING PHASE 6 LIVE END-TO-END VERIFICATION SUITE`);
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const headers = {
    'x-dev-bypass': 'true',
    'Content-Type': 'application/json',
  };

  // --------------------------------------------------------------------------
  // STEP 6.1: MASTER REGULATORY LIBRARY (/api/library & /api/library/clauses)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Master Regulatory Library Endpoints ---');

  let libraryInstruments: any[] = [];
  try {
    const res = await fetch(`${BASE_URL}/api/library`, { headers });
    assert('GET /api/library returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    assert('GET /api/library returns success: true', data.success === true, { success: data.success });
    assert('GET /api/library returns live instruments array', Array.isArray(data.instruments) && data.instruments.length >= 5, {
      count: data.instruments?.length,
    });

    libraryInstruments = data.instruments || [];
    if (libraryInstruments.length > 0) {
      const first = libraryInstruments[0];
      assert('Instrument has shortTitle and officialCitation', Boolean(first.shortTitle && first.officialCitation), {
        shortTitle: first.shortTitle,
        citation: first.officialCitation,
      });
      assert('Instrument has valid Nigerian regulator', ['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC'].includes(first.regulator), {
        regulator: first.regulator,
      });
    }
  } catch (err: any) {
    assert('GET /api/library request succeeded', false, { error: err.message });
  }

  // Test regulator filtering
  try {
    const res = await fetch(`${BASE_URL}/api/library?regulator=CBN`, { headers });
    const data = await res.json();
    const allCbn = (data.instruments || []).every((i: any) => i.regulator === 'CBN');
    assert('GET /api/library?regulator=CBN returns only CBN instruments', allCbn && data.instruments.length > 0, {
      count: data.instruments?.length,
    });
  } catch (err: any) {
    assert('GET /api/library?regulator=CBN filtering', false, { error: err.message });
  }

  // Test granular clauses
  try {
    // Pick an instrument with clauses (e.g. ARCON or CBN)
    const targetInst = libraryInstruments.find((i: any) => i.sectionsCount > 0) || libraryInstruments[0];
    if (targetInst) {
      const res = await fetch(`${BASE_URL}/api/library/clauses?instrumentId=${targetInst.id}`, { headers });
      assert('GET /api/library/clauses returns HTTP 200', res.status === 200, { status: res.status });
      const data = await res.json();
      assert('GET /api/library/clauses returns success: true', data.success === true);
      assert('GET /api/library/clauses returns clauses array', Array.isArray(data.clauses), {
        clausesCount: data.clauses?.length,
      });

      if (data.clauses?.length > 0) {
        const c = data.clauses[0];
        assert('Clause contains sectionReference and clauseText', Boolean(c.sectionReference && c.clauseText), {
          section: c.sectionReference,
          heading: c.sectionHeading,
        });
      }
    }
  } catch (err: any) {
    assert('GET /api/library/clauses execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 6.2: IMMUTABLE AUDIT LEDGER & CRYPTOGRAPHIC ENGINE (/api/audit)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Immutable Audit Ledger & Verification Engine ---');

  try {
    const res = await fetch(`${BASE_URL}/api/audit`, { headers });
    assert('GET /api/audit returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    assert('GET /api/audit returns success: true', data.success === true);
    assert('GET /api/audit returns real audit count >= 370', (data.totalCount || 0) >= 370, {
      totalCount: data.totalCount,
    });
    assert('GET /api/audit returns cryptographicState: "100% UNBROKEN"', data.metrics?.cryptographicState === '100% UNBROKEN', {
      metrics: data.metrics,
    });

    if (data.logs?.length > 0) {
      const first = data.logs[0];
      assert('Audit log contains valid 64-char SHA-256 hashes', first.sha256InputHash?.length === 64 && first.sha256OutputHash?.length === 64, {
        inputHash: first.sha256InputHash,
        outputHash: first.sha256OutputHash,
      });
      assert('Audit log contains WAT formatted timestamp', first.timestamp?.includes('WAT'), {
        timestamp: first.timestamp,
      });
    }
  } catch (err: any) {
    assert('GET /api/audit execution', false, { error: err.message });
  }

  // Test cryptographic verification POST /api/audit/verify
  try {
    const res = await fetch(`${BASE_URL}/api/audit/verify`, {
      method: 'POST',
      headers,
    });
    assert('POST /api/audit/verify returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    assert('POST /api/audit/verify returns success: true', data.success === true);
    assert('POST /api/audit/verify verifies >= 370 records with 0 tampering', data.validRecords >= 370 && data.tamperedRecords === 0, {
      validRecords: data.validRecords,
      tamperedRecords: data.tamperedRecords,
    });
    assert('POST /api/audit/verify generates valid 64-char SHA-256 Merkle root', data.merkleRoot?.length === 64, {
      merkleRoot: data.merkleRoot,
    });
    assert('POST /api/audit/verify provides enclave proof signature', Boolean(data.cryptographicSignature), {
      signature: data.cryptographicSignature,
    });
  } catch (err: any) {
    assert('POST /api/audit/verify execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 6.3: NOTIFICATIONS PERSISTENCE & REAL-TIME ALERTS (/api/notifications)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Notifications & Dynamic Tenant Alerts ---');

  let sampleNotifId: string | null = null;
  try {
    const res = await fetch(`${BASE_URL}/api/notifications`, { headers });
    assert('GET /api/notifications returns HTTP 200', res.status === 200, { status: res.status });
    const data = await res.json();
    assert('GET /api/notifications returns success: true', data.success === true);
    assert('GET /api/notifications returns live notifications array >= 10', (data.totalCount || 0) >= 10, {
      totalCount: data.totalCount,
      unreadCount: data.unreadCount,
    });

    if (data.notifications?.length > 0) {
      sampleNotifId = data.notifications[0].id;
      const notif = data.notifications[0];
      assert('Notification contains required fields (title, category, actionUrl)', Boolean(notif.title && notif.category && notif.actionUrl), {
        title: notif.title,
        category: notif.category,
        url: notif.actionUrl,
      });
      assert('Dynamic topInsight card is populated', Boolean(data.topInsight?.title), {
        topInsightTitle: data.topInsight?.title,
      });
    }
  } catch (err: any) {
    assert('GET /api/notifications execution', false, { error: err.message });
  }

  // Test read endpoint POST /api/notifications/read
  try {
    if (sampleNotifId) {
      const res = await fetch(`${BASE_URL}/api/notifications/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: sampleNotifId }),
      });
      assert('POST /api/notifications/read single id returns HTTP 200', res.status === 200, { status: res.status });
      const data = await res.json();
      assert('POST /api/notifications/read returns success: true', data.success === true);
    }
  } catch (err: any) {
    assert('POST /api/notifications/read execution', false, { error: err.message });
  }

  // --------------------------------------------------------------------------
  // STEP 6.4: ZERO MOCK CODEBASE AUDIT (QA-10, QA-11, QA-12)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Codebase Zero-Mock Static Analysis Audit ---');

  const libraryPage = fs.readFileSync(path.resolve(process.cwd(), 'src/app/library/page.tsx'), 'utf-8');
  assert('src/app/library/page.tsx has NO static STATUTORY_ITEMS mock', !libraryPage.includes('const STATUTORY_ITEMS: StatutoryCorpusItem[] = ['));
  assert('src/app/library/page.tsx queries /api/library dynamically', libraryPage.includes('/api/library'));
  assert('src/app/library/page.tsx wires Inspect Clauses drawer', libraryPage.includes('handleInspectClauses'));

  const auditPage = fs.readFileSync(path.resolve(process.cwd(), 'src/app/audit/page.tsx'), 'utf-8');
  assert('src/app/audit/page.tsx has NO static AUDIT_LOGS mock', !auditPage.includes('const AUDIT_LOGS: MockAuditLog[] = ['));
  assert('src/app/audit/page.tsx queries /api/audit dynamically', auditPage.includes('/api/audit'));
  assert('src/app/audit/page.tsx wires Verify Chain Integrity modal', auditPage.includes('/api/audit/verify'));

  const drawerComponent = fs.readFileSync(path.resolve(process.cwd(), 'src/shared/ui/SmartInsightDrawer.tsx'), 'utf-8');
  assert('SmartInsightDrawer.tsx has NO static NOTIFICATIONS mock', !drawerComponent.includes('const NOTIFICATIONS: NotificationItem[] = ['));
  assert('SmartInsightDrawer.tsx queries /api/notifications dynamically', drawerComponent.includes('/api/notifications'));
  assert('SmartInsightDrawer.tsx persists read states via /api/notifications/read', drawerComponent.includes('/api/notifications/read'));

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\n======================================================`);
  console.log(`🏁 PHASE 6 VERIFICATION SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  console.log(`======================================================\n`);

  if (passedCount === totalCount) {
    console.log('🎉 ALL PHASE 6 PRODUCTION & CRYPTOGRAPHIC TESTS PASSED!');
    process.exit(0);
  } else {
    console.error(`💥 ${totalCount - passedCount} TESTS FAILED.`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
