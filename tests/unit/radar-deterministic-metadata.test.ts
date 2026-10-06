import { describe, it, expect } from 'vitest';
import { DeterministicMetadataExtractor } from '@/modules/radar/services/deterministicMetadataExtractor';
import { ExtractedCircularStructure } from '@/modules/radar/types/schema';

describe('Epic 10: Deterministic Circular Metadata & Entity/Rail Targeting Engine', () => {
  const extractor = new DeterministicMetadataExtractor();

  it('Scenario 1: Evaluates CBN Contactless Payments Circular with exact reference and affected rails', () => {
    const mockStructure: ExtractedCircularStructure = {
      rawText: `
CENTRAL BANK OF NIGERIA
Ref: PSM/DIR/CON/CWS/08/014
Date: 15th January, 2026

CIRCULAR TO: ALL DEPOSIT MONEY BANKS, PAYMENT SOLUTION SERVICE PROVIDERS (PSSP), AND SWITCHING COMPANIES

SUBJECT: OPERATIONAL GUIDELINES FOR CONTACTLESS PAYMENTS IN NIGERIA

All licensed operators supporting Mastercard, Visa, and Verve contactless card acquiring or POS transactions must comply within 14 days of this circular. Failure to adhere shall result in immediate suspension of license and severance from the NIBSS settlement rail.
      `,
      referenceCodeCandidate: 'PSM/DIR/CON/CWS/08/014',
      regulatorCandidate: 'CBN',
      issuingDepartment: 'Payments System Management Department',
      signatoryName: 'Musa I. Jimoh',
      signatoryTitle: 'Director',
      officialSealsDetected: ['CENTRAL BANK OF NIGERIA OFFICIAL SEAL'],
      addresseeText: 'ALL DEPOSIT MONEY BANKS, PAYMENT SOLUTION SERVICE PROVIDERS (PSSP), AND SWITCHING COMPANIES',
      subject: 'OPERATIONAL GUIDELINES FOR CONTACTLESS PAYMENTS IN NIGERIA',
      sections: [],
      schedules: [],
    };

    const metadata = extractor.extractMetadata(mockStructure);

    expect(metadata.regulatorCode).toBe('CBN');
    expect(metadata.circularNumber).toBe('PSM/DIR/CON/CWS/08/014');
    expect(metadata.publicationDate).toBe('2026-01-15');
    expect(metadata.effectiveDate).toBe('2026-01-15');
    // 15th January + 14 days = 2026-01-29
    expect(metadata.statutoryDeadline).toBe('2026-01-29');

    // Licenses targeted
    expect(metadata.targetedLicenseTypes).toContain('PAYMENT_SOLUTION_SERVICES_PSSP');
    expect(metadata.targetedLicenseTypes).toContain('SWITCHING_AND_PROCESSING');
    expect(metadata.targetedLicenseTypes).toContain('COMMERCIAL_BANK');

    // Rails impacted
    expect(metadata.affectedPaymentRails).toContain('CARD_ACQUIRING_MASTERCARD_VISA');
    expect(metadata.affectedPaymentRails).toContain('CARD_ACQUIRING_VERVE');
    expect(metadata.affectedPaymentRails).toContain('NIBSS_NIP');

    // Priority & Risk
    expect(metadata.enforcementRiskLevel).toBe('CRITICAL_SANCTION_RISK');
    expect(metadata.priority).toBe('CRITICAL_EMERGENCY');
  });

  it('Scenario 2: Evaluates CBN Mobile Money Regulatory Framework targeting MMOs and USSD/NIP rails', () => {
    const mockStructure: ExtractedCircularStructure = {
      rawText: `
CENTRAL BANK OF NIGERIA
Ref: BPS/DIR/GEN/CIR/05/011
Date: 2026-02-01

TO: ALL MOBILE MONEY OPERATORS (MMO) AND SUPER AGENTS
SUBJECT: REGULATORY FRAMEWORK FOR MOBILE MONEY SERVICES IN NIGERIA

All Mobile Money Operators utilizing USSD codes and NIBSS NIP for interbank funds transfer and agent banking cash-in cash-out (CICO) operations must maintain minimum regulatory capital. Compliance is mandatory within 30 days.
      `,
      referenceCodeCandidate: 'BPS/DIR/GEN/CIR/05/011',
      regulatorCandidate: 'CBN',
      issuingDepartment: 'Banking & Payments System Department',
      signatoryName: 'D. A. Muhammad',
      signatoryTitle: 'Director',
      officialSealsDetected: [],
      addresseeText: 'ALL MOBILE MONEY OPERATORS (MMO) AND SUPER AGENTS',
      subject: 'REGULATORY FRAMEWORK FOR MOBILE MONEY SERVICES IN NIGERIA',
      sections: [],
      schedules: [],
    };

    const metadata = extractor.extractMetadata(mockStructure);

    expect(metadata.regulatorCode).toBe('CBN');
    expect(metadata.circularNumber).toBe('BPS/DIR/GEN/CIR/05/011');
    expect(metadata.publicationDate).toBe('2026-02-01');
    expect(metadata.statutoryDeadline).toBe('2026-03-03'); // 2026-02-01 + 30 days

    expect(metadata.targetedLicenseTypes).toContain('MOBILE_MONEY_OPERATOR_MMO');
    expect(metadata.targetedLicenseTypes).toContain('SUPER_AGENT');
    expect(metadata.affectedPaymentRails).toContain('USSD');
    expect(metadata.affectedPaymentRails).toContain('NIBSS_NIP');
    expect(metadata.affectedPaymentRails).toContain('AGENT_BANKING_CASH_IN_OUT');
  });

  it('Scenario 3: Evaluates FCCPC Digital Lending Directive targeting registered digital lenders', () => {
    const mockStructure: ExtractedCircularStructure = {
      rawText: `
FEDERAL COMPETITION AND CONSUMER PROTECTION COMMISSION
Ref: FCCPC/DIR/DLR/2023/001
Date: March 10, 2026

CIRCULAR TO: ALL REGISTERED DIGITAL LENDERS AND ONLINE CREDIT PROVIDERS
SUBJECT: NOTICE ON MANDATORY CONSUMER CREDIT FAIRNESS AND RECOVERY CONDUCT

All digital credit apps must cease unauthorized contact list scraping. Statutory compliance deadline: 2026-04-15.
      `,
      referenceCodeCandidate: 'FCCPC/DIR/DLR/2023/001',
      regulatorCandidate: 'FCCPC',
      issuingDepartment: 'Consumer Protection Directorate',
      signatoryName: 'Babatunde Irukera',
      signatoryTitle: 'Executive Vice Chairman',
      officialSealsDetected: [],
      addresseeText: 'ALL REGISTERED DIGITAL LENDERS AND ONLINE CREDIT PROVIDERS',
      subject: 'NOTICE ON MANDATORY CONSUMER CREDIT FAIRNESS AND RECOVERY CONDUCT',
      sections: [],
      schedules: [],
    };

    const metadata = extractor.extractMetadata(mockStructure);

    expect(metadata.regulatorCode).toBe('FCCPC');
    expect(metadata.circularNumber).toBe('FCCPC/DIR/DLR/2023/001');
    expect(metadata.publicationDate).toBe('2026-03-10');
    expect(metadata.statutoryDeadline).toBe('2026-04-15');
    expect(metadata.targetedLicenseTypes).toContain('DIGITAL_LENDER_FCCPC_REGISTERED');
  });

  it('Scenario 4: Detects universal mandates applying to all regulated financial entities', () => {
    const mockStructure: ExtractedCircularStructure = {
      rawText: `
CENTRAL BANK OF NIGERIA
Ref: BSD/DIR/GEN/LAB/14/045
Date: 2026-01-10

TO: ALL FINANCIAL INSTITUTIONS AND REGULATED ENTITIES
SUBJECT: MANDATORY CYBERSECURITY RESILIENCE ATTESTATION 2026

This is a universal mandate. All regulated entities must file quarterly cybersecurity returns.
      `,
      referenceCodeCandidate: 'BSD/DIR/GEN/LAB/14/045',
      regulatorCandidate: 'CBN',
      issuingDepartment: 'Banking Supervision Department',
      signatoryName: 'Haruna B. Mustafa',
      signatoryTitle: 'Director',
      officialSealsDetected: [],
      addresseeText: 'ALL FINANCIAL INSTITUTIONS AND REGULATED ENTITIES',
      subject: 'MANDATORY CYBERSECURITY RESILIENCE ATTESTATION 2026',
      sections: [],
      schedules: [],
    };

    const metadata = extractor.extractMetadata(mockStructure);

    expect(metadata.appliesUniversally).toBe(true);
    expect(metadata.summary).toContain('Universal mandate applying across all licensed financial institutions');
  });
});
