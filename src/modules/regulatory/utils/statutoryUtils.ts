import {
  RegulatoryDomainCode,
  InstrumentType,
} from '@/shared/types';

/**
 * Known synthetic or non-binding items that must NEVER appear in the Regulation Library.
 */
export const FORBIDDEN_LIBRARY_PATTERNS = [
  /DIRECTIVE ON VIRTUAL ASSETS 2026/i,
  /SEC\/CIR\/VASP\/2026\/009/i,
  /OPERATIONAL DIRECTIVE ON CONTACTLESS PAYMENT INTERCHANGE/i,
  /WAYVEPAY/i,
  /SEC Clears Seven New Fintech Firms/i,
  /Accelerated Regulatory Incubation Programme \(ARIP\)/i,
  /Sri Lankan delegation/i,
  /study tour/i,
  /invitation for expression of interest/i,
  /\(eoi\)/i,
  /e-registration now available on the eportal/i,
  /consumer rights & responsibilities/i,
  /civil society\/consumer protection alliances/i,
  /data controllers\/processors registration/i,
  /registered data controllers\/data processors of major importance/i,
  /pre-shipment inspection agent/i,
  /^circular$/i,
  /^federal competition & consumer protection commission$/i,
  /AND THE GENERAL PUBLIC/i,
];

/**
 * Check if an instrument title or citation is a synthetic test stub or non-binding PR notice.
 */
export function isFakeOrNonStatutory(title?: string | null, referenceCode?: string | null): boolean {
  if (!title) return true;
  const t = title.trim();
  const ref = (referenceCode || '').trim();

  // Too short to be a real regulation
  if (t.length < 5) return true;

  for (const pattern of FORBIDDEN_LIBRARY_PATTERNS) {
    if (pattern.test(t) || (ref && pattern.test(ref))) {
      return true;
    }
  }

  return false;
}

/**
 * Deterministically classify an instrument's true Domain and Instrument Type
 * from its title, reference code, regulator, and statutory text.
 * Eradicates the broken fallback where 96% was labeled FinTech & Payments / CIRCULAR DIRECTIVE.
 */
export function classifyInstrumentDomainAndType(inst: {
  title?: string | null;
  shortName?: string | null;
  referenceCode?: string | null;
  regulator?: string | null;
  capturedText?: string | null;
  currentDomain?: string | null;
  currentType?: string | null;
}): { domain: RegulatoryDomainCode; instrumentType: InstrumentType } {
  const combined = [
    inst.title || '',
    inst.shortName || '',
    inst.referenceCode || '',
    inst.regulator || '',
    (inst.capturedText || '').slice(0, 1500),
  ]
    .join(' ')
    .toLowerCase();

  // 1. DOMAIN CLASSIFICATION
  let domain: RegulatoryDomainCode = 'FINTECH_PAYMENTS';

  if (
    combined.includes('sanction') ||
    combined.includes('unscr') ||
    combined.includes('dcb finance') ||
    combined.includes('nsc') ||
    combined.includes('nigsac') ||
    combined.includes('aml') ||
    combined.includes('cft') ||
    combined.includes('money laundering') ||
    combined.includes('counter-terroris') ||
    combined.includes('terrorist financing') ||
    combined.includes('str') ||
    combined.includes('pep') ||
    combined.includes('paek chang-ho') ||
    combined.includes('beneficial ownership') ||
    combined.includes('financial intelligence unit') ||
    combined.includes('nfiu')
  ) {
    domain = 'AML_CFT';
  } else if (
    combined.includes('virtual asset') ||
    combined.includes('crypto') ||
    combined.includes('vasp') ||
    combined.includes('blockchain') ||
    combined.includes('digital asset')
  ) {
    domain = 'CRYPTO_VASP';
  } else if (
    combined.includes('cross-border securities') ||
    combined.includes('securities trading') ||
    combined.includes('capital market') ||
    combined.includes('custody') ||
    combined.includes('sub-custody') ||
    combined.includes('broker-dealer') ||
    combined.includes('depository') ||
    combined.includes('investments and securities') ||
    combined.includes('collective investment') ||
    combined.includes('fund manager') ||
    combined.includes('underwriting') ||
    combined.includes('commodities') ||
    combined.includes('isa 2007') ||
    combined.includes('sec rules') ||
    (inst.regulator?.toUpperCase() === 'SEC' && !combined.includes('consumer'))
  ) {
    domain = 'CAPITAL_MARKETS';
  } else if (
    combined.includes('data protection') ||
    combined.includes('ndpa') ||
    combined.includes('ndpc') ||
    combined.includes('privacy') ||
    combined.includes('data controller') ||
    combined.includes('data processor') ||
    combined.includes('biometric') ||
    combined.includes('cybersecurity') ||
    combined.includes('information security') ||
    inst.regulator?.toUpperCase() === 'NDPC'
  ) {
    domain = 'DATA_PRIVACY_AI';
  } else if (
    combined.includes('digital lending') ||
    combined.includes('money lender') ||
    combined.includes('loan app') ||
    combined.includes('credit bureau') ||
    combined.includes('credit reporting') ||
    combined.includes('debt collection') ||
    combined.includes('consumer credit') ||
    combined.includes('micro-credit')
  ) {
    domain = 'DIGITAL_LENDING';
  } else if (
    combined.includes('consumer protection') ||
    combined.includes('truth in advertising') ||
    combined.includes('arcon') ||
    combined.includes('advertising code') ||
    combined.includes('fccpc') ||
    combined.includes('fccpa') ||
    combined.includes('unfair practices') ||
    combined.includes('deceptive') ||
    combined.includes('customer protection framework') ||
    combined.includes('apr disclosure') ||
    combined.includes('dormant account') ||
    combined.includes('unclaimed balances') ||
    inst.regulator?.toUpperCase() === 'ARCON' ||
    inst.regulator?.toUpperCase() === 'FCCPC'
  ) {
    domain = 'CONSUMER_PROTECTION';
  } else {
    domain = 'FINTECH_PAYMENTS';
  }

  // 2. INSTRUMENT TYPE CLASSIFICATION
  let instrumentType: InstrumentType = 'CIRCULAR_DIRECTIVE';

  if (
    combined.includes('designation of') ||
    combined.includes('sanctions committee') ||
    combined.includes('unscr') ||
    combined.includes('freezing order') ||
    combined.includes('sanctions list')
  ) {
    instrumentType = 'CIRCULAR_DIRECTIVE'; // Sanctions directives
  } else if (
    combined.includes('proposed rules') ||
    combined.includes('exposure draft') ||
    combined.includes('draft guidelines') ||
    combined.includes('consultation paper')
  ) {
    instrumentType = 'OPERATIONAL_GUIDELINE';
  } else if (
    combined.includes('bofia') ||
    combined.includes('isa 2007') ||
    combined.includes('ndpa 2023') ||
    combined.includes('fccpa 2018') ||
    combined.includes('cama 2020') ||
    combined.includes('cbn act') ||
    combined.includes('ndic act') ||
    combined.includes('arcon act 2022') ||
    combined.includes('primary act') ||
    /^(?:the\s+)?(?:banks and other financial institutions|nigerian data protection|investments and securities|federal competition and consumer protection)\s+act/i.test(
      inst.title || ''
    )
  ) {
    instrumentType = 'PRIMARY_ACT';
  } else if (
    combined.includes('regulatory framework') ||
    combined.includes('master framework') ||
    combined.includes('open banking framework')
  ) {
    instrumentType = 'REGULATORY_FRAMEWORK';
  } else if (
    combined.includes('guidelines') ||
    combined.includes('guideline') ||
    combined.includes('standards on') ||
    combined.includes('operating standards')
  ) {
    instrumentType = 'OPERATIONAL_GUIDELINE';
  } else if (
    combined.includes('code of') ||
    combined.includes('regulations') ||
    combined.includes('subsidiary regulation') ||
    combined.includes('customer protection framework')
  ) {
    instrumentType = 'SUBSIDIARY_REGULATION';
  } else {
    instrumentType = 'CIRCULAR_DIRECTIVE';
  }

  return { domain, instrumentType };
}

/**
 * Clean atomic requirement text by stripping portal scraping artifacts,
 * search script fragments, and repetitive header prefixes.
 */
export function sanitizeRequirementText(text: string): string {
  if (!text) return 'Deterministic statutory obligation';

  const cleaned = text
    .replace(/40\)\s*\?\s*true\s*:\s*false["']>.*?SEARCH\s+[A-Za-z\s]+/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/(?:Deutsch|Hausa|Igbo|Yoruba|French|Arabic|English)\s*\|?\s*/gi, '')
    .replace(/\|\s*/g, ' ')
    .replace(/^(?:[|\s:–-]*Section\s+[\d\.]+\s*[:–-]?\s*)/i, '')
    .replace(/^[|\s:–-]+/g, '')
    .replace(/^Section\s+[\d\.]+\s*[:–-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 5) {
    return 'Statutory compliance obligation under governing regulatory framework';
  }

  return cleaned;
}

/**
 * Cleans duplicate and repetitive section titles (e.g. eliminates "Section 1.0 Section 1.0").
 */
export function sanitizeSectionHeading(sectionRef: string, heading?: string | null): string {
  const refClean = (sectionRef || '').trim();
  const rawHeading = (heading || '').trim();

  if (!rawHeading || rawHeading.toLowerCase() === 'null') {
    return `Statutory Provisions of ${refClean || 'Section'}`;
  }

  // Strip duplicate section reference prefix if already present in heading
  let cleaned = rawHeading;
  if (refClean) {
    const escapedRef = refClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const prefixRegex = new RegExp(`^${escapedRef}\\s*[:–-]?\\s*`, 'i');
    cleaned = cleaned.replace(prefixRegex, '').trim();
  }

  // Strip bare redundant "Section X.X" if repeated
  cleaned = cleaned.replace(/^Section\s+[\d\.]+\s*[:–-]?\s*/i, '').trim();

  if (!cleaned || cleaned.toLowerCase() === refClean.toLowerCase()) {
    return `Statutory Provisions of ${refClean}`;
  }

  return cleaned;
}

/**
 * Format statutory human identifier (e.g., OBL-CBN-2024-001)
 * Guarantees zero raw database UUIDs are shown to users.
 */
export function formatStatutoryIdentifier(
  regulator: string,
  year: number | string | undefined | null,
  sequenceOrId: number | string
): string {
  const reg = (regulator || 'REG').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const yr = year ? String(year).slice(-4) : new Date().getFullYear().toString();

  if (typeof sequenceOrId === 'string' && /^OBL-[A-Z0-9]+-\d{4}-\d+$/i.test(sequenceOrId)) {
    return sequenceOrId.toUpperCase();
  }

  let seqStr = '001';
  if (typeof sequenceOrId === 'number') {
    seqStr = sequenceOrId.toString().padStart(3, '0');
  } else if (typeof sequenceOrId === 'string') {
    if (/^\d+$/.test(sequenceOrId)) {
      seqStr = sequenceOrId.padStart(3, '0');
    } else {
      let hash = 0;
      for (let i = 0; i < sequenceOrId.length; i++) {
        hash = (hash << 5) - hash + sequenceOrId.charCodeAt(i);
        hash |= 0;
      }
      const positiveHash = (Math.abs(hash) % 900) + 100;
      seqStr = positiveHash.toString();
    }
  }

  return `OBL-${reg}-${yr}-${seqStr}`;
}

export interface DynamicAssessmentCriterion {
  id?: string;
  type: 'Core Criteria' | 'Best Practice';
  text: string;
  evidenceRequired: string;
  isMandatory?: boolean;
}

/**
 * Generate 2 to 4 genuine, obligation-specific assessment criteria testable statements.
 * Eradicates the hardcoded 3-item Mad-Libs template.
 */
export function generateObligationCriteria(params: {
  title: string;
  summary?: string;
  verbatimQuote?: string;
  regulator?: string;
  ruleType?: string;
}): DynamicAssessmentCriterion[] {
  const { title, summary, verbatimQuote, regulator = 'CBN' } = params;
  const combined = `${title} ${summary || ''} ${verbatimQuote || ''}`.toLowerCase();

  const regName = (regulator || 'Regulator').toUpperCase();

  // 1. Sanctions / Asset Freeze / UN Designations
  if (
    combined.includes('sanction') ||
    combined.includes('freeze') ||
    combined.includes('designated entity') ||
    combined.includes('dcb finance') ||
    combined.includes('unscr') ||
    combined.includes('nigsac')
  ) {
    return [
      {
        type: 'Core Criteria',
        text: 'Automated core banking and transaction monitoring engines immediately flag any account, counterparty, or transaction involving designated entities without prior notice.',
        evidenceRequired: 'Screening engine configuration, watchlist rules, and real-time transaction intercept audit logs.',
        isMandatory: true,
      },
      {
        type: 'Core Criteria',
        text: 'Documented asset freezing protocols are executed to immediately block all funds, financial assets, and economic resources belonging to designated entities.',
        evidenceRequired: 'Formal freeze order notification, locked account ledger register, and compliance officer authorization record.',
        isMandatory: true,
      },
      {
        type: 'Core Criteria',
        text: `Immediate formal notification is submitted to the Nigeria Sanctions Committee (NigSAC) and the ${regName}/NFIU within the mandated statutory deadline.`,
        evidenceRequired: 'Electronic filing transmission receipt, email delivery logs to info@nigsac.gov.ng, and NFIU STR confirmation.',
        isMandatory: true,
      },
      {
        type: 'Best Practice',
        text: 'Periodic supervisory audits and ongoing screening logs are maintained in an immutable audit ledger for banking examination readiness.',
        evidenceRequired: 'Archived supervisory screening logs and quarterly compliance committee review minutes.',
        isMandatory: false,
      },
    ];
  }

  // 2. Reporting / Disclosure / Notification Mandate
  if (
    combined.includes('report') ||
    combined.includes('submit') ||
    combined.includes('disclose') ||
    combined.includes('notify') ||
    combined.includes('filing') ||
    combined.includes('timeline')
  ) {
    return [
      {
        type: 'Core Criteria',
        text: `Operational standard operating procedures (SOPs) mandate electronic compilation and formal submission of required statutory returns to ${regName} within prescribed deadlines.`,
        evidenceRequired: 'Approved operational SOP and documented supervisory submission calendar.',
        isMandatory: true,
      },
      {
        type: 'Core Criteria',
        text: `Verification and dual-authorization sign-off by the Chief Compliance Officer or designated regulatory lead prior to statutory transmission.`,
        evidenceRequired: 'Executive sign-off sheet, dual-key verification logs, and submission acknowledgment receipt.',
        isMandatory: true,
      },
      {
        type: 'Best Practice',
        text: 'Automated alerts and escalation thresholds are configured at least 5 business days prior to the binding regulatory deadline.',
        evidenceRequired: 'Compliance calendar system notifications and task management logs.',
        isMandatory: false,
      },
    ];
  }

  // 3. Prohibitions & Negative Covenants
  if (
    combined.includes('prohibit') ||
    combined.includes('shall not') ||
    combined.includes('must not') ||
    combined.includes('forbidden') ||
    combined.includes('unlawful')
  ) {
    return [
      {
        type: 'Core Criteria',
        text: `Technical barriers, core system validation rules, and commercial product constraints prevent execution of prohibited operations.`,
        evidenceRequired: 'System validation rule configuration, architectural design documents, and product rule settings.',
        isMandatory: true,
      },
      {
        type: 'Core Criteria',
        text: 'Documented internal policy explicitly incorporates statutory prohibition with mandatory employee disciplinary sanctions for non-compliance.',
        evidenceRequired: 'Board-approved compliance policy manual and annual staff training attestations.',
        isMandatory: true,
      },
      {
        type: 'Best Practice',
        text: 'Automated real-time exception reporting alerts the Compliance team upon any attempted override or policy violation.',
        evidenceRequired: 'Tamper-evident exception monitoring logs and incident escalation tickets.',
        isMandatory: false,
      },
    ];
  }

  // 4. Capital Adequacy / Liquidity / Reserve Ratios
  if (
    combined.includes('capital') ||
    combined.includes('liquidity') ||
    combined.includes('reserve') ||
    combined.includes('interchange') ||
    combined.includes('settlement')
  ) {
    return [
      {
        type: 'Core Criteria',
        text: `Institutional capital and liquidity monitoring ensures daily compliance with statutory reserve ratios and minimum capital floors.`,
        evidenceRequired: 'Daily treasury liquidity computation sheets and monthly prudential returns.',
        isMandatory: true,
      },
      {
        type: 'Core Criteria',
        text: 'Daily reconciliation of client settlement balances and ring-fenced custodial holdings against central switch and depository records.',
        evidenceRequired: 'Signed settlement reconciliation reports and bank depository confirmation statements.',
        isMandatory: true,
      },
      {
        type: 'Best Practice',
        text: 'Quarterly stress-testing and board risk committee reviews evaluating capital adequacy under adverse economic scenarios.',
        evidenceRequired: 'Board risk committee minutes and executive capital management plans.',
        isMandatory: false,
      },
    ];
  }

  // 5. Default General Compliance Governance Mandate
  const specificDuty = title.length > 5 && !title.toLowerCase().startsWith('directive')
    ? title
    : summary && summary.length > 10
    ? summary.slice(0, 90)
    : 'statutory supervisory mandate';

  return [
    {
      type: 'Core Criteria',
      text: `Approved internal operating manuals and department standard operating procedures (SOPs) operationalize compliance with: ${specificDuty}.`,
      evidenceRequired: 'Board-approved internal operational manual, policy document, or standard operating procedure.',
      isMandatory: true,
    },
    {
      type: 'Core Criteria',
      text: 'Supervisory review checkpoints and periodic compliance testing verify operational adherence in daily transaction workflows.',
      evidenceRequired: 'Compliance monitoring review sheets, quality assurance logs, and internal audit reports.',
      isMandatory: true,
    },
    {
      type: 'Best Practice',
      text: 'Tamper-evident audit trails and transaction documentation are retained in accordance with statutory record-keeping periods.',
      evidenceRequired: 'Immutable audit log archives and regulatory inspection register.',
      isMandatory: false,
    },
  ];
}
