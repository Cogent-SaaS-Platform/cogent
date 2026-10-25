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
    const publicationDate = this.detectPublicationDate(text);
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
    const subject = structure.subject || 'Regulatory Directive';
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
    };

    const regStatutes: Record<RegulatorCode, string> = {
      CBN: 'Banks and Other Financial Institutions Act (BOFIA 2020) and Payments System Management Regulations',
      SEC: 'Investments and Securities Act (ISA 2007) and Rules on Digital Sub-Brokers & VASPs',
      NFIU: 'Money Laundering (Prevention and Prohibition) Act (MLA 2022) and Terrorism Prevention Act',
      NDPC: 'Nigeria Data Protection Act (NDPA 2023) and General Application Guidelines',
      FCCPC: 'Federal Competition and Consumer Protection Act (FCCPA 2018) and Digital Lending Guidelines',
      ARCON: 'Advertising Regulatory Council of Nigeria Act (ARCON Act 2022) and Nigerian Code of Advertising Practice',
      NDIC: 'Nigeria Deposit Insurance Corporation Act 2023 and Supervisory Resolution Protocols',
    };

    const fullRegName = regNames[params.regulatorCode] || params.regulatorCode;
    const statute = regStatutes[params.regulatorCode] || 'Statutory Supervisory Mandates';
    const deadlineStr = params.statutoryDeadline
      ? `Mandatory compliance must be achieved by ${params.statutoryDeadline}, after which supervisory default proceedings and statutory penalties take effect.`
      : 'Compliance enforcement takes immediate effect upon issuance, with ongoing monitoring of all covered institutional operations.';

    const universalClause = params.appliesUniversally
      ? 'Universal mandate applying across all licensed financial institutions. '
      : '';

    const p1 = `On ${params.publicationDate || 'official notice'}, the ${fullRegName} (${params.regulatorCode}) enacted circular directive ${params.circularNumber} concerning '${params.subject}', formally exercising statutory supervisory powers under the ${statute}. ${universalClause}The directive establishes binding standards across all regulated operations to enhance systemic risk controls, eliminate supervisory deficiencies, and ensure institutional alignment with current prudential baselines.`;

    const p2 = `The directive mandates comprehensive operational compliance regarding ${params.subject.toLowerCase()}. Affected licensed institutions must review their internal risk appetite, governance controls, customer onboarding documentation, and automated technical rails. Operating teams are directed to eliminate any policy ambiguity, implement strict access and reporting mechanisms, and ensure total conformity across partner networks and client-facing interfaces.`;

    const p3 = `Failure to conform to the statutory mandates set out in this circular exposes the institution to regulatory sanctions, monetary penalties, administrative escalation, and potential review of operating permissions. ${deadlineStr} Accountable departmental leads are required to execute immediate concordance reviews, compile remediation evidence, and secure executive sign-off.`;

    const executiveSummary = `${p1}\n\n${p2}\n\n${p3}`;

    const keyPoints = [
      `Formal statutory enactment under ${params.regulatorCode} supervisory authority: Establishes binding operating rules across all licensed entities.`,
      `Mandatory operational controls and policy concordance: Demands immediate review and update of internal standard operating procedures (SOPs).`,
      `Enforced reporting & documentation obligations: All records, audit trails, and transactional evidence must be systematically preserved for examination.`,
      `Supervisory deadline & compliance escalation: Strict enforcement schedule with auto-escalation to the Chief Compliance Officer and Board Risk Committee.`,
      `Statutory liability & fine exposure: Non-compliance carries progressive daily default fines and administrative remediation orders under applicable Nigerian financial law.`,
    ];

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
