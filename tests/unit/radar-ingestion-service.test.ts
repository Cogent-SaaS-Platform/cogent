import { describe, it, expect } from 'vitest';
import { CircularIngestionService } from '@/modules/radar/services/circularIngestionService';
import { AuditService } from '@/modules/audit/auditService';
import { createAdminClient } from '@/shared/db';

describe('Epic 9: Multi-Regulator Circular Ingestion Pipeline', () => {
  const service = new CircularIngestionService({ dbClient: createAdminClient() });

  const sampleCircularText = `
CENTRAL BANK OF NIGERIA
Ref: PSM/DIR/CON/CWS/08/014
Date: 2026-01-15

CIRCULAR TO: ALL PAYMENT SOLUTION SERVICE PROVIDERS (PSSP) AND SWITCHING COMPANIES
SUBJECT: OPERATIONAL DIRECTIVE ON CONTACTLESS PAYMENT INTERCHANGE

1.0 DIRECTIVE
All payment terminals and card acquiring systems supporting Verve, Mastercard, and Visa must adhere to the interchange fee schedule. Compliance is mandatory within 14 days. Failure shall attract statutory penalties.

Yours Faithfully,
Musa I. Jimoh
Director, Payments System Management Department
  `.trim();

  it('ingests circular document, computes SHA-256 seal, and executes deterministic extraction', async () => {
    const fileBuffer = Buffer.from(sampleCircularText, 'utf8');
    const expectedHash = AuditService.computeSha256(fileBuffer);

    const result = await service.ingestCircular({
      fileBuffer,
      fileName: 'cbn_contactless_interchange_2026.txt',
      mimeType: 'text/plain',
      organizationId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.circularId).toBeDefined();
    expect(result.circularNumber).toBe('PSM/DIR/CON/CWS/08/014');
    expect(result.sourceFileHash).toBe(expectedHash);
    expect(result.storagePath).toContain('circulars/cbn/');
    expect(result.auditId).toBeDefined();

    // Verify metadata
    expect(result.metadata.regulatorCode).toBe('CBN');
    expect(result.metadata.targetedLicenseTypes).toContain('PAYMENT_SOLUTION_SERVICES_PSSP');
    expect(result.metadata.targetedLicenseTypes).toContain('SWITCHING_AND_PROCESSING');
    expect(result.metadata.affectedPaymentRails).toContain('CARD_ACQUIRING_MASTERCARD_VISA');
    expect(result.metadata.statutoryDeadline).toBe('2026-01-29'); // 14 days after 2026-01-15
  });

  it('supports manual overrides for custom gazette circular codes and regulators', async () => {
    const customText = `
DIRECTIVE ON VIRTUAL ASSETS 2026
Date: 2026-02-10
All crypto VASPs must file quarterly capital reports within 30 days.
    `.trim();

    const fileBuffer = Buffer.from(customText, 'utf8');

    const result = await service.ingestCircular({
      fileBuffer,
      fileName: 'sec_crypto_directive.txt',
      mimeType: 'text/plain',
      manualRegulator: 'SEC',
      manualReferenceCode: 'SEC/CIR/VASP/2026/009',
    });

    expect(result.metadata.regulatorCode).toBe('SEC');
    expect(result.metadata.circularNumber).toBe('SEC/CIR/VASP/2026/009');
    expect(result.metadata.targetedLicenseTypes).toContain('CRYPTO_VASP_SEC_APPROVED');
  });
});
