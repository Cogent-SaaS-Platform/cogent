import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { RegulatoryExtractionService } from '../src/modules/regulatory/services/regulatoryExtractionService';

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
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey);
const extractionService = new RegulatoryExtractionService();

// Benchmark instruments with authentic statutory text for high-fidelity extraction
const BENCHMARK_CORPUS = [
  {
    title: 'Guidelines on Contactless Payments in Nigeria',
    shortName: 'CBN Contactless Payments',
    regulatorCode: 'CBN',
    year: 2023,
    domain: 'FINTECH_PAYMENTS',
    instrumentType: 'GUIDELINE',
    cleanText: `
CENTRAL BANK OF NIGERIA
GUIDELINES ON CONTACTLESS PAYMENTS IN NIGERIA (2023)
REF: PSM/DIR/PUB/CIR/001/043

Section 1.0: Scope and Objectives
1.1 These Guidelines prescribe minimum operational, risk management, and consumer protection standards for contactless payment instruments and processing arrangements across Nigeria.
1.2 The provisions of these Guidelines apply to Deposit Money Banks, Other Financial Institutions, Payment Service Providers, Switching and Processing Companies, Card Schemes, Acquirers, and Merchants deploying contactless transaction terminals.

Section 2.0: Participant Roles and Governance
2.1 All financial institutions providing contactless payment products shall formulate, document, and implement an institutional Contactless Payments Governance Policy approved by the Board of Directors.
2.2 The institutional policy shall define risk appetite, transaction ceilings, fraud liability allocation models, and dispute resolution protocols in strict alignment with Central Bank of Nigeria prudential circulars.
2.3 Acquirers and Payment Terminal Service Providers (PTSPs) shall ensure that Point of Sale (PoS) terminals, ATMs, and merchant readers comply with EMVCo contactless standards and are certified by the National Central Switch (NIBSS).

Section 3.0: Transaction Limits and Two-Factor Authentication
3.1 Contactless transactions without customer two-factor verification (PIN or biometric confirmation) shall not exceed fifteen thousand Naira (₦15,000) per single transaction.
3.2 The cumulative daily contactless transaction limit without customer verification shall not exceed fifty thousand Naira (₦50,000) across all card and tokenized payment channels.
3.3 Any transaction exceeding the single transaction ceiling of ₦15,000 or the cumulative daily limit of ₦50,000 shall mandatorily require two-factor authentication before authorization and settlement.
3.4 Acquirers and issuers must provide customers with immediate real-time SMS or electronic push notifications for every contactless debit execution regardless of transaction amount.

Section 4.0: Risk Management and Fraud Liability
4.1 Issuers and acquirers shall deploy dynamic AI-driven fraud monitoring tools capable of identifying velocity anomalies and geolocation inconsistencies on contactless transactions in real time.
4.2 Where an unauthorized contactless payment occurs without two-factor authentication, the issuing institution or acquiring merchant shall bear full financial liability for customer reimbursement within forty-eight (48) hours of formal dispute lodgment.
4.3 Customers shall not bear financial loss for contactless transactions executed following formal notification to the bank of a lost, stolen, or compromised payment instrument.

Section 5.0: Supervisory Reporting and Enforcement Sanctions
5.1 All participating institutions shall submit monthly statutory returns on contactless transaction volumes, values, fraud incidents, and dispute resolution timeframes to the Director, Payments System Management Department, CBN, on or before the 10th day of the subsequent month.
5.2 Contravention of any provision of these Guidelines shall attract administrative sanctions, including monetary penalties not exceeding two million Naira (₦2,000,000) per infraction, and possible revocation of contactless processing approval under Section 65 of BOFIA 2020.
    `,
  },
  {
    title: 'SEC Directives on Targeted Financial Sanctions and Designated Persons',
    shortName: 'SEC AML/CFT Sanctions Directive',
    regulatorCode: 'SEC',
    year: 2024,
    domain: 'AML_CFT',
    instrumentType: 'DIRECTIVE',
    cleanText: `
SECURITIES AND EXCHANGE COMMISSION (SEC) NIGERIA
CAPITAL MARKET DIRECTIVES ON THE IMPLEMENTATION OF TARGETED FINANCIAL SANCTIONS
REF: SEC/AML/DIR/2024/02

Section 1.0: Statutory Purpose and Regulatory Jurisdiction
1.1 Pursuant to the Terrorism (Prevention and Prohibition) Act 2022, Money Laundering (Prevention and Prohibition) Act 2022, and SEC AML/CFT/CPF Regulations, this Directive establishes mandatory compliance obligations for all Capital Market Operators (CMOs) regarding United Nations Security Council Sanctions Lists and the Nigeria Consolidated National List.
1.2 This Directive applies to Broker-Dealers, Issuing Houses, Fund Managers, Custodians, Central Securities Depositories, and Digital Asset Exchanges operating within the Nigerian Capital Market.

Section 2.0: Screening Mandate and Automated Watchlist Ingestion
2.1 All Capital Market Operators shall implement automated screening software capable of screening client databases, beneficial owners, board members, and transaction counterparties against the UNSCR 1267/1989/2253 Committee Sanctions List and Nigeria National Designated Persons List.
2.2 Screening shall be performed immediately upon any update to the sanctions lists, prior to customer onboarding, and continuously on a real-time basis across all transactional orders.
2.3 Capital market operators shall maintain full audit trails of screening queries, false-positive resolution rationales, and positive match escalations for a minimum statutory retention period of five (5) years.

Section 3.0: Immediate Asset Freeze and Prohibition of Economic Resources
3.1 Every Capital Market Operator that identifies securities, investment portfolios, digital assets, or funds belonging to or controlled by a designated person or entity shall immediately and without prior notice freeze such assets within twenty-four (24) hours of designation.
3.2 No Capital Market Operator shall make available any investment asset, capital market instrument, dividend payment, or economic resource directly or indirectly to or for the benefit of any designated person or entity.
3.3 The asset freeze mandate applies to wholly owned assets, jointly owned holdings, and assets held by nominees or corporate proxies on behalf of designated persons.

Section 4.0: Mandatory Reporting to NFIU and SEC
4.1 Where an asset freeze is effected pursuant to this Directive, the Chief Compliance Officer shall file a Suspicious Transaction Report (STR) and written notification to the Nigerian Financial Intelligence Unit (NFIU) and the Securities and Exchange Commission within twenty-four (24) hours of the action.
4.2 Filing of nil returns is mandatory: every Capital Market Operator shall file a monthly nil confirmation to the Commission where no designated persons or matching assets are identified during the preceding month.

Section 5.0: Penalties for Non-Compliance and Personal Liability
5.1 Any Capital Market Operator that fails to freeze designated assets, fails to conduct required screening, or provides economic resources to designated entities commits a serious regulatory offense and shall be liable to an administrative penalty of not less than ten million Naira (₦10,000,000).
5.2 In addition to corporate fines, the Principal Officers, including the Chief Executive Officer and Chief Compliance Officer, may be disqualified from holding key managerial positions in the capital market and may face criminal referral to the Attorney-General of the Federation under Section 54 of the TPPA 2022.
    `,
  },
];

async function main() {
  console.log('=== Cogent Sovereign RegTech: Benchmark Re-Extraction Pipeline ===');

  for (const benchmark of BENCHMARK_CORPUS) {
    console.log(`\nProcessing: "${benchmark.title}" (${benchmark.regulatorCode})`);

    try {
      // 1. Synthesize and decompose with AI
      console.log('  -> Invoking RegulatoryExtractionService...');
      const extraction = await extractionService.extractRegulationAndObligations({
        cleanText: benchmark.cleanText,
        title: benchmark.title,
        regulatorCode: benchmark.regulatorCode,
        year: benchmark.year,
      });

      console.log(`  -> Extraction complete: ${extraction.sections.length} sections, ${extraction.obligations.length} obligations, ${extraction.keyRequirementAreas.length} requirement areas.`);

      // 2. Persist to Supabase
      console.log('  -> Persisting to Supabase relational tables...');
      const result = await extractionService.persistExtractedInstrument(db, {
        title: benchmark.title,
        regulatorCode: benchmark.regulatorCode,
        capturedText: benchmark.cleanText,
        extracted: extraction,
        owner: 'Chief Compliance Officer',
      });

      console.log(`  -> Successfully persisted! Instrument ID: ${result.instrumentId}, Sections: ${result.sectionsCount}, Obligations: ${result.obligationsCount}`);
    } catch (err: any) {
      console.error(`  -> Failed extracting ${benchmark.title}:`, err.message);
    }
  }

  console.log('\n=== Re-Extraction Complete ===');
}

main().catch(console.error);
