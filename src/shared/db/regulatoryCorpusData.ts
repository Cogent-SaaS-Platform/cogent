import {
  RegulatorCode,
  InstrumentType,
  VerificationStatus,
  ObligationType,
  SeverityLevel,
  LicenseType,
  PaymentRail,
} from '@/shared/types';

export interface RegulatoryBodySeed {
  code: RegulatorCode;
  name: string;
  enforcement_power_summary: string;
  official_portal_url: string;
}

export interface StatutoryPenaltySeed {
  penalty_min_naira: number;
  penalty_max_naira: number;
  daily_fine_naira: number;
  carries_personal_criminal_liability: boolean;
  carries_license_suspension_risk: boolean;
  penalty_legal_citation: string;
}

export interface ProhibitedTermSeed {
  exact_pattern: string;
  is_regex: boolean;
  severity: SeverityLevel;
  statutory_rationale: string;
  mandatory_disclosure_required: string | null;
}

export interface ApplicabilityRuleSeed {
  applicable_license_type?: LicenseType;
  applicable_payment_rail?: PaymentRail;
  minimum_capital_threshold_naira?: number;
  all_institutions_flag?: boolean;
}

export interface RegulatoryObligationSeed {
  obligation_type: ObligationType;
  summary: string;
  severity_floor: SeverityLevel;
  statutory_timeline_days: number | null;
  mandatory_disclosure_text: string | null;
  penalties: StatutoryPenaltySeed[];
  prohibited_terms: ProhibitedTermSeed[];
  applicability: ApplicabilityRuleSeed[];
}

export interface RegulatoryClauseSeed {
  section_reference: string;
  section_heading: string;
  clause_text: string;
  page_number?: number;
  paragraph_reference?: string;
  obligations: RegulatoryObligationSeed[];
}

export interface RegulatoryDocumentVersionSeed {
  version_number: string;
  reference_code: string;
  publication_date: string;
  effective_date: string;
  canonical_source_url: string;
  source_file_url: string;
  source_file_hash: string;
  verification_status: VerificationStatus;
  verification_notes: string;
  clauses: RegulatoryClauseSeed[];
}

export interface RegulatoryInstrumentSeed {
  body_code: RegulatorCode;
  title: string;
  short_name: string;
  instrument_type: InstrumentType;
  versions: RegulatoryDocumentVersionSeed[];
}

export const REGULATORY_BODIES_SEED: RegulatoryBodySeed[] = [
  {
    code: 'ARCON',
    name: 'Advertising Regulatory Council of Nigeria',
    enforcement_power_summary:
      'Statutory power to regulate, pre-vet, issue cease-and-desist orders, and impose balance sheet sanctions on all commercial advertising across print, broadcast, digital, social media, and SMS in Nigeria under the ARCON Act 2022.',
    official_portal_url: 'https://arcon.gov.ng',
  },
  {
    code: 'CBN',
    name: 'Central Bank of Nigeria',
    enforcement_power_summary:
      'Apex monetary and financial supervisory authority with plenary power under BOFIA 2020 and the CBN Act 2007 to license, inspect, sanction, revoke licenses, and suspend payment rails of financial institutions.',
    official_portal_url: 'https://www.cbn.gov.ng',
  },
  {
    code: 'FCCPC',
    name: 'Federal Competition and Consumer Protection Commission',
    enforcement_power_summary:
      'National competition and consumer watchdog enforcing truth in advertising, fair lending standards, privacy, and digital lender registration under FCCPA 2018.',
    official_portal_url: 'https://fccpc.gov.ng',
  },
  {
    code: 'SEC',
    name: 'Securities and Exchange Commission',
    enforcement_power_summary:
      'Apex regulatory body for Nigerian capital markets, wealthtechs, collective investment schemes, and investment crowdfunding under ISA 2007.',
    official_portal_url: 'https://sec.gov.ng',
  },
  {
    code: 'NDPC',
    name: 'Nigeria Data Protection Commission',
    enforcement_power_summary:
      'National supervisory authority enforcing fair processing of personal data, lawful consent for direct marketing, and data subject rights under the Nigeria Data Protection Act 2023.',
    official_portal_url: 'https://ndpc.gov.ng',
  },
  {
    code: 'NFIU',
    name: 'Nigerian Financial Intelligence Unit',
    enforcement_power_summary:
      'Central national agency responsible for receiving, analyzing, and disseminating financial intelligence relating to money laundering, terrorism financing, and statutory reporting under the NFIU Act 2018.',
    official_portal_url: 'https://nfiu.gov.ng',
  },
];

export const REGULATORY_INSTRUMENTS_SEED: RegulatoryInstrumentSeed[] = [
  // 1. ARCON ADVERTISING CODE 2022
  {
    body_code: 'ARCON',
    title: 'Nigerian Code of Advertising Practice, Sales Promotion and Other Marketing Communications (6th Edition)',
    short_name: 'ARCON Code 2022',
    instrument_type: 'SUBSIDIARY_REGULATION',
    versions: [
      {
        version_number: '2022-6TH-EDITION',
        reference_code: 'ARCON/ACT/2022/CODE-VOL-109',
        publication_date: '2022-07-15',
        effective_date: '2022-08-01',
        canonical_source_url: 'https://arcon.gov.ng/advertising-code-2022.pdf',
        source_file_url: 'regulatory/arcon/arcon_code_2022.pdf',
        source_file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verification_status: 'HUMAN_VERIFIED',
        verification_notes: 'Verified against Federal Republic of Nigeria Official Gazette and ARCON Secretariat Master Copy.',
        clauses: [
          {
            section_reference: 'Article 24(1)',
            section_heading: 'Honesty and Deceptive Claims in Advertising',
            clause_text:
              'All advertisements and marketing communications must be honest, truthful, and accurate. Advertisements must not contain statements, promises, guarantees, or visual presentations that directly or indirectly deceive or mislead consumers regarding product benefits, terms of service, costs, approval certainty, or risk profiles.',
            page_number: 14,
            paragraph_reference: 'Paragraph 1',
            obligations: [
              {
                obligation_type: 'STRICT_PROHIBITION',
                summary: 'Strict prohibition against misleading promises of guaranteed approvals, risk-free services, or unsubstantiated certainty.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: null,
                mandatory_disclosure_text: null,
                penalties: [
                  {
                    penalty_min_naira: 1000000,
                    penalty_max_naira: 5000000,
                    daily_fine_naira: 50000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 24(3) & Section 54 ARCON Act 2022',
                  },
                ],
                prohibited_terms: [
                  {
                    exact_pattern: '100% guaranteed approval',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Misleading absolute certainty of credit approval prohibited under Article 24(1) of ARCON Code 2022.',
                    mandatory_disclosure_required: 'Subject to credit assessment and terms & conditions.',
                  },
                  {
                    exact_pattern: 'guaranteed approval',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Absolute approval guarantee without qualification violates ARCON truth-in-advertising standards.',
                    mandatory_disclosure_required: 'Terms and eligibility conditions apply.',
                  },
                  {
                    exact_pattern: 'risk-free return',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Promising zero risk on financial or commercial products is inherently deceptive under Nigerian law.',
                    mandatory_disclosure_required: 'Capital is at risk. Past performance does not guarantee future results.',
                  },
                ],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
          {
            section_reference: 'Article 38(1)',
            section_heading: 'Mandatory Pre-Exposure Vetting by Advertising Standards Panel (ASP)',
            clause_text:
              'No advertisement, promotional material, or marketing communication shall be exposed, published, broadcast, or circulated to the Nigerian public on any media platform—including digital platforms, social media, mobile apps, SMS blasts, or websites—unless it has been submitted to and received prior vetting and approval from the Advertising Standards Panel (ASP).',
            page_number: 22,
            paragraph_reference: 'Paragraph 1-2',
            obligations: [
              {
                obligation_type: 'MANDATORY_DISCLOSURE',
                summary: 'All marketing copy exposed to Nigerian consumers must undergo ASP pre-clearance and include regulatory vetting notation where mandated.',
                severity_floor: 'HIGH',
                statutory_timeline_days: 14,
                mandatory_disclosure_text: 'Vetted and Approved by ARCON',
                penalties: [
                  {
                    penalty_min_naira: 500000,
                    penalty_max_naira: 3000000,
                    daily_fine_naira: 25000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 54(1) ARCON Act 2022 (Unvetted Exposure Sanctions)',
                  },
                ],
                prohibited_terms: [],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
          {
            section_reference: 'Article 45(3)',
            section_heading: 'Financial Products & Institutional Authorisation Disclosures',
            clause_text:
              'Every advertisement promoting consumer credit, deposit mobilization, financial investments, or payment services must clearly and conspicuously state the registered commercial entity name, its statutory license classification, and the issuing regulatory authority. Advertisements must not omit material conditions, application fees, or annual percentage rates.',
            page_number: 29,
            paragraph_reference: 'Paragraph 3',
            obligations: [
              {
                obligation_type: 'MANDATORY_DISCLOSURE',
                summary: 'Mandatory inclusion of issuing regulatory body and license class in financial promotions.',
                severity_floor: 'HIGH',
                statutory_timeline_days: null,
                mandatory_disclosure_text: 'Licensed and Regulated by the Central Bank of Nigeria / Registered with the FCCPC',
                penalties: [
                  {
                    penalty_min_naira: 1000000,
                    penalty_max_naira: 3000000,
                    daily_fine_naira: 0,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: false,
                    penalty_legal_citation: 'Article 45(5) ARCON Code 2022 & Section 3.2 CBN CPF 2019',
                  },
                ],
                prohibited_terms: [],
                applicability: [
                  { applicable_license_type: 'COMMERCIAL_BANK' },
                  { applicable_license_type: 'MICROFINANCE_BANK_NATIONAL' },
                  { applicable_license_type: 'PAYMENT_SERVICE_BANK' },
                  { applicable_license_type: 'DIGITAL_LENDER_FCCPC_REGISTERED' },
                  { applicable_license_type: 'PAYMENT_SOLUTION_SERVICES_PSSP' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // 2. CBN CONSUMER PROTECTION FRAMEWORK 2019
  {
    body_code: 'CBN',
    title: 'Central Bank of Nigeria Consumer Protection Framework for Banks and Other Financial Institutions',
    short_name: 'CBN CPF 2019',
    instrument_type: 'REGULATORY_FRAMEWORK',
    versions: [
      {
        version_number: '2019-FINAL',
        reference_code: 'CBN/FPR/DIR/GEN/07/040',
        publication_date: '2019-12-20',
        effective_date: '2020-01-01',
        canonical_source_url: 'https://www.cbn.gov.ng/out/2019/ccd/consumer%20protection%20framework.pdf',
        source_file_url: 'regulatory/cbn/cbn_consumer_protection_framework_2019.pdf',
        source_file_hash: 'a5c3d4f198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b123',
        verification_status: 'HUMAN_VERIFIED',
        verification_notes: 'Ratified by CBN Governor Directive. Applicable to all licensed deposit-money banks, OFIs, and PSPs.',
        clauses: [
          {
            section_reference: 'Section 3.2.1',
            section_heading: 'Disclosure and Transparency in Pricing & Advertising',
            clause_text:
              'Financial institutions must ensure that all advertising, marketing, and promotional materials are written in plain, clear language. Key financial terms, including the Total Cost of Credit, Annual Percentage Rate (APR), processing fees, default penalties, and administrative charges, must be prominently disclosed. Financial institutions shall not use terms that mislead consumers into believing financial services or credit facilities are free of cost when fees or obligations attach.',
            page_number: 16,
            paragraph_reference: 'Section 3.2.1(a)-(e)',
            obligations: [
              {
                obligation_type: 'STRICT_PROHIBITION',
                summary: 'Absolute prohibition against advertising credit or financial products as free or zero-interest when ancillary costs exist.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: null,
                mandatory_disclosure_text: 'APR, interest rate calculation, and all fee schedules must be accessible before disbursement.',
                penalties: [
                  {
                    penalty_min_naira: 2000000,
                    penalty_max_naira: 10000000,
                    daily_fine_naira: 100000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 64 & Section 94 BOFIA 2020; Section 6.2 CBN CPF 2019',
                  },
                ],
                prohibited_terms: [
                  {
                    exact_pattern: 'zero interest',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Advertising credit as "zero interest" violates Section 3.2.1 of CBN CPF 2019 when service fees or charges apply.',
                    mandatory_disclosure_required: 'Interest rate and comprehensive fee schedule.',
                  },
                  {
                    exact_pattern: '0% interest',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Misleading pricing assertion under CBN Consumer Protection Framework Section 3.2.1.',
                    mandatory_disclosure_required: 'Applicable APR and administrative processing charges.',
                  },
                  {
                    exact_pattern: 'free loan',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Prohibited deceptive financial claim under Section 3.2.1 CBN CPF 2019.',
                    mandatory_disclosure_required: 'Full borrowing terms and statutory charges.',
                  },
                ],
                applicability: [
                  { applicable_license_type: 'COMMERCIAL_BANK' },
                  { applicable_license_type: 'MICROFINANCE_BANK_NATIONAL' },
                  { applicable_license_type: 'PAYMENT_SERVICE_BANK' },
                  { applicable_license_type: 'FINANCE_COMPANY' },
                  { applicable_license_type: 'DIGITAL_LENDER_FCCPC_REGISTERED' },
                ],
              },
            ],
          },
          {
            section_reference: 'Section 3.2.5',
            section_heading: 'Institutional Identity and Deceptive Backing Representations',
            clause_text:
              'Financial institutions and fintech partners shall not make false, misleading, or deceptive representations claiming that their corporate entities, products, or deposit liabilities are directly guaranteed, underwritten, or backed by the Central Bank of Nigeria or the Federal Government of Nigeria, save for statutory deposit insurance provided by NDIC within prescribed limits.',
            page_number: 19,
            paragraph_reference: 'Section 3.2.5(c)',
            obligations: [
              {
                obligation_type: 'STRICT_PROHIBITION',
                summary: 'Prohibition against claiming government guarantee or Central Bank underwriting for non-sovereign financial products.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: null,
                mandatory_disclosure_text: 'Deposits insured by NDIC up to the statutory limit.',
                penalties: [
                  {
                    penalty_min_naira: 3000000,
                    penalty_max_naira: 25000000,
                    daily_fine_naira: 200000,
                    carries_personal_criminal_liability: true,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 57 & Section 60 BOFIA 2020; Section 3.2.5 CBN CPF 2019',
                  },
                ],
                prohibited_terms: [
                  {
                    exact_pattern: 'backed by the government',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Fraudulent representation of government backing prohibited under Section 57 BOFIA 2020 and Section 3.2.5 CBN CPF.',
                    mandatory_disclosure_required: 'Regulated financial institution. Deposits insured by NDIC where applicable.',
                  },
                  {
                    exact_pattern: 'cbn guaranteed',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'CBN does not guarantee commercial deposits or investment yields; false representation under BOFIA 2020.',
                    mandatory_disclosure_required: 'Regulated by the Central Bank of Nigeria.',
                  },
                ],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
        ],
      },
    ],
  },

  // 3. FCCPC DIGITAL LENDING REGULATIONS 2022
  {
    body_code: 'FCCPC',
    title: 'Limited Interim Regulatory/Registration Framework and Guidelines for Digital Lending 2022',
    short_name: 'FCCPC Lending Guidelines 2022',
    instrument_type: 'OPERATIONAL_GUIDELINE',
    versions: [
      {
        version_number: '2022-INTERIM-V1',
        reference_code: 'FCCPC/DLR/2022/VOL-1',
        publication_date: '2022-08-18',
        effective_date: '2022-08-18',
        canonical_source_url: 'https://fccpc.gov.ng/digital-lending-guidelines-2022.pdf',
        source_file_url: 'regulatory/fccpc/fccpc_digital_lending_guidelines_2022.pdf',
        source_file_hash: 'c8d4e198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999',
        verification_status: 'HUMAN_VERIFIED',
        verification_notes: 'Joint Regulatory Enforcement Action Framework (FCCPC, CBN, EFCC, ICPC, NDPC).',
        clauses: [
          {
            section_reference: 'Section 5(2)',
            section_heading: 'Mandatory Credit Assessment and Responsible Marketing',
            clause_text:
              'Digital money lenders (DMLs) and online lending platforms shall not advertise or market loan products suggesting that credit will be granted without credit evaluation, identity verification, or affordability assessment. Advertising "no credit checks" or promoting reckless indebtedness is prohibited.',
            page_number: 6,
            paragraph_reference: 'Clause 5.2(a)',
            obligations: [
              {
                obligation_type: 'STRICT_PROHIBITION',
                summary: 'Prohibition on advertising loans without credit checks or verification.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: null,
                mandatory_disclosure_text: 'Loans are subject to credit and affordability assessment.',
                penalties: [
                  {
                    penalty_min_naira: 2500000,
                    penalty_max_naira: 10000000,
                    daily_fine_naira: 100000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 155 FCCPA 2018; Section 5(4) FCCPC Lending Guidelines 2022',
                  },
                ],
                prohibited_terms: [
                  {
                    exact_pattern: 'no credit checks',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Advertising credit without verification violates mandatory assessment requirements under Section 5(2) FCCPC Guidelines.',
                    mandatory_disclosure_required: 'Subject to credit check and KYC verification.',
                  },
                  {
                    exact_pattern: 'no credit check',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Violates Section 5(2) FCCPC Lending Guidelines 2022.',
                    mandatory_disclosure_required: 'Subject to credit and affordability evaluation.',
                  },
                  {
                    exact_pattern: 'no collateral, no credit checks',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Encouraging reckless borrowing and deceptive vetting promises prohibited under FCCPA 2018.',
                    mandatory_disclosure_required: 'Eligibility criteria and credit checks apply.',
                  },
                ],
                applicability: [
                  { applicable_license_type: 'DIGITAL_LENDER_FCCPC_REGISTERED' },
                  { applicable_license_type: 'FINANCE_COMPANY' },
                  { applicable_license_type: 'MICROFINANCE_BANK_NATIONAL' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // 4. SEC NIGERIA CAPITAL MARKET RULES
  {
    body_code: 'SEC',
    title: 'Securities and Exchange Commission Consolidated Rules & Regulations on Collective Investment Schemes & Wealthtech',
    short_name: 'SEC Consolidated Rules 2013 (As Amended)',
    instrument_type: 'SUBSIDIARY_REGULATION',
    versions: [
      {
        version_number: '2022-AMENDMENT',
        reference_code: 'SEC/CRR/2013-REV-2022',
        publication_date: '2022-04-12',
        effective_date: '2022-05-01',
        canonical_source_url: 'https://sec.gov.ng/rules-regulations/consolidated-rules-2022.pdf',
        source_file_url: 'regulatory/sec/sec_consolidated_rules_2022.pdf',
        source_file_hash: 'f9e8d7c6b5a4198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b111',
        verification_status: 'HUMAN_VERIFIED',
        verification_notes: 'Enforced under Investments and Securities Act 2007.',
        clauses: [
          {
            section_reference: 'Rule 39(b)',
            section_heading: 'Prohibition of Guaranteed Yields on Market Investments',
            clause_text:
              'No capital market operator, digital investment platform, robo-advisor, or collective investment scheme manager shall issue, publish, or circulate any marketing communication guaranteeing a specific rate of return, capital preservation, or risk-free return on any security or investment portfolio other than fixed-income sovereign securities explicitly backed by the full faith and credit of the Federal Government of Nigeria.',
            page_number: 45,
            paragraph_reference: 'Rule 39(b)(i)',
            obligations: [
              {
                obligation_type: 'STRICT_PROHIBITION',
                summary: 'Strict prohibition on advertising guaranteed yields or risk-free returns on investment products.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: null,
                mandatory_disclosure_text: 'Investments are subject to market risk. Past performance does not guarantee future results.',
                penalties: [
                  {
                    penalty_min_naira: 3000000,
                    penalty_max_naira: 10000000,
                    daily_fine_naira: 100000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 303 Investments and Securities Act 2007; SEC Rule 39(b)',
                  },
                ],
                prohibited_terms: [
                  {
                    exact_pattern: 'risk-free annual return guaranteed',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Promising guaranteed yields on investments is explicitly prohibited by SEC Rule 39(b).',
                    mandatory_disclosure_required: 'Yields are variable. Capital is subject to market fluctuation.',
                  },
                  {
                    exact_pattern: 'guaranteed return',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Absolute yield guarantee violates SEC Rule 39(b) and ISA 2007.',
                    mandatory_disclosure_required: 'Target returns are estimates and not guaranteed.',
                  },
                  {
                    exact_pattern: '100% safe',
                    is_regex: false,
                    severity: 'CRITICAL',
                    statutory_rationale: 'Misrepresents investment risk under ISA 2007 and SEC rules.',
                    mandatory_disclosure_required: 'All investments carry risk of loss.',
                  },
                ],
                applicability: [
                  { applicable_license_type: 'SEC_REGISTERED_DIGITAL_SUB_BROKER' },
                  { applicable_license_type: 'SEC_REGISTERED_ROBO_ADVISOR' },
                  { applicable_license_type: 'CRYPTO_VASP_SEC_APPROVED' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // 5. CBN AML/CFT REGULATIONS 2022 (Pillar 3 Statutory Baseline)
  {
    body_code: 'CBN',
    title: 'Central Bank of Nigeria (Anti-Money Laundering, Combating the Financing of Terrorism and Countering Proliferation Financing) Regulations 2022',
    short_name: 'CBN AML/CFT Regulations 2022',
    instrument_type: 'SUBSIDIARY_REGULATION',
    versions: [
      {
        version_number: 'AML-2022',
        reference_code: 'CBN/FPR/DIR/PUB/CIR/001/053',
        publication_date: '2022-04-08',
        effective_date: '2022-05-01',
        canonical_source_url: 'https://www.cbn.gov.ng/out/2022/ccd/aml_cft_regulations_2022.pdf',
        source_file_url: 'regulatory/cbn/cbn_aml_cft_regulations_2022.pdf',
        source_file_hash: 'b5a4198fc1c149afbf4c8996fb92427ae41e4649b934ca495991b1112223334',
        verification_status: 'HUMAN_VERIFIED',
        verification_notes: 'Gazetted Nigerian AML/CFT Regulations 2022. Mandatory baseline for all banks, OFIs, MMOs, and PSSPs.',
        clauses: [
          {
            section_reference: 'Regulation 14(2)',
            section_heading: 'Suspicious Transaction Reporting (STR) 72-Hour Window',
            clause_text:
              'A financial institution or designated non-financial business shall report suspicious transactions to the Nigerian Financial Intelligence Unit (NFIU) immediately and in any case within seventy-two (72) hours of detecting that the transaction or attempted transaction is suspicious. Internal policies permitting reporting windows in excess of 72 hours constitute Level 1 material statutory non-compliance.',
            page_number: 18,
            paragraph_reference: 'Regulation 14(2)(a)-(c)',
            obligations: [
              {
                obligation_type: 'STATUTORY_TIMELINE',
                summary: 'Mandatory transmission of Suspicious Transaction Reports (STRs) to NFIU within 72 hours of detection.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: 3,
                mandatory_disclosure_text: 'All suspicious transactions must be transmitted via the NFIU goAML portal within 72 hours.',
                penalties: [
                  {
                    penalty_min_naira: 5000000,
                    penalty_max_naira: 10000000,
                    daily_fine_naira: 100000,
                    carries_personal_criminal_liability: true,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Section 25(2) Money Laundering (Prevention and Prohibition) Act 2022 & Regulation 14 NFIU Regulations 2022',
                  },
                ],
                prohibited_terms: [],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
          {
            section_reference: 'Regulation 19(1)(b)',
            section_heading: 'Executive Governance Sign-Off on Politically Exposed Persons (PEPs)',
            clause_text:
              'Financial institutions shall establish risk-management systems to determine whether a customer or beneficial owner is a Politically Exposed Person (PEP). Financial institutions shall obtain prior written approval from Senior Management (Managing Director or Executive Director) before establishing a business relationship with such person or continuing a relationship where a customer becomes a PEP.',
            page_number: 24,
            paragraph_reference: 'Regulation 19(1)(b)',
            obligations: [
              {
                obligation_type: 'GOVERNANCE_CONTROL',
                summary: 'Prior Executive Senior Management / MD approval required before onboarding Politically Exposed Persons.',
                severity_floor: 'CRITICAL',
                statutory_timeline_days: 7,
                mandatory_disclosure_text: null,
                penalties: [
                  {
                    penalty_min_naira: 10000000,
                    penalty_max_naira: 20000000,
                    daily_fine_naira: 250000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: true,
                    penalty_legal_citation: 'Regulation 19(1) CBN AML/CFT Regulations 2022 & Section 66 BOFIA 2020',
                  },
                ],
                prohibited_terms: [],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
          {
            section_reference: 'Section 3.2',
            section_heading: 'Tiered Customer Due Diligence (CDD) and Biometric Identity Verification',
            clause_text:
              'Financial institutions shall verify customer identity using Bank Verification Number (BVN) or National Identity Number (NIN) credentials validated through official NIBSS or NIMC APIs prior to granting account access. Simplified verification is permitted solely for Tier-1 low-value accounts.',
            page_number: 12,
            paragraph_reference: 'Section 3.2(1)',
            obligations: [
              {
                obligation_type: 'CONDITIONAL_PERMISSION',
                summary: 'Mandatory biometric identification verification (BVN/NIN) for account opening.',
                severity_floor: 'HIGH',
                statutory_timeline_days: null,
                mandatory_disclosure_text: 'Verified identity via BVN or NIN required.',
                penalties: [
                  {
                    penalty_min_naira: 2000000,
                    penalty_max_naira: 5000000,
                    daily_fine_naira: 50000,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: false,
                    penalty_legal_citation: 'Section 3.2 CBN Tiered KYC Guidelines 2023',
                  },
                ],
                prohibited_terms: [],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
          {
            section_reference: 'Section 26',
            section_heading: 'Mandatory 5-Year Statutory Record Retention Period',
            clause_text:
              'Financial institutions shall maintain all necessary records on transactions, customer due diligence dossiers, account files, and business correspondence for a minimum of five (5) years following the completion of the transaction or termination of the business relationship.',
            page_number: 31,
            paragraph_reference: 'Section 26(1)',
            obligations: [
              {
                obligation_type: 'STATUTORY_TIMELINE',
                summary: 'Statutory mandate to preserve customer identification records and transaction logs for at least 5 years.',
                severity_floor: 'HIGH',
                statutory_timeline_days: 1825,
                mandatory_disclosure_text: null,
                penalties: [
                  {
                    penalty_min_naira: 2000000,
                    penalty_max_naira: 5000000,
                    daily_fine_naira: 0,
                    carries_personal_criminal_liability: false,
                    carries_license_suspension_risk: false,
                    penalty_legal_citation: 'Section 26 MLA 2022 & Section 38 CAMA 2020',
                  },
                ],
                prohibited_terms: [],
                applicability: [{ all_institutions_flag: true }],
              },
            ],
          },
        ],
      },
    ],
  },
];
