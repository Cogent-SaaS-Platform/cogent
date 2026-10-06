import { describe, it, expect } from 'vitest';
import { AuditService } from '@/modules/audit/auditService';
import { CreateAuditLogParams } from '@/shared/types';

describe('AuditService (Epic 7 / Task 7.1 - Immutable Audit Ledger)', () => {
  it('computes genuine, deterministic SHA-256 digests for strings and objects', () => {
    const rawCopy = 'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins!';
    const hash1 = AuditService.computeSha256(rawCopy);
    const hash2 = AuditService.computeSha256(rawCopy);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);

    const objectPayload = { campaign: 'QuickKash', channel: 'SMS_BLAST', risk: 94 };
    const objHash = AuditService.computeSha256(objectPayload);
    expect(objHash).toHaveLength(64);
  });

  it('correctly verifies integrity of unaltered data and rejects tampered data', () => {
    const originalText = 'Approved compliant copy under ARCON Code 2022.';
    const validHash = AuditService.computeSha256(originalText);

    expect(AuditService.verifyIntegrity(originalText, validHash)).toBe(true);
    expect(AuditService.verifyIntegrity(originalText + ' [tampered]', validHash)).toBe(false);
  });

  it('records append-only zero-knowledge audit log entry (CAMA/BOFIA 6-year retention)', async () => {
    const auditService = new AuditService();
    const inputHash = AuditService.computeSha256('Raw campaign input copy');
    const outputHash = AuditService.computeSha256('Verified compliant output rewrite');
    const orgId = '00000000-0000-0000-0000-000000000001';
    const entityId = '11111111-1111-1111-1111-111111111111';

    const logParams: CreateAuditLogParams = {
      organizationId: orgId,
      action: 'MARKETING_PREVET_EXECUTED',
      entityType: 'marketing_scans',
      entityId,
      sha256InputHash: inputHash,
      sha256OutputHash: outputHash,
      metadata: {
        campaignName: 'QuickKash SMS Flash',
        verdict: 'BLOCKING_ISSUE',
        deterministicPenaltyNaira: 11500000,
        model: 'gemini-2.5-flash',
      },
    };

    const entry = await auditService.recordLog(logParams);

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.organizationId).toBe(orgId);
    expect(entry.action).toBe('MARKETING_PREVET_EXECUTED');
    expect(entry.entityType).toBe('marketing_scans');
    expect(entry.entityId).toBe(entityId);
    expect(entry.sha256InputHash).toBe(inputHash);
    expect(entry.sha256OutputHash).toBe(outputHash);
    expect(entry.metadata.campaignName).toBe('QuickKash SMS Flash');
    expect(entry.createdAt).toBeDefined();
  });
});
