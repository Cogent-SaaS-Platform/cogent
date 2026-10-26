import { RegulatorySourceDefinition, JurisdictionCode, SourceCategory } from '@/shared/types';

/**
 * Enterprise Multi-Jurisdictional Regulatory & Intelligence Source Registry
 * Connects Cogent to Apex African Regulators, Tier-1 Law Firm Advisories,
 * Verified Financial Tech Media, and Supranational Oversight Bodies.
 */
export const VERIFIED_REGULATORY_SOURCES: RegulatorySourceDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. APEX REGULATORS (NIGERIA)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'src-cbn-apex',
    code: 'CBN',
    name: 'Central Bank of Nigeria Portal',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://www.cbn.gov.ng',
    feedUrl: 'https://www.cbn.gov.ng/api/GetAllCirculars',
    adapterType: 'REST_API',
    isActive: true,
    pollingFrequencyHours: 1,
    trustScore: 1.0,
    tags: ['banking', 'payments', 'monetary_policy', 'pssp', 'mmo', 'fx'],
    description: 'Apex banking supervisor, issuing circulars on payment systems, capital requirements, and foreign exchange.',
  },
  {
    id: 'src-sec-ng',
    code: 'SEC_NG',
    name: 'Securities and Exchange Commission Nigeria',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://sec.gov.ng',
    feedUrl: 'https://sec.gov.ng/for-investors/keep-track-of-circulars/',
    adapterType: 'HTML_SCRAPER',
    isActive: true,
    pollingFrequencyHours: 2,
    trustScore: 1.0,
    tags: ['capital_markets', 'wealthtech', 'crypto_vasp', 'crowdfunding'],
    description: 'Apex capital markets regulator, governing digital asset offerings, robo-advisors, and collective investment schemes.',
  },
  {
    id: 'src-ndpc-ng',
    code: 'NDPC',
    name: 'Nigeria Data Protection Commission',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://ndpc.gov.ng',
    feedUrl: 'https://ndpc.gov.ng/regulatory-notices',
    adapterType: 'HTML_SCRAPER',
    isActive: true,
    pollingFrequencyHours: 4,
    trustScore: 1.0,
    tags: ['data_privacy', 'ndpa_2023', 'kyc_data', 'cross_border_transfer'],
    description: 'National data privacy regulator enforcing statutory mandates under the Nigeria Data Protection Act 2023.',
  },
  {
    id: 'src-arcon-ng',
    code: 'ARCON',
    name: 'Advertising Regulatory Council of Nigeria',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://arcon.gov.ng',
    feedUrl: 'https://arcon.gov.ng/press-releases',
    adapterType: 'HTML_SCRAPER',
    isActive: true,
    pollingFrequencyHours: 4,
    trustScore: 1.0,
    tags: ['advertising', 'marketing_vetting', 'claims', 'promotions'],
    description: 'Regulates commercial advertising across digital, social, broadcast, and print media under the ARCON Act 2022.',
  },
  {
    id: 'src-fccpc-ng',
    code: 'FCCPC',
    name: 'Federal Competition & Consumer Protection Commission',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://fccpc.gov.ng',
    feedUrl: 'https://fccpc.gov.ng/directives',
    adapterType: 'HTML_SCRAPER',
    isActive: true,
    pollingFrequencyHours: 2,
    trustScore: 1.0,
    tags: ['digital_lending', 'consumer_protection', 'fair_interest', 'debt_recovery'],
    description: 'Regulates digital lending apps, fair interest rate disclosures, and consumer debt collection enforcement.',
  },
  {
    id: 'src-nfiu-ng',
    code: 'NFIU',
    name: 'Nigerian Financial Intelligence Unit',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://nfiu.gov.ng',
    feedUrl: 'https://nfiu.gov.ng/advisories',
    adapterType: 'HTML_SCRAPER',
    isActive: true,
    pollingFrequencyHours: 2,
    trustScore: 1.0,
    tags: ['aml_cft', 'str_filing', 'pep_screening', 'sanctions'],
    description: 'Apex financial intelligence unit monitoring AML/CFT suspicious transaction reporting and counter-terrorism financing.',
  },

  {
    id: 'src-ndic-ng',
    code: 'NDIC',
    name: 'Nigeria Deposit Insurance Corporation',
    category: 'APEX_REGULATOR',
    jurisdiction: 'NG',
    officialUrl: 'https://ndic.gov.ng',
    feedUrl: 'https://ndic.gov.ng',
    adapterType: 'HTML_SCRAPER',
    isActive: true,
    pollingFrequencyHours: 4,
    trustScore: 1.0,
    tags: ['deposit_insurance', 'bank_resolution', 'liquidation', 'prudential'],
    description: 'Statutory deposit insurer, protecting depositors and supervising insured institutions.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CROSS-BORDER PAN-AFRICAN REGULATORS (Deactivated for Beta Focus)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'src-bog-gh',
    code: 'BOG',
    name: 'Bank of Ghana (FinTech & Innovation)',
    category: 'APEX_REGULATOR',
    jurisdiction: 'GH',
    officialUrl: 'https://www.bog.gov.gh',
    feedUrl: 'https://www.bog.gov.gh/notice/',
    adapterType: 'HTML_SCRAPER',
    isActive: false,
    pollingFrequencyHours: 3,
    trustScore: 1.0,
    tags: ['ghana_payments', 'cross_border', 'mobile_money', 'cedi_rails'],
    description: 'Regulates Payment Service Providers (PSPs) and mobile money operations in Ghana under the Payment Systems and Services Act 2019.',
  },
  {
    id: 'src-cbk-ke',
    code: 'CBK',
    name: 'Central Bank of Kenya (Digital Lending & NPS)',
    category: 'APEX_REGULATOR',
    jurisdiction: 'KE',
    officialUrl: 'https://www.centralbank.go.ke',
    feedUrl: 'https://www.centralbank.go.ke/policy-procedures/circulars/',
    adapterType: 'HTML_SCRAPER',
    isActive: false,
    pollingFrequencyHours: 3,
    trustScore: 1.0,
    tags: ['kenya_fintech', 'digital_credit_providers', 'national_payment_system'],
    description: 'Enforces licensing and consumer protection on Digital Credit Providers (DCPs) and National Payment System participants in Kenya.',
  },
  {
    id: 'src-fsca-za',
    code: 'FSCA',
    name: 'Financial Sector Conduct Authority (South Africa)',
    category: 'APEX_REGULATOR',
    jurisdiction: 'ZA',
    officialUrl: 'https://www.fsca.co.za',
    feedUrl: 'https://www.fsca.co.za/Regulatory-Frameworks/Pages/Regulatory-Actions.aspx',
    adapterType: 'HTML_SCRAPER',
    isActive: false,
    pollingFrequencyHours: 4,
    trustScore: 1.0,
    tags: ['south_africa', 'crypto_casp', 'fais_act', 'conduct_standards'],
    description: 'Regulates market conduct of South African financial institutions, wealthtech platforms, and licensed Crypto Asset Service Providers (CASPs).',
  },
  {
    id: 'src-bceao-waemu',
    code: 'BCEAO',
    name: 'Banque Centrale des États de l’Afrique de l’Ouest',
    category: 'APEX_REGULATOR',
    jurisdiction: 'WAEMU',
    officialUrl: 'https://www.bceao.int',
    feedUrl: 'https://www.bceao.int/fr/publications/circulaires',
    adapterType: 'HTML_SCRAPER',
    isActive: false,
    pollingFrequencyHours: 6,
    trustScore: 0.95,
    tags: ['waemu_corridor', 'uemoa_fintech', 'cfa_payments'],
    description: 'Apex central bank overseeing banking, monetary policy, and digital payment switches across Francophone West Africa.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TIER-1 LAW FIRM ADVISORIES (EARLY WARNING INTELLIGENCE)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'src-templars-adv',
    code: 'TEMPLARS',
    name: 'Templars Law Regulatory & FinTech Practice',
    category: 'LAW_FIRM_ADVISORY',
    jurisdiction: 'NG',
    officialUrl: 'https://www.templars-law.com',
    feedUrl: 'https://www.templars-law.com/feed/',
    adapterType: 'RSS_FEED',
    isActive: false,
    pollingFrequencyHours: 4,
    trustScore: 0.95,
    tags: ['legal_analysis', 'regulatory_intent', 'bofia_interpretation', 'fintech_advisory'],
    description: 'High-frequency authoritative legal briefings analyzing newly issued circulars, tax laws, and central bank enforcement actions.',
  },
  {
    id: 'src-aluko-oyebode',
    code: 'ALUKO_OYEBODE',
    name: 'Aluko & Oyebode Financial Regulatory Enclave',
    category: 'LAW_FIRM_ADVISORY',
    jurisdiction: 'NG',
    officialUrl: 'https://www.aluko-oyebode.com',
    feedUrl: 'https://www.aluko-oyebode.com/feed/',
    adapterType: 'RSS_FEED',
    isActive: true,
    pollingFrequencyHours: 4,
    trustScore: 0.95,
    tags: ['legal_analysis', 'banking_supervision', 'aml_defense', 'sec_rules'],
    description: 'Leading Nigerian banking and corporate law firm publishing rapid-response analyses on regulatory shifts within 24 hours of release.',
  },
  {
    id: 'src-bowmans-africa',
    code: 'BOWMANS',
    name: 'Bowmans Africa Cross-Border FinTech Alerts',
    category: 'LAW_FIRM_ADVISORY',
    jurisdiction: 'PAN_AFRICA',
    officialUrl: 'https://bowmanslaw.com',
    feedUrl: 'https://bowmanslaw.com/insights/feed/',
    adapterType: 'RSS_FEED',
    isActive: false,
    pollingFrequencyHours: 6,
    trustScore: 0.92,
    tags: ['cross_border', 'pan_africa_law', 'kenya_ghana_sa', 'taxation'],
    description: 'Pan-African legal network covering regulatory shifts across East, West, and Southern Africa financial corridors.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. VERIFIED FINANCIAL & TECH REGULATORY MEDIA (ZERO-DAY RADAR)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'src-techcabal-radar',
    code: 'TECHCABAL',
    name: 'TechCabal Policy & Regulatory Wire',
    category: 'REGULATORY_NEWS_MEDIA',
    jurisdiction: 'PAN_AFRICA',
    officialUrl: 'https://techcabal.com',
    feedUrl: 'https://techcabal.com/category/fintech/feed/',
    adapterType: 'RSS_FEED',
    isActive: false,
    pollingFrequencyHours: 1,
    trustScore: 0.88,
    tags: ['fintech_news', 'policy_leaks', 'central_bank_hearings', 'license_revocations'],
    description: 'Authoritative African tech intelligence outlet breaking regulatory investigations, executive circular drafts, and policy hearings.',
  },
  {
    id: 'src-techpoint-reg',
    code: 'TECHPOINT',
    name: 'Techpoint Africa Financial Regulations Desk',
    category: 'REGULATORY_NEWS_MEDIA',
    jurisdiction: 'NG',
    officialUrl: 'https://techpoint.africa',
    feedUrl: 'https://techpoint.africa/category/fintech/feed/',
    adapterType: 'RSS_FEED',
    isActive: false,
    pollingFrequencyHours: 2,
    trustScore: 0.88,
    tags: ['fintech_news', 'cbn_directives', 'digital_lending_crackdown'],
    description: 'Covers regulatory crackdowns, consumer litigation, and compliance shifts across West African fintech ecosystems.',
  },
  {
    id: 'src-nairametrics-gazette',
    code: 'NAIRAMETRICS',
    name: 'Nairametrics Financial Regulation & Markets',
    category: 'REGULATORY_NEWS_MEDIA',
    jurisdiction: 'NG',
    officialUrl: 'https://nairametrics.com',
    feedUrl: 'https://nairametrics.com/category/financial-services/feed/',
    adapterType: 'RSS_FEED',
    isActive: true,
    pollingFrequencyHours: 1,
    trustScore: 0.9,
    tags: ['fx_circulars', 'interest_rates', 'banking_penalties', 'cbn_memos'],
    description: 'Real-time financial news portal reporting CBN and SEC executive communiques and circulars as they break.',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SUPRANATIONAL & MULTILATERAL BODIES (Deactivated for Beta Focus)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'src-fatf-giaba',
    code: 'GIABA_FATF',
    name: 'GIABA / FATF West Africa AML/CFT Directives',
    category: 'SUPRANATIONAL_BODY',
    jurisdiction: 'SUPRANATIONAL',
    officialUrl: 'https://www.giaba.org',
    feedUrl: 'https://www.giaba.org/news-and-events/latest-news.html',
    adapterType: 'HTML_SCRAPER',
    isActive: false,
    pollingFrequencyHours: 12,
    trustScore: 1.0,
    tags: ['fatf_greylist', 'aml_typologies', 'terrorist_financing', 'sanctions'],
    description: 'Regional FATF-style body monitoring West African jurisdiction compliance and issuing anti-money laundering recommendations.',
  },
  {
    id: 'src-afcfta-digital',
    code: 'AfCFTA_DIGITAL',
    name: 'AfCFTA Secretariat Digital Trade Protocol',
    category: 'SUPRANATIONAL_BODY',
    jurisdiction: 'PAN_AFRICA',
    officialUrl: 'https://au-afcfta.org',
    feedUrl: 'https://au-afcfta.org/news/',
    adapterType: 'HTML_SCRAPER',
    isActive: false,
    pollingFrequencyHours: 24,
    trustScore: 0.95,
    tags: ['afcfta', 'cross_border_payments', 'papss', 'digital_trade'],
    description: 'African Continental Free Trade Area governance on cross-border payments, digital identities, and PAPSS settlement rails.',
  },
];

export class SourceRegistry {
  public static getAllSources(): RegulatorySourceDefinition[] {
    return VERIFIED_REGULATORY_SOURCES;
  }

  public static getActiveSources(): RegulatorySourceDefinition[] {
    return VERIFIED_REGULATORY_SOURCES.filter((s) => s.isActive);
  }

  public static getSourcesByJurisdiction(jurisdiction: JurisdictionCode): RegulatorySourceDefinition[] {
    return VERIFIED_REGULATORY_SOURCES.filter(
      (s) => s.jurisdiction === jurisdiction || s.jurisdiction === 'PAN_AFRICA'
    );
  }

  public static getSourcesByCategory(category: SourceCategory): RegulatorySourceDefinition[] {
    return VERIFIED_REGULATORY_SOURCES.filter((s) => s.category === category);
  }

  public static getSourceByCode(code: string): RegulatorySourceDefinition | undefined {
    return VERIFIED_REGULATORY_SOURCES.find((s) => s.code.toLowerCase() === code.toLowerCase());
  }
}
