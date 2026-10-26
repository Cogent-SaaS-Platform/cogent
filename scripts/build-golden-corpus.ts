import fs from 'fs';
import path from 'path';
import { LicenseType, PaymentRail, RegulatorCode, ObligationType } from '../src/shared/types';

export interface GroundTruthObligation {
  obligation_id: string;
  verbatim_quote: string;
  character_span_start: number;
  character_span_end: number;
  actor: string;
  action: string;
  target_object: string;
  condition: string | null;
  deadline_text: string | null;
  obligation_type: ObligationType;
  statutory_penalty: {
    amount_naira: number | null;
    daily_fine_naira: number | null;
    citation: string | null;
  } | null;
  applicable_licenses: LicenseType[];
  applicable_rails: PaymentRail[];
}

export interface GoldenBenchmarkInstrument {
  id: string;
  regulator: RegulatorCode;
  title: string;
  circular_reference: string;
  published_date: string;
  raw_text: string;
  canonical_source_url: string;
  applicable_licenses: LicenseType[];
  applicable_rails: PaymentRail[];
  ground_truth_obligations: GroundTruthObligation[];
}

interface RawInstrumentDef {
  id: string;
  regulator: RegulatorCode;
  title: string;
  circular_reference: string;
  published_date: string;
  raw_text: string;
  canonical_source_url: string;
  applicable_licenses: LicenseType[];
  applicable_rails: PaymentRail[];
  obligations: {
    obligation_id: string;
    verbatim_quote: string;
    actor: string;
    action: string;
    target_object: string;
    condition: string | null;
    deadline_text: string | null;
    obligation_type: ObligationType;
    statutory_penalty: {
      amount_naira: number | null;
      daily_fine_naira: number | null;
      citation: string | null;
    } | null;
    applicable_licenses: LicenseType[];
    applicable_rails: PaymentRail[];
  }[];
}

const rawDefinitions: RawInstrumentDef[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CBN DIRECTIVES (6)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'cbn-contactless-2023',
    regulator: 'CBN',
    title: 'Guidelines on Contactless Payments in Nigeria',
    circular_reference: 'PSM/DIR/CON/CWS/08/014',
    published_date: '2023-06-27',
    canonical_source_url: 'https://www.cbn.gov.ng/out/2023/psmd/guidelines_on_contactless_payments.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'PAYMENT_SERVICE_BANK', 'SWITCHING_AND_PROCESSING', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
    applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'CARD_ACQUIRING_VERVE', 'NIBSS_NIP'],
    raw_text: `CENTRAL BANK OF NIGERIA
GUIDELINES ON CONTACTLESS PAYMENTS IN NIGERIA
Ref: PSM/DIR/CON/CWS/08/014

Section 2.1 Transaction Limits and Authentication
All deposit money banks and payment service providers shall ensure that contactless payments made through point-of-sale terminals without customer verification methods shall not exceed ₦50,000 per transaction and a cumulative daily limit of ₦100,000. Where transactions exceed ₦50,000, two-factor authentication or biometric verification must be obtained.

Section 4.3 Daily Reporting and Settlement
Acquiring institutions shall transmit daily contactless settlement reports to NIBSS no later than 23:59 WAT on each business day. Failure to comply attracts a statutory penalty of ₦10,000,000 under Section 52(2) of BOFIA 2020.`,
    obligations: [
      {
        obligation_id: 'cbn-cont-001',
        verbatim_quote: 'All deposit money banks and payment service providers shall ensure that contactless payments made through point-of-sale terminals without customer verification methods shall not exceed ₦50,000 per transaction and a cumulative daily limit of ₦100,000.',
        actor: 'All deposit money banks and payment service providers',
        action: 'shall ensure',
        target_object: 'contactless payments made through point-of-sale terminals without customer verification methods shall not exceed ₦50,000 per transaction and a cumulative daily limit of ₦100,000',
        condition: 'without customer verification methods',
        deadline_text: null,
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK'],
        applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'CARD_ACQUIRING_VERVE'],
      },
      {
        obligation_id: 'cbn-cont-002',
        verbatim_quote: 'Where transactions exceed ₦50,000, two-factor authentication or biometric verification must be obtained.',
        actor: 'Acquiring Banks and Merchants',
        action: 'must be obtained',
        target_object: 'two-factor authentication or biometric verification',
        condition: 'Where transactions exceed ₦50,000',
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK'],
        applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'CARD_ACQUIRING_VERVE'],
      },
      {
        obligation_id: 'cbn-cont-003',
        verbatim_quote: 'Acquiring institutions shall transmit daily contactless settlement reports to NIBSS no later than 23:59 WAT on each business day.',
        actor: 'Acquiring institutions',
        action: 'shall transmit',
        target_object: 'daily contactless settlement reports to NIBSS',
        condition: null,
        deadline_text: 'no later than 23:59 WAT on each business day',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: {
          amount_naira: 10000000,
          daily_fine_naira: null,
          citation: 'Section 52(2) of BOFIA 2020',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'cbn-mobile-money-2021',
    regulator: 'CBN',
    title: 'Regulatory Framework for Mobile Money Services in Nigeria',
    circular_reference: 'BPS/DIR/GEN/CIR/05/011',
    published_date: '2021-07-09',
    canonical_source_url: 'https://www.cbn.gov.ng/out/2021/bpsd/mobile_money_framework.pdf',
    applicable_licenses: ['MOBILE_MONEY_OPERATOR_MMO', 'PAYMENT_SERVICE_BANK'],
    applicable_rails: ['USSD', 'NIBSS_NIP', 'AGENT_BANKING_CASH_IN_OUT'],
    raw_text: `CENTRAL BANK OF NIGERIA
REGULATORY FRAMEWORK FOR MOBILE MONEY SERVICES IN NIGERIA
Circular Ref: BPS/DIR/GEN/CIR/05/011

Section 3.4 Pool Account Maintenance and Trust Protections
Licensed Mobile Money Operators must maintain 100% of all customer deposit balances in dedicated statutory pool accounts with licensed commercial banks. Under no circumstances shall an MMO pledge, encumber, or invest customer pool balances in non-sovereign debt instruments.

Section 8.1 Periodic Compliance Filing
Mobile Money Operators shall file quarterly audited trust account reconciliations with the Payments System Management Department within fifteen (15) calendar days following each calendar quarter. Default in filing attracts a mandatory fine of ₦5,000,000 pursuant to Section 64 of BOFIA 2020.`,
    obligations: [
      {
        obligation_id: 'cbn-mmo-001',
        verbatim_quote: 'Licensed Mobile Money Operators must maintain 100% of all customer deposit balances in dedicated statutory pool accounts with licensed commercial banks.',
        actor: 'Licensed Mobile Money Operators',
        action: 'must maintain',
        target_object: '100% of all customer deposit balances in dedicated statutory pool accounts with licensed commercial banks',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['MOBILE_MONEY_OPERATOR_MMO'],
        applicable_rails: ['USSD', 'NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-mmo-002',
        verbatim_quote: 'Under no circumstances shall an MMO pledge, encumber, or invest customer pool balances in non-sovereign debt instruments.',
        actor: 'MMO',
        action: 'shall not pledge, encumber, or invest',
        target_object: 'customer pool balances in non-sovereign debt instruments',
        condition: null,
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['MOBILE_MONEY_OPERATOR_MMO'],
        applicable_rails: ['USSD'],
      },
      {
        obligation_id: 'cbn-mmo-003',
        verbatim_quote: 'Mobile Money Operators shall file quarterly audited trust account reconciliations with the Payments System Management Department within fifteen (15) calendar days following each calendar quarter.',
        actor: 'Mobile Money Operators',
        action: 'shall file',
        target_object: 'quarterly audited trust account reconciliations with the Payments System Management Department',
        condition: null,
        deadline_text: 'within fifteen (15) calendar days following each calendar quarter',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: {
          amount_naira: 5000000,
          daily_fine_naira: null,
          citation: 'Section 64 of BOFIA 2020',
        },
        applicable_licenses: ['MOBILE_MONEY_OPERATOR_MMO'],
        applicable_rails: ['AGENT_BANKING_CASH_IN_OUT'],
      },
    ],
  },
  {
    id: 'cbn-open-banking-2023',
    regulator: 'CBN',
    title: 'Operational Guidelines on Open Banking in Nigeria',
    circular_reference: 'PSM/DIR/PUB/CIR/001/042',
    published_date: '2023-03-07',
    canonical_source_url: 'https://www.cbn.gov.ng/out/2023/psmd/open_banking_guidelines.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SOLUTION_SERVICES_PSSP', 'SWITCHING_AND_PROCESSING'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `CENTRAL BANK OF NIGERIA
OPERATIONAL GUIDELINES ON OPEN BANKING IN NIGERIA
Ref: PSM/DIR/PUB/CIR/001/042

Section 5.2 Customer Explicit Consent Requirements
Participants in the Open Banking Registry shall obtain explicit, granular, and revocable customer consent prior to accessing customer transaction history or initiating payments through application programming interfaces. Consent tokens must expire after ninety (90) days unless affirmatively renewed.

Section 9.1 Data Security Architecture and TLS Encryption
All Open Banking API endpoints shall enforce TLS 1.3 encryption and mutual authentication via digital certificates issued by a trusted certificate authority approved by the Central Bank of Nigeria.`,
    obligations: [
      {
        obligation_id: 'cbn-ob-001',
        verbatim_quote: 'Participants in the Open Banking Registry shall obtain explicit, granular, and revocable customer consent prior to accessing customer transaction history or initiating payments through application programming interfaces.',
        actor: 'Participants in the Open Banking Registry',
        action: 'shall obtain',
        target_object: 'explicit, granular, and revocable customer consent prior to accessing customer transaction history or initiating payments through application programming interfaces',
        condition: 'prior to accessing customer transaction history or initiating payments',
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-ob-002',
        verbatim_quote: 'Consent tokens must expire after ninety (90) days unless affirmatively renewed.',
        actor: 'API Providers and Consumers',
        action: 'must expire',
        target_object: 'Consent tokens after ninety (90) days',
        condition: 'unless affirmatively renewed',
        deadline_text: 'after ninety (90) days',
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-ob-003',
        verbatim_quote: 'All Open Banking API endpoints shall enforce TLS 1.3 encryption and mutual authentication via digital certificates issued by a trusted certificate authority approved by the Central Bank of Nigeria.',
        actor: 'All Open Banking API endpoints',
        action: 'shall enforce',
        target_object: 'TLS 1.3 encryption and mutual authentication via digital certificates issued by a trusted certificate authority approved by the Central Bank of Nigeria',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'cbn-cybersecurity-ofi-2022',
    regulator: 'CBN',
    title: 'Guidelines on Cybersecurity for Other Financial Institutions',
    circular_reference: 'OFI/DIR/CIR/GEN/02/019',
    published_date: '2022-10-18',
    canonical_source_url: 'https://www.cbn.gov.ng/out/2022/ofid/cybersecurity_guidelines_ofi.pdf',
    applicable_licenses: ['MICROFINANCE_BANK_NATIONAL', 'MICROFINANCE_BANK_STATE', 'FINANCE_COMPANY'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `CENTRAL BANK OF NIGERIA
GUIDELINES ON CYBERSECURITY FOR OTHER FINANCIAL INSTITUTIONS
Circular Ref: OFI/DIR/CIR/GEN/02/019

Section 3.1 Chief Information Security Officer Appointment
Every licensed Other Financial Institution must appoint a qualified Chief Information Security Officer dedicated to overseeing cyber risk governance. The appointment shall be communicated in writing to the Director of OFISD within thirty (30) days of selection.

Section 6.4 Incident Notification Deadlines
All OFIs shall report cyber incidents of critical or high severity to the CBN CSIRT and OFISD within twenty-four (24) hours of detection. Failure to notify within the statutory window attracts an administrative fine of ₦2,500,000 under Section 66 of BOFIA 2020.`,
    obligations: [
      {
        obligation_id: 'cbn-cyber-001',
        verbatim_quote: 'Every licensed Other Financial Institution must appoint a qualified Chief Information Security Officer dedicated to overseeing cyber risk governance.',
        actor: 'Every licensed Other Financial Institution',
        action: 'must appoint',
        target_object: 'a qualified Chief Information Security Officer dedicated to overseeing cyber risk governance',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['MICROFINANCE_BANK_NATIONAL', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-cyber-002',
        verbatim_quote: 'The appointment shall be communicated in writing to the Director of OFISD within thirty (30) days of selection.',
        actor: 'Licensed Other Financial Institution',
        action: 'shall be communicated in writing',
        target_object: 'to the Director of OFISD',
        condition: null,
        deadline_text: 'within thirty (30) days of selection',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['MICROFINANCE_BANK_NATIONAL', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-cyber-003',
        verbatim_quote: 'All OFIs shall report cyber incidents of critical or high severity to the CBN CSIRT and OFISD within twenty-four (24) hours of detection.',
        actor: 'All OFIs',
        action: 'shall report',
        target_object: 'cyber incidents of critical or high severity to the CBN CSIRT and OFISD',
        condition: 'of critical or high severity',
        deadline_text: 'within twenty-four (24) hours of detection',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: {
          amount_naira: 2500000,
          daily_fine_naira: null,
          citation: 'Section 66 of BOFIA 2020',
        },
        applicable_licenses: ['MICROFINANCE_BANK_NATIONAL', 'MICROFINANCE_BANK_STATE', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'cbn-vasp-cdd-2023',
    regulator: 'CBN',
    title: 'Customer Due Diligence Regulations for Virtual Asset Service Providers',
    circular_reference: 'FPR/DIR/PUB/CIR/002/003',
    published_date: '2023-12-22',
    canonical_source_url: 'https://www.cbn.gov.ng/out/2023/fprd/vasp_customer_due_diligence_regulations.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'CRYPTO_VASP_SEC_APPROVED'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `CENTRAL BANK OF NIGERIA
CUSTOMER DUE DILIGENCE REGULATIONS FOR VIRTUAL ASSET SERVICE PROVIDERS
Ref: FPR/DIR/PUB/CIR/002/003

Section 4.1 Prohibition on Direct Proprietary Trading
Financial institutions shall not hold, trade, or invest in virtual assets for their own accounts or maintain proprietary balance sheet exposure to cryptocurrencies.

Section 7.2 Settlement Account Monitoring and Sanctions
Banks maintaining settlement accounts for licensed VASPs shall monitor account inflows and flag any transaction originating from unverified self-hosted wallets exceeding $1,000 equivalent. Unsanctioned facilitation attracts revocation of banking privileges and a penalty of ₦20,000,000 under the Money Laundering (Prevention and Prohibition) Act 2022.`,
    obligations: [
      {
        obligation_id: 'cbn-vasp-001',
        verbatim_quote: 'Financial institutions shall not hold, trade, or invest in virtual assets for their own accounts or maintain proprietary balance sheet exposure to cryptocurrencies.',
        actor: 'Financial institutions',
        action: 'shall not hold, trade, or invest',
        target_object: 'in virtual assets for their own accounts or maintain proprietary balance sheet exposure to cryptocurrencies',
        condition: 'for their own accounts',
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-vasp-002',
        verbatim_quote: 'Banks maintaining settlement accounts for licensed VASPs shall monitor account inflows and flag any transaction originating from unverified self-hosted wallets exceeding $1,000 equivalent.',
        actor: 'Banks maintaining settlement accounts for licensed VASPs',
        action: 'shall monitor',
        target_object: 'account inflows and flag any transaction originating from unverified self-hosted wallets exceeding $1,000 equivalent',
        condition: 'exceeding $1,000 equivalent',
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: {
          amount_naira: 20000000,
          daily_fine_naira: null,
          citation: 'Money Laundering (Prevention and Prohibition) Act 2022',
        },
        applicable_licenses: ['COMMERCIAL_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'cbn-sandbox-framework-2021',
    regulator: 'CBN',
    title: 'Framework for Regulatory Sandbox Operations',
    circular_reference: 'FPR/DIR/CIR/GEN/07/040',
    published_date: '2021-01-12',
    canonical_source_url: 'https://www.cbn.gov.ng/out/2021/fprd/sandbox_framework.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SOLUTION_SERVICES_PSSP', 'FINANCE_COMPANY'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `CENTRAL BANK OF NIGERIA
FRAMEWORK FOR REGULATORY SANDBOX OPERATIONS
Ref: FPR/DIR/CIR/GEN/07/040

Section 5.3 Exit Protocol and Customer Notification
Sandbox participants must notify all cohort test customers in writing at least thirty (30) days prior to the expiration or termination of testing operations. All customer funds held in escrow must be fully liquidated and refunded without deduction within seven (7) business days of exit.`,
    obligations: [
      {
        obligation_id: 'cbn-sbx-001',
        verbatim_quote: 'Sandbox participants must notify all cohort test customers in writing at least thirty (30) days prior to the expiration or termination of testing operations.',
        actor: 'Sandbox participants',
        action: 'must notify',
        target_object: 'all cohort test customers in writing',
        condition: null,
        deadline_text: 'at least thirty (30) days prior to the expiration or termination of testing operations',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'cbn-sbx-002',
        verbatim_quote: 'All customer funds held in escrow must be fully liquidated and refunded without deduction within seven (7) business days of exit.',
        actor: 'Sandbox participants',
        action: 'must be fully liquidated and refunded',
        target_object: 'All customer funds held in escrow without deduction',
        condition: null,
        deadline_text: 'within seven (7) business days of exit',
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: null,
        applicable_licenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SEC DIRECTIVES (4)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'sec-digital-assets-2022',
    regulator: 'SEC',
    title: 'Rules on Issuance, Offering Platforms and Custody of Digital Assets',
    circular_reference: 'SEC/RULES/DAOP/2022/01',
    published_date: '2022-05-13',
    canonical_source_url: 'https://sec.gov.ng/rules-on-digital-assets-issuance-and-platforms/',
    applicable_licenses: ['CRYPTO_VASP_SEC_APPROVED', 'SEC_REGISTERED_DIGITAL_SUB_BROKER'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `SECURITIES AND EXCHANGE COMMISSION NIGERIA
RULES ON DIGITAL ASSETS OFFERING PLATFORMS (DAOP)
Ref: SEC/RULES/DAOP/2022/01

Part B, Rule 13.1 Minimum Paid-Up Capital and Fidelity Bond
A Digital Asset Offering Platform operator shall maintain a minimum paid-up capital of ₦500,000,000 and maintain a valid fidelity bond covering at least 25% of the platform paid-up capital. Failure to maintain required capital attracts a statutory penalty of ₦10,000,000 under Section 303 of the Investments and Securities Act 2007.

Part C, Rule 21.4 Custodial Segregation of Client Assets
Operators of digital asset custodial wallets must segregate client cryptographic assets completely from the proprietary balance sheet of the platform and store at least 90% of aggregate client assets in multi-signature cold storage vaults.`,
    obligations: [
      {
        obligation_id: 'sec-daop-001',
        verbatim_quote: 'A Digital Asset Offering Platform operator shall maintain a minimum paid-up capital of ₦500,000,000 and maintain a valid fidelity bond covering at least 25% of the platform paid-up capital.',
        actor: 'A Digital Asset Offering Platform operator',
        action: 'shall maintain',
        target_object: 'a minimum paid-up capital of ₦500,000,000 and maintain a valid fidelity bond covering at least 25% of the platform paid-up capital',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: {
          amount_naira: 10000000,
          daily_fine_naira: null,
          citation: 'Section 303 of the Investments and Securities Act 2007',
        },
        applicable_licenses: ['CRYPTO_VASP_SEC_APPROVED'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'sec-daop-002',
        verbatim_quote: 'Operators of digital asset custodial wallets must segregate client cryptographic assets completely from the proprietary balance sheet of the platform and store at least 90% of aggregate client assets in multi-signature cold storage vaults.',
        actor: 'Operators of digital asset custodial wallets',
        action: 'must segregate',
        target_object: 'client cryptographic assets completely from the proprietary balance sheet of the platform and store at least 90% of aggregate client assets in multi-signature cold storage vaults',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['CRYPTO_VASP_SEC_APPROVED'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'sec-robo-advisory-2021',
    regulator: 'SEC',
    title: 'Rules on Robo-Advisory Services in Nigeria',
    circular_reference: 'SEC/RULES/ROBO/2021/04',
    published_date: '2021-08-30',
    canonical_source_url: 'https://sec.gov.ng/rules-on-robo-advisory-services/',
    applicable_licenses: ['SEC_REGISTERED_ROBO_ADVISOR'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `SECURITIES AND EXCHANGE COMMISSION NIGERIA
RULES ON ROBO-ADVISORY SERVICES IN NIGERIA
Ref: SEC/RULES/ROBO/2021/04

Rule 4.2 Algorithm Governance and Backtesting
Robo-advisers must conduct regular backtesting of algorithmic models prior to deployment and maintain an audit log of all model modifications for at least seven (7) years. Algorithmic logic shall not discriminate against retail investors or route orders to affiliated market makers without best execution verification.`,
    obligations: [
      {
        obligation_id: 'sec-robo-001',
        verbatim_quote: 'Robo-advisers must conduct regular backtesting of algorithmic models prior to deployment and maintain an audit log of all model modifications for at least seven (7) years.',
        actor: 'Robo-advisers',
        action: 'must conduct',
        target_object: 'regular backtesting of algorithmic models prior to deployment and maintain an audit log of all model modifications for at least seven (7) years',
        condition: 'prior to deployment',
        deadline_text: 'for at least seven (7) years',
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['SEC_REGISTERED_ROBO_ADVISOR'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'sec-robo-002',
        verbatim_quote: 'Algorithmic logic shall not discriminate against retail investors or route orders to affiliated market makers without best execution verification.',
        actor: 'Robo-advisers',
        action: 'shall not discriminate',
        target_object: 'against retail investors or route orders to affiliated market makers without best execution verification',
        condition: 'without best execution verification',
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['SEC_REGISTERED_ROBO_ADVISOR'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'sec-crowdfunding-2021',
    regulator: 'SEC',
    title: 'Regulatory Framework for Crowdfunding in Nigeria',
    circular_reference: 'SEC/RULES/CF/2021/01',
    published_date: '2021-01-21',
    canonical_source_url: 'https://sec.gov.ng/regulatory-framework-for-crowdfunding/',
    applicable_licenses: ['SEC_REGISTERED_DIGITAL_SUB_BROKER'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `SECURITIES AND EXCHANGE COMMISSION NIGERIA
REGULATORY FRAMEWORK FOR CROWDFUNDING
Ref: SEC/RULES/CF/2021/01

Rule 7.1 Retail Investor Investment Limits
A Crowdfunding Intermediary shall ensure that retail investors do not invest more than ten percent (10%) of their annual income in crowdfunding offerings across all platforms within any calendar year.`,
    obligations: [
      {
        obligation_id: 'sec-cf-001',
        verbatim_quote: 'A Crowdfunding Intermediary shall ensure that retail investors do not invest more than ten percent (10%) of their annual income in crowdfunding offerings across all platforms within any calendar year.',
        actor: 'A Crowdfunding Intermediary',
        action: 'shall ensure',
        target_object: 'that retail investors do not invest more than ten percent (10%) of their annual income in crowdfunding offerings across all platforms within any calendar year',
        condition: null,
        deadline_text: 'within any calendar year',
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['SEC_REGISTERED_DIGITAL_SUB_BROKER'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'sec-sub-broker-2021',
    regulator: 'SEC',
    title: 'Rules on Digital and FinTech Sub-Brokers in Nigeria',
    circular_reference: 'SEC/RULES/SB/2021/02',
    published_date: '2021-04-22',
    canonical_source_url: 'https://sec.gov.ng/rules-on-sub-brokers-digital/',
    applicable_licenses: ['SEC_REGISTERED_DIGITAL_SUB_BROKER'],
    applicable_rails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
    raw_text: `SECURITIES AND EXCHANGE COMMISSION NIGERIA
RULES ON DIGITAL SUB-BROKERS
Ref: SEC/RULES/SB/2021/02

Rule 3.3 Integration with Registered Sponsoring Brokers
Digital sub-brokers operating mobile applications shall execute all secondary market equity trades through a registered sponsoring broker-dealer licensed by the Commission and member of the Nigerian Exchange Group. Digital sub-brokers are strictly prohibited from holding client securities in proprietary custody.`,
    obligations: [
      {
        obligation_id: 'sec-sb-001',
        verbatim_quote: 'Digital sub-brokers operating mobile applications shall execute all secondary market equity trades through a registered sponsoring broker-dealer licensed by the Commission and member of the Nigerian Exchange Group.',
        actor: 'Digital sub-brokers operating mobile applications',
        action: 'shall execute',
        target_object: 'all secondary market equity trades through a registered sponsoring broker-dealer licensed by the Commission and member of the Nigerian Exchange Group',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['SEC_REGISTERED_DIGITAL_SUB_BROKER'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'sec-sb-002',
        verbatim_quote: 'Digital sub-brokers are strictly prohibited from holding client securities in proprietary custody.',
        actor: 'Digital sub-brokers',
        action: 'are strictly prohibited from holding',
        target_object: 'client securities in proprietary custody',
        condition: null,
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['SEC_REGISTERED_DIGITAL_SUB_BROKER'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. NDPC DIRECTIVES (4)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ndpc-major-importance-2023',
    regulator: 'NDPC',
    title: 'Directives on Designation and Registration of Data Controllers of Major Importance',
    circular_reference: 'NDPA/DIR/2023/001',
    published_date: '2023-09-14',
    canonical_source_url: 'https://ndpc.gov.ng/notices/major_importance_registration.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK', 'SWITCHING_AND_PROCESSING', 'MICROFINANCE_BANK_NATIONAL', 'DIGITAL_LENDER_FCCPC_REGISTERED'],
    applicable_rails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
    raw_text: `NIGERIA DATA PROTECTION COMMISSION (NDPC)
DIRECTIVES ON DATA CONTROLLERS AND PROCESSORS OF MAJOR IMPORTANCE
Ref: NDPA/DIR/2023/001

Section 3.1 Mandatory Registration of Major Data Processors
Every financial institution, bank, payment gateway, and digital lender processing personal data of more than 10,000 data subjects within six months shall register with the Nigeria Data Protection Commission as a Data Controller of Major Importance. Failure to register within ninety (90) days of crossing the threshold constitutes an infraction attracting a statutory penalty of ₦10,000,000 or 2% of annual gross revenue under Section 48 of the NDPA 2023.`,
    obligations: [
      {
        obligation_id: 'ndpc-maj-001',
        verbatim_quote: 'Every financial institution, bank, payment gateway, and digital lender processing personal data of more than 10,000 data subjects within six months shall register with the Nigeria Data Protection Commission as a Data Controller of Major Importance.',
        actor: 'Every financial institution, bank, payment gateway, and digital lender processing personal data of more than 10,000 data subjects within six months',
        action: 'shall register',
        target_object: 'with the Nigeria Data Protection Commission as a Data Controller of Major Importance',
        condition: 'processing personal data of more than 10,000 data subjects within six months',
        deadline_text: 'within ninety (90) days of crossing the threshold',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: {
          amount_naira: 10000000,
          daily_fine_naira: null,
          citation: 'Section 48 of the NDPA 2023',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK', 'SWITCHING_AND_PROCESSING', 'DIGITAL_LENDER_FCCPC_REGISTERED'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'ndpc-dpo-guidance-2023',
    regulator: 'NDPC',
    title: 'Guidance Notice on Data Protection Officer (DPO) Appointment and Filing',
    circular_reference: 'NDPC/GN/2023/002',
    published_date: '2023-11-20',
    canonical_source_url: 'https://ndpc.gov.ng/notices/dpo_guidance_notice.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'PAYMENT_SERVICE_BANK', 'SWITCHING_AND_PROCESSING'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIA DATA PROTECTION COMMISSION (NDPC)
GUIDANCE NOTICE ON DATA PROTECTION OFFICER (DPO) APPOINTMENT
Ref: NDPC/GN/2023/002

Section 2.1 Designation of Certified Data Protection Officer
Data Controllers of Major Importance shall designate a Data Protection Officer possessive of verifiable certification in Nigerian and international data privacy jurisprudence. The name, contact email, and corporate designation of the DPO shall be communicated to the Commission within fourteen (14) days of appointment.`,
    obligations: [
      {
        obligation_id: 'ndpc-dpo-001',
        verbatim_quote: 'Data Controllers of Major Importance shall designate a Data Protection Officer possessive of verifiable certification in Nigerian and international data privacy jurisprudence.',
        actor: 'Data Controllers of Major Importance',
        action: 'shall designate',
        target_object: 'a Data Protection Officer possessive of verifiable certification in Nigerian and international data privacy jurisprudence',
        condition: null,
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'ndpc-dpo-002',
        verbatim_quote: 'The name, contact email, and corporate designation of the DPO shall be communicated to the Commission within fourteen (14) days of appointment.',
        actor: 'Data Controllers of Major Importance',
        action: 'shall be communicated',
        target_object: 'The name, contact email, and corporate designation of the DPO to the Commission',
        condition: null,
        deadline_text: 'within fourteen (14) days of appointment',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'ndpc-cross-border-2024',
    regulator: 'NDPC',
    title: 'Cross-Border Data Transfer Framework under Section 41 of the NDPA 2023',
    circular_reference: 'NDPC/CIR/2024/003',
    published_date: '2024-02-15',
    canonical_source_url: 'https://ndpc.gov.ng/circulars/cross_border_data_transfer.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK', 'SWITCHING_AND_PROCESSING', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
    applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'CARD_ACQUIRING_VERVE'],
    raw_text: `NIGERIA DATA PROTECTION COMMISSION (NDPC)
CROSS-BORDER DATA TRANSFER REGULATORY FRAMEWORK
Ref: NDPC/CIR/2024/003

Section 4.2 Legal Basis and Adequacy Whitelist
No financial institution or technology vendor shall transfer personal data of Nigerian citizens to any jurisdiction outside the Federal Republic of Nigeria without verifying that the recipient jurisdiction is on the NDPC Adequacy Whitelist or executing approved Standard Contractual Clauses (SCCs). Transfer in violation of this section attracts a fine of ₦10,000,000 under Section 49 of the NDPA 2023.`,
    obligations: [
      {
        obligation_id: 'ndpc-cb-001',
        verbatim_quote: 'No financial institution or technology vendor shall transfer personal data of Nigerian citizens to any jurisdiction outside the Federal Republic of Nigeria without verifying that the recipient jurisdiction is on the NDPC Adequacy Whitelist or executing approved Standard Contractual Clauses (SCCs).',
        actor: 'No financial institution or technology vendor',
        action: 'shall transfer',
        target_object: 'personal data of Nigerian citizens to any jurisdiction outside the Federal Republic of Nigeria without verifying that the recipient jurisdiction is on the NDPC Adequacy Whitelist or executing approved Standard Contractual Clauses (SCCs)',
        condition: 'without verifying that the recipient jurisdiction is on the NDPC Adequacy Whitelist or executing approved Standard Contractual Clauses (SCCs)',
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: {
          amount_naira: 10000000,
          daily_fine_naira: null,
          citation: 'Section 49 of the NDPA 2023',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
        applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
      },
    ],
  },
  {
    id: 'ndpc-biometrics-2024',
    regulator: 'NDPC',
    title: 'Enforcement Directive on Lawful Processing of Biometric Data',
    circular_reference: 'NDPC/DIR/2024/004',
    published_date: '2024-05-10',
    canonical_source_url: 'https://ndpc.gov.ng/directives/biometric_processing_mandate.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK', 'MICROFINANCE_BANK_NATIONAL', 'DIGITAL_LENDER_FCCPC_REGISTERED'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIA DATA PROTECTION COMMISSION (NDPC)
DIRECTIVE ON BIOMETRIC IDENTIFIERS AND SENSITIVE DATA
Ref: NDPC/DIR/2024/004

Section 3.2 Data Protection Impact Assessment (DPIA) Requirement
Organizations deploying facial recognition, fingerprint verification, or behavioral telemetry for KYC authentication shall conduct and document a comprehensive Data Protection Impact Assessment (DPIA) prior to system go-live. The DPIA shall be submitted to the Commission within thirty (30) days of completion.`,
    obligations: [
      {
        obligation_id: 'ndpc-bio-001',
        verbatim_quote: 'Organizations deploying facial recognition, fingerprint verification, or behavioral telemetry for KYC authentication shall conduct and document a comprehensive Data Protection Impact Assessment (DPIA) prior to system go-live.',
        actor: 'Organizations deploying facial recognition, fingerprint verification, or behavioral telemetry for KYC authentication',
        action: 'shall conduct and document',
        target_object: 'a comprehensive Data Protection Impact Assessment (DPIA) prior to system go-live',
        condition: 'prior to system go-live',
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'DIGITAL_LENDER_FCCPC_REGISTERED'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'ndpc-bio-002',
        verbatim_quote: 'The DPIA shall be submitted to the Commission within thirty (30) days of completion.',
        actor: 'Organizations deploying biometric authentication',
        action: 'shall be submitted',
        target_object: 'The DPIA to the Commission',
        condition: null,
        deadline_text: 'within thirty (30) days of completion',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'DIGITAL_LENDER_FCCPC_REGISTERED'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FCCPC DIRECTIVES (4)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'fccpc-digital-lending-2022',
    regulator: 'FCCPC',
    title: 'Limited Interim Regulatory/Registration Framework for Digital Lending',
    circular_reference: 'FCCPC/DLR/2022/001',
    published_date: '2022-08-18',
    canonical_source_url: 'https://fccpc.gov.ng/digital-lending-framework/',
    applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED', 'FINANCE_COMPANY'],
    applicable_rails: ['NIBSS_NIP', 'DIRECT_DEBIT_ACH'],
    raw_text: `FEDERAL COMPETITION & CONSUMER PROTECTION COMMISSION (FCCPC)
INTERIM REGULATORY FRAMEWORK FOR DIGITAL LENDING PLATFORMS
Ref: FCCPC/DLR/2022/001

Clause 2.1 Approval from Joint Regulatory Task Force
All digital lending companies and loan apps shall obtain explicit clearance and approval from the FCCPC prior to launching consumer credit mobile applications in Nigeria. Payment gateway switches and telecommunications aggregators are prohibited from integrating unapproved lenders.

Clause 5.3 Contact List Access Prohibition
Digital lending applications must not request, harvest, scrape, or store borrower contact lists, telephone directories, or gallery images as condition for loan disbursement. Violation results in immediate delisting and a statutory fine of ₦50,000,000 under Section 155 of the FCCPA 2018.`,
    obligations: [
      {
        obligation_id: 'fccpc-dl-001',
        verbatim_quote: 'All digital lending companies and loan apps shall obtain explicit clearance and approval from the FCCPC prior to launching consumer credit mobile applications in Nigeria.',
        actor: 'All digital lending companies and loan apps',
        action: 'shall obtain',
        target_object: 'explicit clearance and approval from the FCCPC prior to launching consumer credit mobile applications in Nigeria',
        condition: 'prior to launching consumer credit mobile applications in Nigeria',
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'fccpc-dl-002',
        verbatim_quote: 'Payment gateway switches and telecommunications aggregators are prohibited from integrating unapproved lenders.',
        actor: 'Payment gateway switches and telecommunications aggregators',
        action: 'are prohibited from integrating',
        target_object: 'unapproved lenders',
        condition: null,
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['SWITCHING_AND_PROCESSING', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'fccpc-dl-003',
        verbatim_quote: 'Digital lending applications must not request, harvest, scrape, or store borrower contact lists, telephone directories, or gallery images as condition for loan disbursement.',
        actor: 'Digital lending applications',
        action: 'must not request, harvest, scrape, or store',
        target_object: 'borrower contact lists, telephone directories, or gallery images as condition for loan disbursement',
        condition: 'as condition for loan disbursement',
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: {
          amount_naira: 50000000,
          daily_fine_naira: null,
          citation: 'Section 155 of the FCCPA 2018',
        },
        applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'fccpc-debt-recovery-2023',
    regulator: 'FCCPC',
    title: 'Directives Prohibiting Defamatory and Harassing Debt Recovery Tactics',
    circular_reference: 'FCCPC/DIR/2023/002',
    published_date: '2023-04-12',
    canonical_source_url: 'https://fccpc.gov.ng/directives/debt_collection_practices.pdf',
    applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED', 'FINANCE_COMPANY', 'MICROFINANCE_BANK_NATIONAL'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `FEDERAL COMPETITION & CONSUMER PROTECTION COMMISSION (FCCPC)
ENFORCEMENT DIRECTIVE ON DEBT RECOVERY PRACTICES
Ref: FCCPC/DIR/2023/002

Section 3.1 Prohibition on Defamation and Contact Shaming
Digital credit providers and their debt collection agents shall not contact third parties, family members, or employers of defaulting borrowers, nor send defamatory or abusive messages alleging financial insolvency.`,
    obligations: [
      {
        obligation_id: 'fccpc-dr-001',
        verbatim_quote: 'Digital credit providers and their debt collection agents shall not contact third parties, family members, or employers of defaulting borrowers, nor send defamatory or abusive messages alleging financial insolvency.',
        actor: 'Digital credit providers and their debt collection agents',
        action: 'shall not contact',
        target_object: 'third parties, family members, or employers of defaulting borrowers, nor send defamatory or abusive messages alleging financial insolvency',
        condition: null,
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'fccpc-apr-disclosure-2023',
    regulator: 'FCCPC',
    title: 'Mandatory Interest Rate and Transparent APR Disclosure Guidelines',
    circular_reference: 'FCCPC/REG/2023/003',
    published_date: '2023-10-05',
    canonical_source_url: 'https://fccpc.gov.ng/regulations/apr_disclosure.pdf',
    applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED', 'FINANCE_COMPANY'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `FEDERAL COMPETITION & CONSUMER PROTECTION COMMISSION (FCCPC)
REGULATION ON TRANSPARENT PRICING AND APR DISCLOSURE
Ref: FCCPC/REG/2023/003

Section 4.1 Key Facts Sheet Requirement
Every digital consumer loan platform must present a standardized Key Facts Sheet showing Annual Percentage Rate (APR), processing fees, late repayment penalties, and total repayment amount before loan acceptance by the consumer. Platforms are strictly prohibited from advertising loans as zero-interest where hidden processing fees apply.`,
    obligations: [
      {
        obligation_id: 'fccpc-apr-001',
        verbatim_quote: 'Every digital consumer loan platform must present a standardized Key Facts Sheet showing Annual Percentage Rate (APR), processing fees, late repayment penalties, and total repayment amount before loan acceptance by the consumer.',
        actor: 'Every digital consumer loan platform',
        action: 'must present',
        target_object: 'a standardized Key Facts Sheet showing Annual Percentage Rate (APR), processing fees, late repayment penalties, and total repayment amount before loan acceptance by the consumer',
        condition: 'before loan acceptance by the consumer',
        deadline_text: null,
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'fccpc-apr-002',
        verbatim_quote: 'Platforms are strictly prohibited from advertising loans as zero-interest where hidden processing fees apply.',
        actor: 'Platforms',
        action: 'are strictly prohibited from advertising',
        target_object: 'loans as zero-interest where hidden processing fees apply',
        condition: 'where hidden processing fees apply',
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['DIGITAL_LENDER_FCCPC_REGISTERED', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'fccpc-aggregator-telephony-2024',
    regulator: 'FCCPC',
    title: 'Mandatory Registration of Third-Party Telephony and SMS Aggregators',
    circular_reference: 'FCCPC/DIR/2024/005',
    published_date: '2024-03-29',
    canonical_source_url: 'https://fccpc.gov.ng/directives/telephony_aggregators_registration.pdf',
    applicable_licenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'DIGITAL_LENDER_FCCPC_REGISTERED'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `FEDERAL COMPETITION & CONSUMER PROTECTION COMMISSION (FCCPC)
DIRECTIVE ON BULK TELEPHONY AND SMS ROUTING FOR CREDIT RECOVERY
Ref: FCCPC/DIR/2024/005

Section 2.4 Aggregator Whitelist Verification
Payment solution service providers and SMS aggregators shall terminate bulk communication services to any digital lender within forty-eight (48) hours of receipt of a formal enforcement notice from the Commission indicating registration suspension. Default attracts a daily recurring fine of ₦1,000,000 under Section 156 of the FCCPA 2018.`,
    obligations: [
      {
        obligation_id: 'fccpc-agg-001',
        verbatim_quote: 'Payment solution service providers and SMS aggregators shall terminate bulk communication services to any digital lender within forty-eight (48) hours of receipt of a formal enforcement notice from the Commission indicating registration suspension.',
        actor: 'Payment solution service providers and SMS aggregators',
        action: 'shall terminate',
        target_object: 'bulk communication services to any digital lender',
        condition: 'upon receipt of formal enforcement notice',
        deadline_text: 'within forty-eight (48) hours of receipt of a formal enforcement notice',
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: {
          amount_naira: null,
          daily_fine_naira: 1000000,
          citation: 'Section 156 of the FCCPA 2018',
        },
        applicable_licenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. NFIU DIRECTIVES (4)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'nfiu-str-filing-2023',
    regulator: 'NFIU',
    title: 'AML/CFT/CPF Suspicious Transaction Reporting Directives for Financial Institutions',
    circular_reference: 'NFIU/STR/DIR/2023/01',
    published_date: '2023-01-19',
    canonical_source_url: 'https://nfiu.gov.ng/directives/str_reporting_guidelines.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'MICROFINANCE_BANK_NATIONAL', 'FINANCE_COMPANY', 'CRYPTO_VASP_SEC_APPROVED'],
    applicable_rails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
    raw_text: `NIGERIAN FINANCIAL INTELLIGENCE UNIT (NFIU)
DIRECTIVES ON SUSPICIOUS TRANSACTION REPORTING (STR)
Ref: NFIU/STR/DIR/2023/01

Section 4.1 Statutory STR Filing Timeline
All reporting financial institutions shall submit a Suspicious Transaction Report to the NFIU immediately and in any case not later than twenty-four (24) hours after forming a suspicion that funds are proceeds of a crime or related to terrorism financing. Failure to file within twenty-four hours attracts an administrative penalty of ₦5,000,000 for each day of default under Section 7(10) of MLPPA 2022.

Section 8.3 Anti-Tipping-Off Safeguards
Directors, compliance officers, and employees of financial institutions are strictly prohibited from disclosing to customer or third party that an STR has been reported or that an investigation is underway.`,
    obligations: [
      {
        obligation_id: 'nfiu-str-001',
        verbatim_quote: 'All reporting financial institutions shall submit a Suspicious Transaction Report to the NFIU immediately and in any case not later than twenty-four (24) hours after forming a suspicion that funds are proceeds of a crime or related to terrorism financing.',
        actor: 'All reporting financial institutions',
        action: 'shall submit',
        target_object: 'a Suspicious Transaction Report to the NFIU',
        condition: 'after forming a suspicion that funds are proceeds of a crime or related to terrorism financing',
        deadline_text: 'not later than twenty-four (24) hours after forming a suspicion',
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: {
          amount_naira: null,
          daily_fine_naira: 5000000,
          citation: 'Section 7(10) of MLPPA 2022',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'MICROFINANCE_BANK_NATIONAL'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'nfiu-str-002',
        verbatim_quote: 'Directors, compliance officers, and employees of financial institutions are strictly prohibited from disclosing to customer or third party that an STR has been reported or that an investigation is underway.',
        actor: 'Directors, compliance officers, and employees of financial institutions',
        action: 'are strictly prohibited from disclosing',
        target_object: 'to customer or third party that an STR has been reported or that an investigation is underway',
        condition: null,
        deadline_text: null,
        obligation_type: 'STRICT_PROHIBITION',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'FINANCE_COMPANY'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'nfiu-pep-advisory-2023',
    regulator: 'NFIU',
    title: 'Advisory on Politically Exposed Persons (PEPs) Screening and Beneficial Ownership',
    circular_reference: 'NFIU/PEP/ADV/2023/02',
    published_date: '2023-06-11',
    canonical_source_url: 'https://nfiu.gov.ng/advisories/pep_beneficial_ownership.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'PAYMENT_SERVICE_BANK'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIAN FINANCIAL INTELLIGENCE UNIT (NFIU)
ADVISORY ON POLITICALLY EXPOSED PERSONS (PEPs)
Ref: NFIU/PEP/ADV/2023/02

Section 3.2 Senior Management Approval for PEP Onboarding
Financial institutions must obtain approval from the Chief Executive Officer or an Executive Director prior to establishing a business relationship with a Politically Exposed Person, their family members, or known close associates.`,
    obligations: [
      {
        obligation_id: 'nfiu-pep-001',
        verbatim_quote: 'Financial institutions must obtain approval from the Chief Executive Officer or an Executive Director prior to establishing a business relationship with a Politically Exposed Person, their family members, or known close associates.',
        actor: 'Financial institutions',
        action: 'must obtain',
        target_object: 'approval from the Chief Executive Officer or an Executive Director prior to establishing a business relationship with a Politically Exposed Person, their family members, or known close associates',
        condition: 'prior to establishing a business relationship',
        deadline_text: null,
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'nfiu-sanctions-tfs-2024',
    regulator: 'NFIU',
    title: 'Directives on Targeted Financial Sanctions Implementation',
    circular_reference: 'NFIU/TFS/DIR/2024/01',
    published_date: '2024-01-08',
    canonical_source_url: 'https://nfiu.gov.ng/directives/targeted_financial_sanctions.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'SWITCHING_AND_PROCESSING', 'PAYMENT_SERVICE_BANK'],
    applicable_rails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
    raw_text: `NIGERIAN FINANCIAL INTELLIGENCE UNIT (NFIU)
DIRECTIVE ON TARGETED FINANCIAL SANCTIONS (TFS)
Ref: NFIU/TFS/DIR/2024/01

Section 2.1 Immediate Asset Freezing Without Delay
All financial institutions and designated non-financial businesses shall immediately freeze without prior notice all funds and financial assets belonging to individuals or entities designated on the Consolidated United Nations Security Council Sanctions List or Nigeria Domestic Sanctions List. Freezing must occur within twenty-four (24) hours of designation publication.`,
    obligations: [
      {
        obligation_id: 'nfiu-tfs-001',
        verbatim_quote: 'All financial institutions and designated non-financial businesses shall immediately freeze without prior notice all funds and financial assets belonging to individuals or entities designated on the Consolidated United Nations Security Council Sanctions List or Nigeria Domestic Sanctions List.',
        actor: 'All financial institutions and designated non-financial businesses',
        action: 'shall immediately freeze',
        target_object: 'without prior notice all funds and financial assets belonging to individuals or entities designated on the Consolidated United Nations Security Council Sanctions List or Nigeria Domestic Sanctions List',
        condition: 'without prior notice',
        deadline_text: null,
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
        applicable_rails: ['NIBSS_NIP'],
      },
      {
        obligation_id: 'nfiu-tfs-002',
        verbatim_quote: 'Freezing must occur within twenty-four (24) hours of designation publication.',
        actor: 'Financial institutions',
        action: 'must occur',
        target_object: 'Freezing of designated assets',
        condition: null,
        deadline_text: 'within twenty-four (24) hours of designation publication',
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'nfiu-ctr-reporting-2024',
    regulator: 'NFIU',
    title: 'Cash Transaction Reporting (CTR) Threshold Enforcement Communique',
    circular_reference: 'NFIU/CTR/COM/2024/02',
    published_date: '2024-04-18',
    canonical_source_url: 'https://nfiu.gov.ng/communique/ctr_reporting_thresholds.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'MICROFINANCE_BANK_NATIONAL'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIAN FINANCIAL INTELLIGENCE UNIT (NFIU)
COMMUNIQUE ON CASH TRANSACTION REPORTING (CTR) THRESHOLDS
Ref: NFIU/CTR/COM/2024/02

Section 1.2 Mandatory Cash Inflow and Outflow Thresholds
Financial institutions shall report to the NFIU any single cash transaction or deposit exceeding ₦5,000,000 for an individual or ₦10,000,000 for a body corporate within seven (7) days of transaction consummation. Failure to file attracts a fine of ₦1,000,000 for each unfiled CTR under Section 11 of the MLPPA 2022.`,
    obligations: [
      {
        obligation_id: 'nfiu-ctr-001',
        verbatim_quote: 'Financial institutions shall report to the NFIU any single cash transaction or deposit exceeding ₦5,000,000 for an individual or ₦10,000,000 for a body corporate within seven (7) days of transaction consummation.',
        actor: 'Financial institutions',
        action: 'shall report',
        target_object: 'to the NFIU any single cash transaction or deposit exceeding ₦5,000,000 for an individual or ₦10,000,000 for a body corporate',
        condition: 'exceeding ₦5,000,000 for an individual or ₦10,000,000 for a body corporate',
        deadline_text: 'within seven (7) days of transaction consummation',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: {
          amount_naira: 1000000,
          daily_fine_naira: null,
          citation: 'Section 11 of the MLPPA 2022',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'MICROFINANCE_BANK_NATIONAL'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. NDIC DIRECTIVES (4)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ndic-coverage-limits-2024',
    regulator: 'NDIC',
    title: 'Maximum Deposit Insurance Coverage Framework for Commercial Banks',
    circular_reference: 'NDIC/DIR/MDIC/2024/01',
    published_date: '2024-05-02',
    canonical_source_url: 'https://ndic.gov.ng/circulars/maximum_deposit_insurance_coverage_2024.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK', 'PAYMENT_SERVICE_BANK'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIA DEPOSIT INSURANCE CORPORATION (NDIC)
MAXIMUM DEPOSIT INSURANCE COVERAGE FRAMEWORK
Ref: NDIC/DIR/MDIC/2024/01

Section 2.1 Revised Insured Deposit Ceiling
The maximum deposit insurance coverage for depositors of licensed Deposit Money Banks (DMBs) is ₦5,000,000 per depositor per insured institution. Insured institutions shall prominently display this statutory coverage limit across all customer banking portals and account opening documentations.`,
    obligations: [
      {
        obligation_id: 'ndic-mdic-001',
        verbatim_quote: 'Insured institutions shall prominently display this statutory coverage limit across all customer banking portals and account opening documentations.',
        actor: 'Insured institutions',
        action: 'shall prominently display',
        target_object: 'this statutory coverage limit across all customer banking portals and account opening documentations',
        condition: null,
        deadline_text: null,
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'ndic-premium-assessment-2023',
    regulator: 'NDIC',
    title: 'Statutory Premium Assessment Framework for Insured Financial Institutions',
    circular_reference: 'NDIC/PRM/2023/002',
    published_date: '2023-04-14',
    canonical_source_url: 'https://ndic.gov.ng/regulations/premium_assessment_framework.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MICROFINANCE_BANK_NATIONAL', 'MICROFINANCE_BANK_STATE'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIA DEPOSIT INSURANCE CORPORATION (NDIC)
STATUTORY PREMIUM ASSESSMENT DIRECTIVE
Ref: NDIC/PRM/2023/002

Section 4.3 Annual Premium Remittance Deadline
Every insured institution shall calculate and remit its statutory annual deposit insurance premium to the Corporation not later than the thirty-first (31st) day of January of each calendar year. Late remittance attracts an automatic surcharge of 0.5% per month on the unpaid balance under Section 14 of the NDIC Act 2023.`,
    obligations: [
      {
        obligation_id: 'ndic-prm-001',
        verbatim_quote: 'Every insured institution shall calculate and remit its statutory annual deposit insurance premium to the Corporation not later than the thirty-first (31st) day of January of each calendar year.',
        actor: 'Every insured institution',
        action: 'shall calculate and remit',
        target_object: 'its statutory annual deposit insurance premium to the Corporation',
        condition: null,
        deadline_text: 'not later than the thirty-first (31st) day of January of each calendar year',
        obligation_type: 'STATUTORY_TIMELINE',
        statutory_penalty: {
          amount_naira: null,
          daily_fine_naira: null,
          citation: 'Section 14 of the NDIC Act 2023',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'MICROFINANCE_BANK_NATIONAL'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'ndic-early-warning-2024',
    regulator: 'NDIC',
    title: 'Early Warning Signals and Supervisory Failure Resolution Directives',
    circular_reference: 'NDIC/DIR/EWS/2024/03',
    published_date: '2024-07-20',
    canonical_source_url: 'https://ndic.gov.ng/directives/early_warning_signals.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIA DEPOSIT INSURANCE CORPORATION (NDIC)
SUPERVISORY DIRECTIVE ON EARLY WARNING AND LIQUIDITY STRAIN
Ref: NDIC/DIR/EWS/2024/03

Section 2.2 Mandatory Notification of Severe Liquidity Deterioration
Insured banks shall notify the Corporation in writing within twelve (12) hours where the liquidity ratio drops below the regulatory threshold of thirty percent (30%) for three consecutive clearing cycles.`,
    obligations: [
      {
        obligation_id: 'ndic-ews-001',
        verbatim_quote: 'Insured banks shall notify the Corporation in writing within twelve (12) hours where the liquidity ratio drops below the regulatory threshold of thirty percent (30%) for three consecutive clearing cycles.',
        actor: 'Insured banks',
        action: 'shall notify',
        target_object: 'the Corporation in writing within twelve (12) hours where the liquidity ratio drops below the regulatory threshold of thirty percent (30%) for three consecutive clearing cycles',
        condition: 'where the liquidity ratio drops below the regulatory threshold of thirty percent (30%) for three consecutive clearing cycles',
        deadline_text: 'within twelve (12) hours',
        obligation_type: 'MANDATORY_DISCLOSURE',
        statutory_penalty: null,
        applicable_licenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
  {
    id: 'ndic-single-customer-view-2024',
    regulator: 'NDIC',
    title: 'Framework for Single Customer View (SCV) Records Integration',
    circular_reference: 'NDIC/SCV/DIR/2024/04',
    published_date: '2024-09-12',
    canonical_source_url: 'https://ndic.gov.ng/frameworks/single_customer_view_system.pdf',
    applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK', 'MICROFINANCE_BANK_NATIONAL'],
    applicable_rails: ['NIBSS_NIP'],
    raw_text: `NIGERIA DEPOSIT INSURANCE CORPORATION (NDIC)
FRAMEWORK FOR SINGLE CUSTOMER VIEW (SCV) DATA EXTRACTION
Ref: NDIC/SCV/DIR/2024/04

Section 3.1 SCV Data Extraction Capability Within 24 Hours
Insured financial institutions must maintain IT systems capable of producing an authenticated Single Customer View dataset containing Bank Verification Number (BVN) and aggregated deposit balances within twenty-four (24) hours of a formal regulatory request from the Corporation. Failure to maintain compliant SCV feeds attracts a penalty of ₦10,000,000 under Section 29 of the NDIC Act 2023.`,
    obligations: [
      {
        obligation_id: 'ndic-scv-001',
        verbatim_quote: 'Insured financial institutions must maintain IT systems capable of producing an authenticated Single Customer View dataset containing Bank Verification Number (BVN) and aggregated deposit balances within twenty-four (24) hours of a formal regulatory request from the Corporation.',
        actor: 'Insured financial institutions',
        action: 'must maintain',
        target_object: 'IT systems capable of producing an authenticated Single Customer View dataset containing Bank Verification Number (BVN) and aggregated deposit balances within twenty-four (24) hours of a formal regulatory request from the Corporation',
        condition: null,
        deadline_text: 'within twenty-four (24) hours of a formal regulatory request',
        obligation_type: 'GOVERNANCE_CONTROL',
        statutory_penalty: {
          amount_naira: 10000000,
          daily_fine_naira: null,
          citation: 'Section 29 of the NDIC Act 2023',
        },
        applicable_licenses: ['COMMERCIAL_BANK', 'PAYMENT_SERVICE_BANK'],
        applicable_rails: ['NIBSS_NIP'],
      },
    ],
  },
];

export function buildGoldenCorpus(): GoldenBenchmarkInstrument[] {
  const instruments: GoldenBenchmarkInstrument[] = [];

  for (const raw of rawDefinitions) {
    const groundTruthObligations: GroundTruthObligation[] = [];

    for (const ob of raw.obligations) {
      const idx = raw.raw_text.indexOf(ob.verbatim_quote);
      if (idx === -1) {
        throw new Error(
          `CRITICAL CHARACTER SPAN FIDELITY FAILURE in instrument ${raw.circular_reference}: Quote not found in raw_text: "${ob.verbatim_quote}"`
        );
      }

      const start = idx;
      const end = idx + ob.verbatim_quote.length;

      // Assert zero character drift
      const extractedSlice = raw.raw_text.substring(start, end);
      if (extractedSlice !== ob.verbatim_quote) {
        throw new Error(
          `CHARACTER SPAN DRIFT DETECTED in ${raw.circular_reference}: slice "${extractedSlice}" !== quote "${ob.verbatim_quote}"`
        );
      }

      groundTruthObligations.push({
        ...ob,
        character_span_start: start,
        character_span_end: end,
      });
    }

    instruments.push({
      id: raw.id,
      regulator: raw.regulator,
      title: raw.title,
      circular_reference: raw.circular_reference,
      published_date: raw.published_date,
      raw_text: raw.raw_text,
      canonical_source_url: raw.canonical_source_url,
      applicable_licenses: raw.applicable_licenses,
      applicable_rails: raw.applicable_rails,
      ground_truth_obligations: groundTruthObligations,
    });
  }

  return instruments;
}

if (process.argv[1]?.includes('build-golden-corpus')) {
  const corpus = buildGoldenCorpus();
  const targetDir = path.resolve(process.cwd(), 'tests/golden');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.join(targetDir, 'golden-regulatory-corpus.json');
  fs.writeFileSync(targetPath, JSON.stringify(corpus, null, 2), 'utf-8');
  console.log(`✅ Successfully generated Canonical Golden Benchmark Corpus:`);
  console.log(`   • Total Instruments: ${corpus.length} (CBN, SEC, NDPC, FCCPC, NFIU, NDIC)`);
  console.log(`   • Total Ground-Truth Obligations: ${corpus.reduce((acc, c) => acc + c.ground_truth_obligations.length, 0)}`);
  console.log(`   • Output: ${targetPath}`);
}
