import {
  RegulatorCode,
  LicenseType,
  PaymentRail,
  RadarPriority
} from '@/shared/types';
import { DeterministicMetadataResult } from '../types';
import { ExtractedCircularStructure } from '../types/schema';

/**
 * Deterministic Circular Metadata & Entity/Rail Targeting Engine (Epic 10)
 * Zero LLM hallucinations for reference codes, dates, deadlines, and rail classifications.
 */
export class DeterministicMetadataExtractor {
  /**
   * Deterministically extracts metadata from structure and text
   */
  public extractMetadata(
    structure: ExtractedCircularStructure,
    manualOverrides?: {
      regulator?: RegulatorCode;
      circularNumber?: string;
      subject?: string;
      publicationDate?: string;
    }
  ): DeterministicMetadataResult {
    const text = structure.rawText;

    // 1. Regulator Identification
    const regulatorCode =
      manualOverrides?.regulator ||
      this.detectRegulator(text, structure.regulatorCandidate);

    // 2. Circular Reference Code
    const circularNumber =
      manualOverrides?.circularNumber ||
      structure.referenceCodeCandidate ||
      this.detectReferenceCode(text, regulatorCode);

    // 3. Date Parsing (Publication, Effective, Deadline)
    const publicationDate = manualOverrides?.publicationDate || this.detectPublicationDate(text);
    const effectiveDate = this.detectEffectiveDate(text, publicationDate);
    const statutoryDeadline = this.detectStatutoryDeadline(text, publicationDate, effectiveDate);

    // 4. Priority & Risk Level based on deadline urgency & severe penalties
    const { priority, enforcementRiskLevel } = this.calculatePriorityAndRisk(
      text,
      statutoryDeadline,
      publicationDate
    );

    // 5. Targeted License Types & Affected Payment Rails
    const targetedLicenseTypes = this.detectTargetedLicenses(text, structure.addresseeText);
    const affectedPaymentRails = this.detectAffectedPaymentRails(text);

    // 6. Universal Mandate Check
    const appliesUniversally = this.checkUniversalApplicability(text, structure.addresseeText);

    // 7. Subject & Summary
    const subject = manualOverrides?.subject || structure.subject || 'Regulatory Directive';
    const summary = this.generateDeterministicSummary({
      regulatorCode,
      circularNumber,
      subject,
      statutoryDeadline,
      targetedLicenseTypes,
      affectedPaymentRails,
      appliesUniversally,
    });

    return {
      circularNumber,
      regulatorCode,
      publicationDate,
      effectiveDate,
      statutoryDeadline,
      priority,
      enforcementRiskLevel,
      targetedLicenseTypes,
      affectedPaymentRails,
      appliesUniversally,
      subject,
      summary,
      signatoryDepartment: structure.issuingDepartment,
      signatoryName: structure.signatoryName,
    };
  }

  public detectRegulator(text: string, candidate?: string | null): RegulatorCode {
    if (candidate && ['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(candidate)) {
      return candidate as RegulatorCode;
    }

    if (/Central Bank of Nigeria|\bCBN\b|Bank Supervision Department|PSMD|Payments System Management/i.test(text)) {
      return 'CBN';
    }
    if (/Securities and Exchange Commission|\bSEC\b|Capital Market Operator|VASP Guideline/i.test(text)) {
      return 'SEC';
    }
    if (/Advertising Regulatory Council|\bARCON\b|Advertising Standards Panel|\bASP\b/i.test(text)) {
      return 'ARCON';
    }
    if (/Nigeria Data Protection Commission|\bNDPC\b|\bNDPA\b|Data Protection Act/i.test(text)) {
      return 'NDPC';
    }
    if (/Federal Competition (?:&|and) Consumer Protection|\bFCCPC\b|Digital Lending Framework/i.test(text)) {
      return 'FCCPC';
    }
    if (/Nigerian Financial Intelligence Unit|\bNFIU\b|Suspicious Transaction Report/i.test(text)) {
      return 'NFIU';
    }
    if (/Nigeria Deposit Insurance|\bNDIC\b|Deposit Insurance Scheme/i.test(text)) {
      return 'NDIC';
    }
    if (/Bank of Ghana|\bBOG\b|Republic of Ghana/i.test(text)) {
      return 'BOG';
    }
    if (/Central Bank of Kenya|\bCBK\b/i.test(text)) {
      return 'CBK';
    }
    if (/South African Reserve Bank|\bSARB\b/i.test(text)) {
      return 'SARB';
    }

    return 'CBN'; // Default regulator if unspecified in Nigerian FinTech domain
  }

  public detectReferenceCode(text: string, regulator: RegulatorCode): string {
    const patterns: Record<RegulatorCode, RegExp[]> = {
      CBN: [
        /\b((?:PSM|BPS|BSD|FPR|FMD|TED|PSMD|COD|OFI|DIR)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(?:Ref(?:\s*No)?[:\.\s]+)([A-Z0-9\/\-_]{6,40})\b/i,
      ],
      SEC: [
        /\b(SEC\/(?:DIR|LEGAL|VASP|REG|CIR)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(SEC\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      ARCON: [
        /\b(ARCON\/(?:ASP|DIR|REG)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(ARCON\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      NDPC: [
        /\b(NDPC\/(?:DIR|CIR|REG)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(NDPC\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      FCCPC: [
        /\b(FCCPC\/(?:DIR|REG|CIR)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(FCCPC\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      NFIU: [
        /\b(NFIU\/(?:DIR|CIR|STR)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(NFIU\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      NDIC: [
        /\b(NDIC\/(?:DIR|CIR|REG|DIS)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(NDIC\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      BOG: [
        /\b(BOG\/(?:PSD|DIR|FMD|REG)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(BOG\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      CBK: [
        /\b(CBK\/(?:BSD|NPS|DIR|REG)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(CBK\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
      SARB: [
        /\b(SARB\/(?:NPS|DIR|REG)\/[A-Z0-9\/\-_]+)\b/i,
        /\b(SARB\/[A-Z0-9\/\-_]{5,35})\b/i,
      ],
    };

    const regulatorPatterns = patterns[regulator] || patterns.CBN;
    for (const regex of regulatorPatterns) {
      const match = text.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    // Generic fallback: check any standard circular header line
    const fallbackMatch = text.match(/\b([A-Z]{3,4}\/[A-Z0-9\/\-_]{5,35})\b/);
    if (fallbackMatch) {
      return fallbackMatch[1].trim();
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${regulator}/CIR/${todayStr}/001`;
  }

  public detectPublicationDate(text: string): string {
    const dateRegexes = [
      // "January 15, 2026" or "15th January, 2026" or "15 January 2026"
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})\b/i,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
      // "2026-01-15" or "15/01/2026"
      /\b(\d{4})-(\d{2})-(\d{2})\b/,
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
    ];

    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };

    // Scan top 40 lines first
    const lines = text.split(/\r?\n/).slice(0, 40).join('\n');

    for (const regex of dateRegexes) {
      const match = lines.match(regex);
      if (match) {
        if (months[match[2]?.toLowerCase()]) {
          // "15th January, 2026"
          const day = match[1].padStart(2, '0');
          const month = months[match[2].toLowerCase()];
          const year = match[3];
          return `${year}-${month}-${day}`;
        } else if (months[match[1]?.toLowerCase()]) {
          // "January 15, 2026"
          const day = match[2].padStart(2, '0');
          const month = months[match[1].toLowerCase()];
          const year = match[3];
          return `${year}-${month}-${day}`;
        } else if (match[1].length === 4) {
          // "2026-01-15"
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else if (match[3].length === 4) {
          // "15/01/2026"
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
      }
    }

    return new Date().toISOString().slice(0, 10);
  }

  public detectEffectiveDate(text: string, publicationDate: string): string {
    if (/immediate effect|with effect from today|takes effect immediately/i.test(text)) {
      return publicationDate;
    }

    const effectiveMatch = text.match(
      /(?:effective(?: date)?|takes effect from|commencing from|comes into force on)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2})/i
    );

    if (effectiveMatch) {
      const parsed = this.parseDateString(effectiveMatch[1]);
      if (parsed) return parsed;
    }

    return publicationDate;
  }

  public detectStatutoryDeadline(
    text: string,
    publicationDate: string,
    effectiveDate: string
  ): string | null {
    // 1. Explicit deadline dates (e.g. "no later than March 31, 2026", "deadline of 30th April 2026")
    const explicitDeadlineMatch = text.match(
      /(?:deadline|no later than|latest by|mandatorily comply by|on or before)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|\d{4}-\d{2}-\d{2})/i
    );

    if (explicitDeadlineMatch) {
      const parsed = this.parseDateString(explicitDeadlineMatch[1]);
      if (parsed) return parsed;
    }

    // 2. Relative day windows (e.g. "within 14 days", "within thirty (30) days", "within 72 hours")
    const relativeMatch = text.match(
      /within\s+(\d+|seven|fourteen|twenty|thirty|sixty|ninety|one hundred and eighty)\s*(?:\(\d+\))?\s*(days|calendar days|business days|hours|months)/i
    );

    if (relativeMatch) {
      const numStr = relativeMatch[1].toLowerCase();
      const unit = relativeMatch[2].toLowerCase();

      let daysToAdd = 30;
      const wordToNum: Record<string, number> = {
        seven: 7,
        fourteen: 14,
        twenty: 20,
        thirty: 30,
        sixty: 60,
        ninety: 90,
      };

      if (!isNaN(parseInt(numStr, 10))) {
        daysToAdd = parseInt(numStr, 10);
      } else if (wordToNum[numStr]) {
        daysToAdd = wordToNum[numStr];
      }

      if (unit.includes('hour')) {
        daysToAdd = Math.max(1, Math.ceil(daysToAdd / 24));
      } else if (unit.includes('month')) {
        daysToAdd = daysToAdd * 30;
      }

      const baseDate = new Date(publicationDate);
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      return baseDate.toISOString().slice(0, 10);
    }

    return null;
  }

  public calculatePriorityAndRisk(
    text: string,
    statutoryDeadline: string | null,
    publicationDate: string
  ): {
    priority: RadarPriority;
    enforcementRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_SANCTION_RISK';
  } {
    // Check for severe sanction language
    const hasSanctionRisk =
      /suspension of license|revocation of license|severance from NIBSS|exclusion from settlement|criminal liability|monetary penalty of ₦/i.test(
        text
      );

    if (!statutoryDeadline) {
      if (hasSanctionRisk) {
        return { priority: 'HIGH', enforcementRiskLevel: 'HIGH' };
      }
      return { priority: 'MEDIUM', enforcementRiskLevel: 'MEDIUM' };
    }

    const today = new Date();
    const deadline = new Date(statutoryDeadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7 || hasSanctionRisk && diffDays <= 14) {
      return {
        priority: 'CRITICAL_EMERGENCY',
        enforcementRiskLevel: 'CRITICAL_SANCTION_RISK',
      };
    }

    if (diffDays <= 14) {
      return {
        priority: 'HIGH',
        enforcementRiskLevel: 'HIGH',
      };
    }

    if (diffDays <= 30) {
      return {
        priority: 'MEDIUM',
        enforcementRiskLevel: 'MEDIUM',
      };
    }

    return {
      priority: 'LOW',
      enforcementRiskLevel: 'LOW',
    };
  }

  public detectTargetedLicenses(text: string, addresseeText?: string | null): LicenseType[] {
    const combined = `${addresseeText || ''} ${text}`;
    const licenses: Set<LicenseType> = new Set();

    // Mapping dictionary for Nigerian regulatory license taxonomy
    if (/payment solution service|PSSP|payment gateway|merchant aggregator/i.test(combined)) {
      licenses.add('PAYMENT_SOLUTION_SERVICES_PSSP');
    }
    if (/switching and processing|switches|switching compan|card scheme/i.test(combined)) {
      licenses.add('SWITCHING_AND_PROCESSING');
    }
    if (/mobile money operator|MMO|mobile payment operator/i.test(combined)) {
      licenses.add('MOBILE_MONEY_OPERATOR_MMO');
    }
    if (/payment terminal service provider|PTSP|POS terminal deployment/i.test(combined)) {
      licenses.add('PAYMENT_TERMINAL_SERVICE_PROVIDER_PTSP');
    }
    if (/deposit money bank|commercial bank|DMBs/i.test(combined)) {
      licenses.add('COMMERCIAL_BANK');
    }
    if (/merchant bank/i.test(combined)) {
      licenses.add('MERCHANT_BANK');
    }
    if (/payment service bank|PSB/i.test(combined)) {
      licenses.add('PAYMENT_SERVICE_BANK');
    }
    if (/microfinance bank|MFB/i.test(combined)) {
      licenses.add('MICROFINANCE_BANK_NATIONAL');
      licenses.add('MICROFINANCE_BANK_STATE');
      licenses.add('MICROFINANCE_BANK_UNIT');
    }
    if (/finance compan/i.test(combined)) {
      licenses.add('FINANCE_COMPANY');
    }
    if (/super agent|agent banking network/i.test(combined)) {
      licenses.add('SUPER_AGENT');
    }
    if (/digital lender|online credit provider|moneylender|credit app/i.test(combined)) {
      licenses.add('DIGITAL_LENDER_FCCPC_REGISTERED');
    }
    if (/virtual asset service provider|VASP|crypto|digital asset exchange/i.test(combined)) {
      licenses.add('CRYPTO_VASP_SEC_APPROVED');
    }
    if (/digital sub-broker|sub-broker/i.test(combined)) {
      licenses.add('SEC_REGISTERED_DIGITAL_SUB_BROKER');
    }
    if (/robo-advisor|automated advisory/i.test(combined)) {
      licenses.add('SEC_REGISTERED_ROBO_ADVISOR');
    }

    return Array.from(licenses);
  }

  public detectAffectedPaymentRails(text: string): PaymentRail[] {
    const rails: Set<PaymentRail> = new Set();

    if (/\bNIBSS\b|\bNIP\b|instant transfer|interbank transfer/i.test(text)) {
      rails.add('NIBSS_NIP');
    }
    if (/CentralPay|Central\s+Pay/i.test(text)) {
      rails.add('NIBSS_CENTRAL_PAY');
    }
    if (/Interswitch|WebPAY|Web\s+Pay/i.test(text)) {
      rails.add('INTERSWITCH_WEBPAY');
    }
    if (/Paystack/i.test(text)) {
      rails.add('PAYSTACK');
    }
    if (/Flutterwave/i.test(text)) {
      rails.add('FLUTTERWAVE');
    }
    if (/direct debit|ACH|automated clearing house|NACS/i.test(text)) {
      rails.add('DIRECT_DEBIT_ACH');
    }
    if (/Verve|Verve card/i.test(text)) {
      rails.add('CARD_ACQUIRING_VERVE');
    }
    if (/Mastercard|Visa|card acquiring|POS transaction|contactless card/i.test(text)) {
      rails.add('CARD_ACQUIRING_MASTERCARD_VISA');
    }
    if (/USSD|\*966\#|\*737\#|telecom short code/i.test(text)) {
      rails.add('USSD');
    }
    if (/agent banking|cash-in cash-out|CICO|agency banking|POS cash/i.test(text)) {
      rails.add('AGENT_BANKING_CASH_IN_OUT');
    }

    return Array.from(rails);
  }

  public checkUniversalApplicability(text: string, addresseeText?: string | null): boolean {
    const combined = `${addresseeText || ''} ${text}`;
    return (
      /all financial institutions|all regulated entities|all deposit money banks, payment service providers, and other financial institutions|all licensed operators/i.test(
        combined
      ) ||
      /BOFIA 2020\s+applies to all/i.test(combined)
    );
  }

  /**
   * General text parsing for statutory directives (extracts fines, limits, citations, timeframes, and prudential metrics)
   */
  public static parseStatutoryDirectives(text: string) {
    const finesMatch =
      text.match(/(?:sanctions?|penalt(?:y|ies)|fine|forfeit(?:ure)?)[^0-9\n]{0,60}(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+\s*(?:million|billion|m|b)?)/i) ||
      text.match(/(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+\s*(?:million|billion|m|b)?)[^.\n]{0,60}(?:sanctions?|penalt(?:y|ies)|fine)/i) ||
      text.match(/(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?)/i);

    const singleLimitMatch =
      text.match(/(?:transaction ceiling|single transaction|single limit|limit per single|limit per transaction|without PIN)[^0-9\n]{0,60}(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)/i) ||
      text.match(/(?:maximum of|up to)\s*(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)[^.\n]{0,60}(?:per single|single|per transaction)/i) ||
      text.match(/(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)[^.\n]{0,60}(?:per single|single transaction|per transaction)/i);

    const dailyLimitMatch =
      text.match(/(?:daily\s+transaction\s+limit|cumulative\s+daily|daily\s+cumulative|daily\s+limit|per\s+day\s+limit)[^0-9\n]{0,60}(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)/i) ||
      text.match(/(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)[^.\n]{0,40}(?:\/day|per day|daily cumulative|cumulative daily)/i);

    const timeframeMatch = text.match(/\b(?:within|not later than)\s*(\d+\s*(?:hours?|days?|business days?|weeks?|months?))\b/i);

    const citations = text.match(/\b(?:Section|§)\s*\d+[A-Za-z0-9\(\)]*|\b(?:BOFIA|ISA|NDPA|FCCPA|CAMA|MLA|TPA|CBN Act)\b(?:\s+(?:20\d\d|19\d\d))?/gi) || [];

    const sentences = text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && /\b(?:shall|must|is required to|are required to|prohibited from|freeze without delay|hereby directs|mandated to|comply with|cease and desist|maintain)\b/i.test(s));

    const has2FA = /2fa|two-factor|pin|multi-factor|customer verification method/i.test(text);

    // Dynamic Prudential & Solvency metrics
    const hasPrudentialCapital = /capital adequacy|minimum capital|paid-up capital|solvency buffer|liquidity ratio|reserve requirement|cash reserve ratio|\bcrr\b|\bldr\b|\bcar\b/i.test(text);
    const capitalRatioMatch = text.match(/\b(?:CAR|capital adequacy ratio|liquidity ratio|cash reserve ratio|CRR|LDR)\s*(?:of|is|at|shall be not less than)?\s*(\d+(?:\.\d+)?%)/i);
    const minCapitalMatch = text.match(/(?:minimum (?:paid-up )?capital|capital base|capital requirement)[^0-9\n]{0,40}(?:₦|NGN|\bN)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+\s*(?:billion|million|trillion))/i);

    // Dynamic domain triggers
    const hasUnlicensedProhibition = /unlicensed|unauthorized (?:entity|operator|institution)|illegal operator|cease and desist|prohibit|disconnection/i.test(text);
    const hasDataProtection = /data protection|ndpa|ndpc|data breach|privacy policy|\bdpo\b|personal data/i.test(text);
    const hasFxMandate = /foreign exchange|\bfx\b|remittance|imto|diaspora|repatriation|export proceeds/i.test(text);
    const hasConsumerProtection = /consumer protection|excess charge|unauthorized deduction|dispute resolution|tariff cap|fee cap/i.test(text);

    // Open-world corporate & operational event archetypes
    const hasRestructuringOrLayoff = /layoff|layoffs|redundanc|workforce reduction|retrenchment|strip down|downscale|downsized|downsizing|shut down|close operations|closes us|closed us|closure of us|closure of subsidiary|employee exit|severance|staff cut/i.test(text);
    const hasMergerAcquisition = /merger|acquisition|acquire|acquired|takeover|equity stake|divestment|divestiture|consolidation|joint venture|series [a-z]|seed round|equity funding/i.test(text);
    const hasLitigationOrEnforcement = /court injunction|lawsuit|sues\b|sued\b|judicial ruling|arbitration|national industrial court|federal high court|supreme court|contempt of court|winding up petition|asset recovery|legal dispute/i.test(text);
    const hasSystemOutage = /outage|system downtime|service disruption|infrastructure failure|api degradation|cloud failure|incident response|switch failure|unscheduled downtime/i.test(text);
    const hasExecutiveTransition = /appointed new|resignation|stepped down|board of directors|executive transition|new ceo|new md|removal of director|managing director resigns|managing director appointed/i.test(text);
    const hasFraudSecurity = /unauthorized debit|cyber attack|security breach|ransomware|insider fraud|phishing wave|credential stuffing|zero-day exploit/i.test(text);

    // Entity recognition across Nigerian & African FinTech/Banking ecosystem
    const knownInstitutions = [
      'Moniepoint', 'Flutterwave', 'Paystack', 'OPay', 'Kuda', 'FairMoney', 'Carbon',
      'Interswitch', 'Nomba', 'Paga', 'Chipper Cash', 'PalmPay', 'Piggyvest', 'Cowrywise',
      'Access Bank', 'Zenith Bank', 'First Bank', 'GTBank', 'Guaranty Trust Bank',
      'United Bank for Africa', 'UBA', 'Stanbic IBTC', 'Fidelity Bank', 'Wema Bank',
      'Sterling Bank', 'Union Bank', 'Ecobank', 'Polaris Bank', 'Providus Bank',
      'Jaiz Bank', 'Taj Bank', 'Lotus Bank'
    ];
    const detectedEntities: string[] = [];
    for (const inst of knownInstitutions) {
      if (new RegExp(`\\b${inst}\\b`, 'i').test(text)) {
        detectedEntities.push(inst);
      }
    }

    // Salient operative & factual sentences from article/circular body
    const factSentences = text
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.replace(/^(?:Market\s*&\s*Policy\s*Reporting:?|Legal\s*Analysis:?|Dispatch:?|Client\s*Briefing:?)\s*/i, '').trim())
      .filter((s) =>
        s.length > 25 &&
        s.length < 350 &&
        !/^ADVERTISING REGULATORY|^CENTRAL BANK|^SECURITIES AND EXCHANGE|^FEDERAL COMPETITION|^Date:|^Notice Reference:|^Title:|^Official (?:Link|Document)/i.test(s) &&
        /\b(?:announced|confirmed|disclosed|reported|decided|suspended|terminated|commenced|approved|instituted|directed|executed|experienced|faced|laid off|closed|downsized|acquired|filed|entered into|agreed to|appointed|stepped down|realigned)\b/i.test(s)
      );

    const mergedSentences = sentences.length > 0 ? sentences : factSentences;

    return {
      fine: finesMatch ? finesMatch[1] : null,
      singleLimit: singleLimitMatch ? singleLimitMatch[1] : null,
      dailyLimit: dailyLimitMatch ? dailyLimitMatch[1] : null,
      timeframe: timeframeMatch ? timeframeMatch[1] : null,
      citations: Array.from(new Set(citations)),
      hasCriminalLiability: /criminal liability|imprisonment|prosecution|personal liability/i.test(text),
      hasAssetFreeze: /freeze without delay|asset freeze|freezing of|designated person/i.test(text),
      has2FA,
      hasTwoFactorPrompt: has2FA,
      hasPrudentialCapital,
      capitalRatio: capitalRatioMatch ? capitalRatioMatch[1] : null,
      minimumCapital: minCapitalMatch ? minCapitalMatch[1] : null,
      hasUnlicensedProhibition,
      hasDataProtection,
      hasFxMandate,
      hasConsumerProtection,
      hasRestructuringOrLayoff,
      hasMergerAcquisition,
      hasLitigationOrEnforcement,
      hasSystemOutage,
      hasExecutiveTransition,
      hasFraudSecurity,
      detectedEntities: Array.from(new Set(detectedEntities)),
      operativeSentences: mergedSentences.slice(0, 4),
    };
  }

  public static generateExecutiveSynthesis(params: {
    regulatorCode: RegulatorCode;
    circularNumber: string;
    subject: string;
    publicationDate?: string | null;
    statutoryDeadline?: string | null;
    targetedLicenseTypes?: LicenseType[];
    affectedPaymentRails?: PaymentRail[];
    appliesUniversally?: boolean;
    rawText?: string;
  }): {
    executiveSummary: string;
    keyPoints: string[];
    departments: string[];
  } {
    const regNames: Record<RegulatorCode, string> = {
      CBN: 'Central Bank of Nigeria',
      SEC: 'Securities and Exchange Commission',
      NFIU: 'Nigerian Financial Intelligence Unit',
      NDPC: 'Nigeria Data Protection Commission',
      FCCPC: 'Federal Competition and Consumer Protection Commission',
      ARCON: 'Advertising Regulatory Council of Nigeria',
      NDIC: 'Nigeria Deposit Insurance Corporation',
      BOG: 'Bank of Ghana',
      CBK: 'Central Bank of Kenya',
      SARB: 'South African Reserve Bank',
    };

    const regStatutes: Record<RegulatorCode, string> = {
      CBN: 'Banks and Other Financial Institutions Act (BOFIA 2020) and Payments System Management Regulations',
      SEC: 'Investments and Securities Act (ISA 2007) and Rules on Digital Sub-Brokers & VASPs',
      NFIU: 'Money Laundering (Prevention and Prohibition) Act (MLA 2022) and Terrorism Prevention Act',
      NDPC: 'Nigeria Data Protection Act (NDPA 2023) and General Application Guidelines',
      FCCPC: 'Federal Competition and Consumer Protection Act (FCCPA 2018) and Digital Lending Guidelines',
      ARCON: 'Advertising Regulatory Council of Nigeria Act (ARCON Act 2022) and Nigerian Code of Advertising Practice',
      NDIC: 'Nigeria Deposit Insurance Corporation Act 2023 and Supervisory Resolution Protocols',
      BOG: 'Payment Systems and Services Act 2019 (Act 987) and Bank of Ghana Directives',
      CBK: 'Central Bank of Kenya Act and National Payment System Regulations',
      SARB: 'South African Reserve Bank Act and National Payment System Act',
    };

    const fullRegName = regNames[params.regulatorCode] || params.regulatorCode;
    const statute = regStatutes[params.regulatorCode] || 'Statutory Supervisory Mandates';
    const deadlineStr = params.statutoryDeadline
      ? `Mandatory compliance must be achieved by ${params.statutoryDeadline}, after which supervisory default proceedings and statutory penalties take effect.`
      : 'Compliance enforcement takes immediate effect upon issuance, with ongoing monitoring of all covered institutional operations.';

    const universalClause = params.appliesUniversally
      ? 'Universal mandate applying across all licensed financial institutions. '
      : '';

    const combinedText = `${params.subject || ''} ${params.rawText || ''}`;
    const parsed = DeterministicMetadataExtractor.parseStatutoryDirectives(combinedText);

    const primaryCitation = parsed.citations.length > 0
      ? parsed.citations.join(' and ')
      : statute;

    // 1. Paragraph 1: Statutory Authority & Scope
    const entityMention = parsed.detectedEntities.length > 0
      ? ` The intelligence briefing directly involves ${parsed.detectedEntities.join(', ')}.`
      : '';
    let p1 = `The ${fullRegName} (${params.regulatorCode}) issued Circular Directive ${params.circularNumber} concerning '${params.subject}', establishing statutory compliance obligations under ${primaryCitation}. ${universalClause}This regulatory issuance establishes mandatory supervisory baselines binding covered institutional operations and supervisory compliance registers.${entityMention}`;
    if (parsed.operativeSentences.length > 0) {
      p1 += ` Specifically, the directive establishes that: ${parsed.operativeSentences[0]}`;
    }

    // 2. Paragraph 2: Operational Mandates & Control Framework (Dynamic Domain Branching)
    let p2Parts: string[] = [];
    if (parsed.operativeSentences.length > 1) {
      p2Parts.push(parsed.operativeSentences.slice(1, 3).join(' '));
    }

    if (parsed.hasAssetFreeze) {
      p2Parts.push(`Under statutory sanctions provisions, covered institutions must immediately freeze without delay all funds, financial assets, and economic resources connected to designated targets, and file mandatory statutory notifications${parsed.timeframe ? ` within ${parsed.timeframe}` : ' promptly'}. Operational switches and payment rails must intercept and reject any payment attempt, settlement transfer, or clearing instruction referencing designated entities.`);
    } else if (parsed.singleLimit || parsed.dailyLimit) {
      p2Parts.push(`Payment and transaction orchestration systems must enforce statutory value ceilings${parsed.singleLimit ? ` of ₦${parsed.singleLimit} per single transaction` : ''}${parsed.dailyLimit ? ` and cumulative daily limit of ₦${parsed.dailyLimit}` : ''}${parsed.has2FA ? ', requiring mandatory multi-factor authentication step-up when thresholds are exceeded' : ''}. Switch configurations and terminal fleets must enforce verification limits at the hardware application layer.`);
    } else if (parsed.hasUnlicensedProhibition) {
      p2Parts.push(`Regulated institutions are strictly prohibited from facilitating banking or payment channels for unauthorized entities. Operating teams must immediately terminate active API integrations, payment aggregation credentials, and settlement off-ramps, placing administrative holds on associated merchant balances.`);
    } else if (parsed.hasPrudentialCapital) {
      p2Parts.push(`Covered entities must verify compliance with prudential capital and liquidity standards${parsed.minimumCapital ? ` (minimum capital threshold of ₦${parsed.minimumCapital})` : ''}${parsed.capitalRatio ? ` maintaining capital ratio of ${parsed.capitalRatio}` : ''}. Treasury and Finance departments must review regulatory capital computations and calibrate liquidity buffers against supervisory default thresholds.`);
    } else if (parsed.hasDataProtection) {
      p2Parts.push(`Covered entities must enforce statutory data processing safeguards under the Nigeria Data Protection Act. Mandatory data breach reporting must be filed with the Commission within 72 hours of discovery, alongside implementation of end-to-end cryptographic controls and annual compliance audits.`);
    } else if (parsed.hasFxMandate) {
      p2Parts.push(`Foreign exchange and remittance operations must strictly observe statutory allocation guidelines, documentation mandates, and counterparty reporting timelines, verifying authorized dealer credentials and ensuring seamless transaction reconciliation.`);
    } else if (parsed.hasConsumerProtection) {
      p2Parts.push(`Customer operations must strictly adhere to statutory fee limits and consumer protection guidelines, ensuring transparent disclosure, automated refund processing for unfulfilled transactions, and prompt dispute turnaround.`);
    } else if (parsed.hasRestructuringOrLayoff) {
      p2Parts.push(`The intelligence alert documents material corporate restructuring and workforce realignment (including workforce downscaling, redundancy proceedings, or international subsidiary closure). Institutions under supervisory oversight must ensure strict compliance with statutory redundancy obligations (Labour Act § 20), regulatory disclosure of material structural changes, automated de-provisioning of employee system credentials, and balance sheet liability provisioning for accrued terminal severance benefits.`);
    } else if (parsed.hasMergerAcquisition) {
      p2Parts.push(`The alert details corporate merger, acquisition, or strategic equity restructuring. Transactions exceeding statutory asset thresholds require mandatory pre-notification filings with the Federal Competition and Consumer Protection Commission (FCCPA 2018) and Securities and Exchange Commission (SEC) approval, alongside counterparty payment rail technical due diligence.`);
    } else if (parsed.hasLitigationOrEnforcement) {
      p2Parts.push(`The event establishes judicial enforcement or contentious litigation proceedings. Institutions must review existing counterparty indemnities, assess prospective legal disclosure liabilities, and establish appropriate litigation risk reserves.`);
    } else if (parsed.hasSystemOutage) {
      p2Parts.push(`The alert indicates core infrastructure failure, API service degradation, or payment switch interruption. In accordance with Central Bank operational resilience frameworks, engineering teams must execute disaster recovery failovers, reconcile in-flight transaction ledgers, and document incident root-cause logs for supervisory examination.`);
    } else if (parsed.hasExecutiveTransition) {
      p2Parts.push(`The disclosure details principal officer transition or board governance restructuring. Under BOFIA 2020 § 47, appointment or departure of executive directors, Chief Compliance Officers, and Board members requires formal regulatory vetting, Fit and Proper clearance, and board risk delegation review.`);
    } else if (parsed.hasFraudSecurity) {
      p2Parts.push(`The alert identifies cyber intrusion or unauthorized payment activity. The institution must initiate automated containment protocols, trigger 72-hour regulatory incident notifications under NDPA/CBN guidelines, and freeze vulnerable payment switch endpoints.`);
    } else {
      const entityStr = parsed.detectedEntities.length > 0
        ? ` concerning ${parsed.detectedEntities.join(', ')}`
        : '';
      const operativeContext = parsed.operativeSentences.length > 0
        ? ` Specifically, operating teams must analyze: ${parsed.operativeSentences.slice(0, 2).join(' ')}`
        : '';
      p2Parts.push(`This supervisory intelligence briefing${entityStr} establishes operational baselines requiring internal impact assessment across governance, technology, and operating procedures.${operativeContext} Relevant operating departments must evaluate institutional exposure, verify partner relationships, and ensure continuous compliance readiness.`);
    }
    const p2 = p2Parts.join(' ');

    // 3. Paragraph 3: Supervisory Enforcement, Statutory Exposure & Timelines
    let penaltyClause = parsed.fine
      ? `Statutory non-compliance attracts financial penalties of not less than ₦${parsed.fine}`
      : `Default statutory enforcement penalties apply pursuant to ${params.regulatorCode} supervisory powers`;
    if (parsed.hasCriminalLiability) {
      penaltyClause += ', alongside potential operating license suspension and personal criminal liability for corporate directors and principal officers under governing enactments.';
    } else {
      penaltyClause += ', alongside administrative escalation and potential operating license review.';
    }
    const p3 = `${penaltyClause} ${deadlineStr}`;

    const executiveSummary = `${p1}\n\n${p2}\n\n${p3}`;

    // Dynamic Key Points (derived from parsed facts and sentences)
    let keyPoints: string[] = [];
    if (parsed.hasAssetFreeze) {
      keyPoints.push('Mandatory Asset Freeze: Immediate freeze without delay of all funds, financial assets, and economic resources connected to designated targets.');
    }
    if (parsed.hasPrudentialCapital) {
      keyPoints.push(`Prudential Capital Mandate: Compliance with capital requirements${parsed.minimumCapital ? ` (₦${parsed.minimumCapital})` : ''}${parsed.capitalRatio ? ` and CAR of ${parsed.capitalRatio}` : ''}.`);
    }
    if (parsed.timeframe) {
      keyPoints.push(`Statutory Reporting Timeline: Mandatory statutory reporting and filing window enforced within ${parsed.timeframe}.`);
    }
    if (parsed.singleLimit || parsed.dailyLimit) {
      keyPoints.push(`Transaction Value Ceilings: Mandatory limits enforced${parsed.singleLimit ? ` at ₦${parsed.singleLimit} per transaction` : ''}${parsed.dailyLimit ? ` and ₦${parsed.dailyLimit} daily cumulative` : ''}.`);
    }
    if (parsed.has2FA) {
      keyPoints.push('Cryptographic Step-Up Authentication: Mandatory multi-factor or PIN verification required when transaction parameters are breached.');
    }
    if (parsed.hasRestructuringOrLayoff) {
      keyPoints.push('Corporate Restructuring & Redundancy: Downscaling triggers statutory Labour Act redundancy obligations and mandatory IT credential de-provisioning.');
    }
    if (parsed.hasMergerAcquisition) {
      keyPoints.push('Mergers & Acquisitions Pre-Clearance: Equity transactions trigger mandatory statutory filings under the FCCPA 2018 and SEC approval.');
    }
    if (parsed.hasLitigationOrEnforcement) {
      keyPoints.push('Judicial & Dispute Risk: Contentious legal proceedings mandate contractual indemnity review and provisioning of litigation reserves.');
    }
    if (parsed.hasSystemOutage) {
      keyPoints.push('Operational Resilience & SLA Recovery: System downtime triggers statutory incident reporting (2-hour window) and transaction backlog reconciliation.');
    }
    if (parsed.hasExecutiveTransition) {
      keyPoints.push('Corporate Governance & Officer Vetting: Board and executive transitions require statutory Fit and Proper Person clearance under BOFIA § 47.');
    }
    if (parsed.hasFraudSecurity) {
      keyPoints.push('Cybersecurity & Fraud Containment: Security incidents require 72-hour regulatory breach disclosure and immediate payment rail credential rotation.');
    }
    if (parsed.fine) {
      keyPoints.push(`Statutory Penalty Exposure: Non-compliance attracts monetary fines of not less than ₦${parsed.fine} plus administrative default charges.`);
    }
    if (parsed.hasCriminalLiability) {
      keyPoints.push('Personal Officer Liability: Statutory provisions explicitly enforce personal liability and potential criminal sanctions on responsible corporate directors.');
    }

    for (const sent of parsed.operativeSentences) {
      if (keyPoints.length < 5 && !keyPoints.some((k) => k.includes(sent.slice(0, 30)))) {
        keyPoints.push(`Operative Fact: ${sent}`);
      }
    }

    const defaultBaselines = [
      `Statutory Baseline under ${params.regulatorCode}: Establishes binding operating baselines across all authorized institutional departments.`,
      'Operational Concordance: Demands immediate gap assessment and Board-level revision of internal operating manuals.',
      'Supervisory Timetable: Strict implementation timetable with automatic escalation to the Chief Compliance Officer and Board Risk Committee.',
      'Audit Defense Readiness: Mandatory preservation of tamper-evident compliance audit evidence for regulatory inspection.',
    ];
    for (const baseline of defaultBaselines) {
      if (keyPoints.length < 4) {
        keyPoints.push(baseline);
      }
    }

    const departments = [
      'COMPLIANCE_LEGAL',
      'OPERATIONS',
      'GROWTH_MARKETING',
      'ENGINEERING_TECH',
      'TREASURY_FINANCE',
    ];

    return { executiveSummary, keyPoints, departments };
  }

  private generateDeterministicSummary(params: {
    regulatorCode: RegulatorCode;
    circularNumber: string;
    subject: string;
    publicationDate?: string | null;
    statutoryDeadline: string | null;
    targetedLicenseTypes: LicenseType[];
    affectedPaymentRails: PaymentRail[];
    appliesUniversally: boolean;
  }): string {
    const synthesis = DeterministicMetadataExtractor.generateExecutiveSynthesis({
      regulatorCode: params.regulatorCode,
      circularNumber: params.circularNumber,
      subject: params.subject,
      publicationDate: params.publicationDate,
      statutoryDeadline: params.statutoryDeadline,
      targetedLicenseTypes: params.targetedLicenseTypes,
      affectedPaymentRails: params.affectedPaymentRails,
      appliesUniversally: params.appliesUniversally,
    });

    return synthesis.executiveSummary;
  }

  private parseDateString(dateStr: string): string | null {
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };

    const match = dateStr.match(
      /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})/i
    );
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = months[match[2].toLowerCase()];
      const year = match[3];
      if (month) return `${year}-${month}-${day}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    return null;
  }
}

export const defaultDeterministicMetadataExtractor = new DeterministicMetadataExtractor();
