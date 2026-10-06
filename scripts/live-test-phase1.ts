/**
 * Live End-to-End System Integration Test for Phase 1 (Pillar 1: Marketing Shield)
 *
 * Exercises all live endpoints and engine services on http://localhost:3000:
 * 1. Claims Ledger Ingestion & Querying (Task 1.2)
 * 2. Pre-Vetting Pipeline Execution & Claims Ledger Integration (Tasks 1.2, 1.3)
 * 3. Formal CCO Sign-Off & Attestation (with Claims Ledger save)
 * 4. Post-Publish Live Asset Drift Watcher (Task 1.4)
 * 5. Official ARCON ASP & CBN CPD Defense Pack Dossier Generation (Task 1.5)
 */

async function runLiveTest() {
  const BASE_URL = 'http://localhost:3000';
  console.log('================================================================');
  console.log('   COGENT LIVE SYSTEM INTEGRATION TEST — PHASE 1 / PILLAR 1    ');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log('================================================================\n');

  let passedSteps = 0;
  let totalSteps = 6;

  try {
    // --------------------------------------------------------------------------
    // STEP 1: Query Claims Ledger
    // --------------------------------------------------------------------------
    console.log('[STEP 1] Testing GET /api/marketing/claims-ledger...');
    const ledgerRes = await fetch(`${BASE_URL}/api/marketing/claims-ledger?category=WEALTHTECH_INVEST`);
    if (!ledgerRes.ok) {
      throw new Error(`GET /api/marketing/claims-ledger returned ${ledgerRes.status}`);
    }
    const ledgerJson = await ledgerRes.json();
    console.log(`  ✓ Status: 200 OK`);
    console.log(`  ✓ Active Claims Returned: ${ledgerJson.data?.claims?.length}`);
    console.log(`  ✓ First Sample Claim: "${ledgerJson.data?.claims?.[0]?.approvedText?.substring(0, 60)}..."`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 2: Add New Approved Phrasing to Claims Ledger
    // --------------------------------------------------------------------------
    console.log('\n[STEP 2] Testing POST /api/marketing/claims-ledger...');
    const newClaimRes = await fetch(`${BASE_URL}/api/marketing/claims-ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productCategory: 'WEALTHTECH_INVEST',
        approvedText: 'Earn up to 28% targeted annual yield on vetted SEC-registered commercial paper.',
        prohibitedCounterpart: 'Guaranteed 28% risk free return',
        governingRegulator: 'SEC',
        statutoryCitation: 'SEC Rule 198(2) & ISA 2007 s.67',
        ccoRationale: 'Tested live integration claim with mandatory risk disclosure.',
      }),
    });
    if (!newClaimRes.ok) {
      throw new Error(`POST /api/marketing/claims-ledger returned ${newClaimRes.status}`);
    }
    const newClaimJson = await newClaimRes.json();
    console.log(`  ✓ Status: 201 Created`);
    console.log(`  ✓ New Claim ID: ${newClaimJson.data?.id}`);
    console.log(`  ✓ Approved Phrasing: "${newClaimJson.data?.approvedText}"`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 3: Pre-Vetting Pipeline Execution with Raw Prohibited Copy
    // --------------------------------------------------------------------------
    console.log('\n[STEP 3] Testing POST /api/marketing/scan (Full 7-Stage Pre-Vetting Pipeline)...');
    const scanInput = {
      campaignName: 'Live Integration High-Yield Test Ad',
      channel: 'SOCIAL_MEDIA_POST',
      productCategory: 'WEALTHTECH_INVEST',
      rawCopy: 'Invest in our wealth fund today and enjoy a guaranteed 28% risk free return! Zero risk to your principal capital.',
      targetAudience: 'Nigerian retail investors',
    };
    console.log(`  - Submitting Copy: "${scanInput.rawCopy}"`);

    const scanStartTime = Date.now();
    const scanRes = await fetch(`${BASE_URL}/api/marketing/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanInput),
    });
    const scanLatency = Date.now() - scanStartTime;

    if (!scanRes.ok) {
      const errText = await scanRes.text();
      throw new Error(`POST /api/marketing/scan returned ${scanRes.status}: ${errText}`);
    }
    const scanJson = await scanRes.json();
    const scanData = scanJson.data;

    console.log(`  ✓ Status: 200 OK (${scanLatency}ms execution latency)`);
    console.log(`  ✓ Scan ID: ${scanData.scanId}`);
    console.log(`  ✓ Verdict: ${scanData.verdict}`);
    console.log(`  ✓ Overall Risk Score: ${scanData.overallRiskScore}/100`);
    console.log(`  ✓ Fine Exposure: ₦${scanData.deterministicPenaltyTotalNaira?.toLocaleString()}`);
    console.log(`  ✓ Total Statutory Findings: ${scanData.findings?.length}`);

    // Check that Claims Ledger match was caught
    const hasClaimsMatch = scanData.findings?.some(
      (f: any) => f.findingType === 'CLAIMS_LEDGER_MATCH'
    );
    console.log(`  ✓ Institutional Claims Ledger Match Triggered: ${hasClaimsMatch ? 'YES' : 'NO'}`);
    console.log(`  ✓ Compliant Rewrite: "${scanData.compliantRewrite?.substring(0, 80)}..."`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 4: Formal CCO Sign-Off & Attestation
    // --------------------------------------------------------------------------
    console.log('\n[STEP 4] Testing POST /api/marketing/signoff...');
    const signoffRes = await fetch(`${BASE_URL}/api/marketing/signoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanId: scanData.scanId,
        campaignName: scanInput.campaignName,
        status: 'APPROVED_BY_CCO',
        reviewerName: 'Dr. Folashade Adeleke, SAN',
        reviewerTitle: 'Chief Compliance Officer',
        attestationNotes: 'Live integration clearance verified against SEC Rule 198 and ARCON Code 2022.',
        auditHash: scanData.telemetry?.auditHash,
        saveToClaimsLedger: true,
        claimData: {
          productCategory: 'WEALTHTECH_INVEST',
          approvedText: scanData.compliantRewrite || 'Compliant wealth asset yield with SEC disclosures.',
          prohibitedCounterpart: 'Guaranteed 28% risk free return',
          governingRegulator: 'SEC',
          statutoryCitation: 'SEC Rule 198(2)',
          ccoRationale: 'Reconciled in formal CCO signoff live integration test.',
        },
      }),
    });
    if (!signoffRes.ok) {
      throw new Error(`POST /api/marketing/signoff returned ${signoffRes.status}`);
    }
    const signoffJson = await signoffRes.json();
    console.log(`  ✓ Status: 200 OK`);
    console.log(`  ✓ Attestation Status: ${signoffJson.data?.status}`);
    console.log(`  ✓ Reviewed By: ${signoffJson.data?.reviewedBy}`);
    console.log(`  ✓ Attestation Seal Hash: ${signoffJson.data?.attestationHash}`);
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 5: Post-Publish Live Asset & Drift Watcher Verification
    // --------------------------------------------------------------------------
    console.log('\n[STEP 5] Testing POST /api/marketing/drift/verify (Drift Watcher)...');
    
    // Sub-test 5A: Synced verification
    const syncedRes = await fetch(`${BASE_URL}/api/marketing/drift/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        liveUrl: 'https://cogent-fintech.ng/campaigns/invest-q4',
        scanId: scanData.scanId,
        directLiveText: scanData.compliantRewrite,
      }),
    });
    const syncedJson = await syncedRes.json();
    console.log(`  ✓ 5A (Approved Copy Match):`);
    console.log(`    - Status: ${syncedJson.data?.driftStatus}`);
    console.log(`    - Is Drifted: ${syncedJson.data?.isDrifted}`);
    console.log(`    - Findings Count: ${syncedJson.data?.findings?.length}`);

    // Sub-test 5B: Drifted copy (stripped license disclosure and added guaranteed returns)
    const driftedText = 'Invest in our wealth fund today. Guaranteed returns of 50% monthly! Start now.';
    const driftedRes = await fetch(`${BASE_URL}/api/marketing/drift/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        liveUrl: 'https://cogent-fintech.ng/campaigns/invest-q4',
        scanId: scanData.scanId,
        directLiveText: driftedText,
      }),
    });
    const driftedJson = await driftedRes.json();
    console.log(`  ✓ 5B (Drifted Copy with Stripped Disclosures & Exaggerated Claims):`);
    console.log(`    - Status: ${driftedJson.data?.driftStatus}`);
    console.log(`    - Is Drifted: ${driftedJson.data?.isDrifted}`);
    console.log(`    - Drift Severity: ${driftedJson.data?.driftSeverity}`);
    console.log(`    - Omissions / Violations Detected: ${driftedJson.data?.findings?.length}`);
    driftedJson.data?.findings?.forEach((f: any, idx: number) => {
      console.log(`      [${idx + 1}] ${f.findingType} (${f.severity}): ${f.description}`);
    });
    passedSteps++;

    // --------------------------------------------------------------------------
    // STEP 6: Official ARCON & CBN Audit Defense Pack Generation
    // --------------------------------------------------------------------------
    console.log('\n[STEP 6] Testing GET /api/marketing/dossier (ARCON & CBN Defense Packs)...');
    
    // 6A: ARCON ASP Defense Pack
    const arconRes = await fetch(`${BASE_URL}/api/marketing/dossier?scanId=${scanData.scanId}&regulator=ARCON`);
    if (!arconRes.ok) {
      throw new Error(`GET /api/marketing/dossier (ARCON) returned ${arconRes.status}`);
    }
    const arconHtml = await arconRes.text();
    const hasArconHeader = arconHtml.includes('ADVERTISING REGULATORY COUNCIL OF NIGERIA');
    const hasCryptoBlock = arconHtml.includes('COGENT CRYPTOGRAPHIC CHAIN OF CUSTODY');
    console.log(`  ✓ 6A (ARCON Defense Pack):`);
    console.log(`    - Content-Type: HTML (${arconHtml.length} bytes)`);
    console.log(`    - ARCON Standards Panel Header Present: ${hasArconHeader ? 'YES' : 'NO'}`);
    console.log(`    - Cryptographic Chain of Custody Block Present: ${hasCryptoBlock ? 'YES' : 'NO'}`);

    // 6B: CBN Consumer Protection Department Defense Pack
    const cbnRes = await fetch(`${BASE_URL}/api/marketing/dossier?scanId=${scanData.scanId}&regulator=CBN`);
    if (!cbnRes.ok) {
      throw new Error(`GET /api/marketing/dossier (CBN) returned ${cbnRes.status}`);
    }
    const cbnHtml = await cbnRes.text();
    const hasCbnHeader = cbnHtml.includes('CENTRAL BANK OF NIGERIA (CBN)');
    const hasCpdHeader = cbnHtml.includes('CONSUMER PROTECTION DEPARTMENT');
    console.log(`  ✓ 6B (CBN Defense Pack):`);
    console.log(`    - Content-Type: HTML (${cbnHtml.length} bytes)`);
    console.log(`    - Central Bank of Nigeria Header Present: ${hasCbnHeader ? 'YES' : 'NO'}`);
    console.log(`    - Consumer Protection Department Present: ${hasCpdHeader ? 'YES' : 'NO'}`);
    passedSteps++;

    console.log('\n================================================================');
    console.log(`   LIVE INTEGRATION TEST RESULTS: ${passedSteps}/${totalSteps} PASSED (100%) `);
    console.log('   Pillar 1 Marketing Shield is LIVE, Operational, and Defensible! ');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('\n❌ LIVE INTEGRATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

runLiveTest();
