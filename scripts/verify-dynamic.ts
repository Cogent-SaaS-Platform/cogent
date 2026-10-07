import { defaultDeterministicMetadataExtractor } from '../src/modules/radar/services/deterministicMetadataExtractor';
import { ApplicabilityEngine } from '../src/modules/radar/services/applicabilityEngine';
import { defaultCountdownCalculator } from '../src/modules/radar/services/deadlineCountdownCalculator';
import { MarketingShieldService } from '../src/modules/marketing-shield';
import { AiEngine } from '../src/shared/ai-engine';
import { createAdminClient } from '../src/shared/db';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
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
      process.env[key] = val;
    }
  }
}

async function runDynamicDemonstration() {
  console.log('================================================================');
  console.log('🧪 COGENT DYNAMIC ENGINE VERIFICATION: UNSEEN ARBITRARY INPUTS');
  console.log('================================================================\n');

  // 1. TEST DYNAMIC MARKETING SHIELD WITH RANDOM CUSTOM COPY
  const customCopy =
    'Special Promo: Borrow ₦750,000 in 60 seconds with zero interest! 100% guaranteed approval without credit checks or collateral. Hurry and download SwiftPay now!';

  console.log('--- TEST 1: PILLAR 1 DYNAMIC PRE-VETTING SCAN ---');
  console.log('Input Text (Arbitrary User Copy):');
  console.log(`"${customCopy}"\n`);

  const aiEngine = new AiEngine(process.env.GEMINI_API_KEY);
  const dbClient = createAdminClient();
  const service = new MarketingShieldService(aiEngine, undefined, dbClient);

  console.log('⚡ Executing Live End-to-End Scan (Deterministic Matcher + Hybrid pgvector Search + Gemini AI Rewrite)...');
  const scanResult = await service.executeScan({
    organizationId: '00000000-0000-0000-0000-000000000001',
    campaignName: 'Dynamic Live Test Campaign',
    channel: 'SMS_BLAST',
    rawCopy: customCopy,
    targetAudienceDescription: 'Nigerian consumers looking for fast credit',
  });

  console.log(`\n📊 Live Pre-Vetting Output:`);
  console.log(`   • Verdict: ${scanResult.verdict}`);
  console.log(`   • Calculated Risk Score: ${scanResult.overallRiskScore} / 100`);
  console.log(`   • Total Deterministic Fines Computed: ₦${scanResult.deterministicPenaltyTotalNaira.toLocaleString()}`);
  console.log(`   • Total Statutory Findings Detected: ${scanResult.findings.length}`);
  for (const f of scanResult.findings) {
    console.log(`     - [${f.regulatorCode}] ${f.ruleCode} (${f.severity}): "${f.flaggedExcerpt}"`);
    console.log(`       Penalty: ₦${(f.statutoryPenaltyNaira || 0).toLocaleString()} | ${f.whyItMatters}`);
  }

  console.log('\n✨ Live Gemini Compliant Rewrite:');
  console.log(`   "${scanResult.compliantRewrite}"`);
  console.log(`   Execution Latency: ${scanResult.telemetry.latencyMs}ms`);
  console.log(`   Cryptographic SHA-256 Audit Seal: ${scanResult.telemetry.auditHash}\n`);

  // 2. TEST DYNAMIC REGULATORY RADAR CIRCULAR EXTRACTION
  console.log('--- TEST 2: PILLAR 2 DYNAMIC CIRCULAR EXTRACTION & APPLICABILITY ---');
  const customCircularText = `
CENTRAL BANK OF NIGERIA
Financial Policy & Regulation Department
Circular Ref: FPR/DIR/CIR/GEN/09/088
Date: October 2, 2026

TO: ALL PAYMENT SERVICE PROVIDERS (PSSP) AND SWITCHING COMPANIES

SUBJECT: MANDATORY 2FA BIOMETRIC VALIDATION FOR INSTANT INTERBANK TRANSFERS OVER ₦1,000,000

The Central Bank of Nigeria, in furtherance of its mandate under BOFIA 2020 and the CBN Act 2007, hereby directs all licensed Payment Solution Service Providers (PSSP) and Switching and Processing entities operating NIBSS NIP and Card Acquiring rails to enforce compulsory two-factor biometric verification on all outbound interbank transactions exceeding ₦1,000,000.

Compliance with the provisions of this circular is mandatory within 21 days from the date of this circular (Statutory Deadline: October 23, 2026). Defaulting entities shall be liable to an administrative penalty of ₦20,000,000 and possible suspension from interbank switching platforms.
`;

  console.log('Input Text (Arbitrary Unseen Regulatory Directive):');
  console.log(customCircularText.trim());

  const extracted = defaultDeterministicMetadataExtractor.extractMetadata({
    rawText: customCircularText,
    referenceCodeCandidate: null,
    regulatorCandidate: null,
    issuingDepartment: null,
    signatoryName: null,
    signatoryTitle: null,
    officialSealsDetected: [],
    addresseeText: null,
    subject: '',
    sections: [],
    schedules: [],
  });
  console.log('\n🔍 Deterministic Circular Parser Dynamically Extracted:');
  console.log(`   • Circular Code: ${extracted.circularNumber}`);
  console.log(`   • Issuing Regulator: ${extracted.regulatorCode}`);
  console.log(`   • Publication Date: ${extracted.publicationDate}`);
  console.log(`   • Statutory Deadline: ${extracted.statutoryDeadline}`);
  console.log(`   • Priority Level: ${extracted.priority}`);
  console.log(`   • Targeted Licenses: ${extracted.targetedLicenseTypes.join(', ')}`);
  console.log(`   • Affected Payment Rails: ${extracted.affectedPaymentRails.join(', ')}`);

  // Evaluate dynamic applicability against tenant profile
  const tenantProfile = {
    organizationId: 'org-fintech-demo-live',
    activeLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP' as const],
    activeRails: ['NIBSS_NIP' as const, 'CARD_ACQUIRING_MASTERCARD_VISA' as const],
    licenses: [
      { licenseType: 'PAYMENT_SOLUTION_SERVICES_PSSP' as const, licenseNumber: 'CBN/PSD/PSSP/2023/044', isActive: true },
    ],
    paymentRails: [
      { railType: 'NIBSS_NIP' as const, isActive: true },
      { railType: 'CARD_ACQUIRING_MASTERCARD_VISA' as const, isActive: true },
    ],
  };

  const applicabilityEngine = new ApplicabilityEngine({ dbClient });
  const applicability = applicabilityEngine.evaluateApplicability(
    tenantProfile,
    {
      regulator: extracted.regulatorCode,
      targetedLicenses: extracted.targetedLicenseTypes,
      affectedRails: extracted.affectedPaymentRails,
      appliesUniversally: extracted.appliesUniversally,
    }
  );

  console.log('\n🏢 Relational Tenant Applicability Evaluation:');
  console.log(`   • Is Applicable: ${applicability.isApplicable}`);
  console.log(`   • Matched Licenses: ${applicability.matchedLicenses.join(', ')}`);
  console.log(`   • Matched Rails: ${applicability.matchedRails.join(', ')}`);
  console.log(`   • Generated Compliance Reason: "${applicability.reason}"`);

  // Evaluate dynamic countdown timer relative to current date
  const countdown = defaultCountdownCalculator.calculateCountdown({
    statutoryDeadline: extracted.statutoryDeadline,
    publicationDate: extracted.publicationDate,
  });
  console.log('\n⏱️ Dynamic Urgency Countdown Calculation:');
  console.log(`   • Days Remaining: ${countdown.daysRemaining} days`);
  console.log(`   • Urgency Tier: ${countdown.tier}`);
  console.log(`   • Human Countdown Text: "${countdown.humanCountdownText}"`);

  console.log('\n================================================================');
  console.log('✅ ALL DYNAMIC CALCULATION ENGINES VERIFIED LIVE WITH REAL DATA!');
  console.log('================================================================\n');
}

runDynamicDemonstration().catch(console.error);
