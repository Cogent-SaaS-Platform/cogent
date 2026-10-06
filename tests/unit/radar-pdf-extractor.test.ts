import { describe, it, expect } from 'vitest';
import { PdfStructureExtractor } from '@/modules/radar/services/pdfStructureExtractor';

describe('Task 9.2: Layout-Preserving Structure Extractor', () => {
  const extractor = new PdfStructureExtractor();

  const sampleCbnCircularText = `
CENTRAL BANK OF NIGERIA
Central Business District, Cadastral Zone, Abuja, FCT
OFFICIAL SEAL: CENTRAL BANK OF NIGERIA OFFICIAL SEAL

Ref No: PSM/DIR/CON/CWS/08/014
Date: 27th June, 2023

CIRCULAR TO: ALL DEPOSIT MONEY BANKS, PAYMENT SERVICE PROVIDERS, AND SWITCHING COMPANIES

SUBJECT: OPERATIONAL GUIDELINES FOR CONTACTLESS PAYMENTS IN NIGERIA

1.0 INTRODUCTION
The Central Bank of Nigeria (CBN), in furtherance of its mandate to promote a safe and sound financial system in Nigeria, hereby issues the Operational Guidelines for Contactless Payments in Nigeria.

2.0 TRANSACTION LIMITS
Contactless payments shall adhere to transaction limits as specified in Schedule 1 below. Any transaction exceeding the maximum contactless limit shall require mandatory two-factor authentication (2FA).

3.0 STATUTORY COMPLIANCE DEADLINE
All targeted operators must achieve full operational and technical compliance within 14 days of the date of this circular. Failure to comply shall attract administrative sanctions and potential suspension from the NIBSS settlement rail.

SCHEDULE 1: TRANSACTION LIMITS & THRESHOLDS
| Tier | Single Transaction Limit | Daily Cumulative Limit | Authentication Required |
| Tier 1 | ₦5,000 | ₦30,000 | PIN-less Contactless |
| Tier 2 | ₦15,000 | ₦50,000 | Mandatory Contactless PIN |
| Tier 3 | Above ₦15,000 | Standard Limits | Standard 2FA / Chip & PIN |

Yours Faithfully,

Musa I. Jimoh
Director, Payments System Management Department
`;

  it('preserves section numbering and clause hierarchy', () => {
    const result = extractor.parseTextDeterministically(sampleCbnCircularText, 'cbn_contactless.pdf');

    expect(result.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.sections[0].sectionNumber).toBe('1.0');
    expect(result.sections[0].heading).toContain('INTRODUCTION');
    expect(result.sections[0].content).toContain('furtherance of its mandate');

    expect(result.sections[1].sectionNumber).toBe('2.0');
    expect(result.sections[1].heading).toContain('TRANSACTION LIMITS');
  });

  it('extracts tabular statutory schedules with headers and rows', () => {
    const result = extractor.parseTextDeterministically(sampleCbnCircularText, 'cbn_contactless.pdf');

    expect(result.schedules.length).toBeGreaterThanOrEqual(1);
    const schedule = result.schedules[0];
    expect(schedule.headers).toContain('Single Transaction Limit');
    expect(schedule.headers).toContain('Daily Cumulative Limit');
    expect(schedule.rows.length).toBe(3);
    expect(schedule.rows[0][0]).toBe('Tier 1');
    expect(schedule.rows[0][1]).toBe('₦5,000');
  });

  it('retains circular reference code, issuing body, and addressee', () => {
    const result = extractor.parseTextDeterministically(sampleCbnCircularText, 'cbn_contactless.pdf');

    expect(result.referenceCodeCandidate).toBe('PSM/DIR/CON/CWS/08/014');
    expect(result.regulatorCandidate).toBe('CBN');
    expect(result.addresseeText).toContain('ALL DEPOSIT MONEY BANKS, PAYMENT SERVICE PROVIDERS, AND SWITCHING COMPANIES');
    expect(result.subject).toContain('OPERATIONAL GUIDELINES FOR CONTACTLESS PAYMENTS IN NIGERIA');
  });

  it('detects official seals and signatories', () => {
    const result = extractor.parseTextDeterministically(sampleCbnCircularText, 'cbn_contactless.pdf');

    expect(result.officialSealsDetected.length).toBeGreaterThanOrEqual(1);
    expect(result.officialSealsDetected[0]).toContain('CENTRAL BANK OF NIGERIA OFFICIAL SEAL');
    expect(result.signatoryName).toBe('Musa I. Jimoh');
    expect(result.signatoryTitle).toContain('Director');
    expect(result.issuingDepartment).toContain('Payments System Management');
  });
});
