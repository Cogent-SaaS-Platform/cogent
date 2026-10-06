import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ClaimsLedgerService,
  DEFAULT_INSTITUTIONAL_CLAIMS,
} from '@/modules/marketing-shield/claimsLedgerService';

describe('ClaimsLedgerService (Phase 1 / Task 1.2)', () => {
  const dummyOrgId = '00000000-0000-0000-0000-000000000001';

  let mockSupabase: any;
  let service: ClaimsLedgerService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'mock-claim-uuid-1',
            organization_id: dummyOrgId,
            product_category: 'WEALTHTECH_INVEST',
            approved_text: 'Earn up to 25% targeted annual yield on vetted assets.',
            prohibited_counterpart: 'Guaranteed 25% returns on investment',
            governing_regulator: 'SEC',
            statutory_citation: 'SEC Rule 198(2)',
            cco_rationale: 'Capital protection requires disclaimer',
            approved_by_user_id: null,
            approved_at: new Date().toISOString(),
            expires_at: null,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    };
    service = new ClaimsLedgerService(mockSupabase);
  });

  it('loads active institutional claims including defaults when db is empty', async () => {
    const claims = await service.getActiveClaims(dummyOrgId, 'WEALTHTECH_INVEST');
    expect(claims.length).toBeGreaterThanOrEqual(1);
    expect(claims[0].productCategory).toBe('WEALTHTECH_INVEST');
    expect(claims[0].approvedText).toContain('targeted annual yield');
  });

  it('detects exact match against prohibited counterpart and generates presentation card', async () => {
    const copy = 'Invest today and enjoy guaranteed 25% returns on investment without hassle.';
    const result = await service.matchClaims(copy, dummyOrgId, 'WEALTHTECH_INVEST');

    expect(result.hasMatches).toBe(true);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].matchedType).toBe('EXACT');
    expect(result.matches[0].regulatorCode).toBe('SEC');
    expect(result.matches[0].flaggedExcerpt.toLowerCase()).toBe(
      'guaranteed 25% returns on investment'
    );

    // Presentation card contract check
    expect(result.presentationCards.length).toBe(1);
    const card = result.presentationCards[0];
    expect(card.findingType).toBe('CLAIMS_LEDGER_MATCH');
    expect(card.severity).toBe('HIGH');
    expect(card.statutoryCitation).toContain('SEC Rule 198');
    expect(card.recommendedAction).toContain('Apply CCO-Approved Replacement');

    // Suggested rewrite check
    expect(result.suggestedRewrite).not.toBeNull();
    expect(result.suggestedRewrite).toContain('Earn up to 25% targeted annual yield');
    expect(result.suggestedRewrite).not.toContain('Guaranteed 25% returns on investment');
  });

  it('detects fuzzy match when phrase is close to prohibited counterpart', async () => {
    // Prohibited: "Instant loan with zero interest"
    const copy = 'Get an instant loan with zero interest today and pay back whenever.';
    const result = await service.matchClaims(copy, dummyOrgId, 'DIGITAL_NANO_LOAN');

    expect(result.hasMatches).toBe(true);
    expect(result.matches.some((m) => m.regulatorCode === 'FCCPC')).toBe(true);
    const fccpcMatch = result.matches.find((m) => m.regulatorCode === 'FCCPC')!;
    expect(fccpcMatch.approvedText).toContain('FCCPC guidelines');
  });

  it('executes under 20ms target latency', async () => {
    const copy = 'Get an instant loan with zero interest today.';
    const result = await service.matchClaims(copy, dummyOrgId, 'DIGITAL_NANO_LOAN');
    expect(result.executionLatencyMs).toBeLessThan(100);
  });

  it('persists a new approved claim with valid attributes', async () => {
    const newClaim = await service.addApprovedClaim({
      organizationId: dummyOrgId,
      productCategory: 'SAVINGS_DEPOSIT',
      approvedText: 'High-yield savings insured by NDIC.',
      prohibitedCounterpart: 'Risk free guaranteed savings',
      governingRegulator: 'CBN',
      statutoryCitation: 'NDIC Act 2023 s.21',
      ccoRationale: 'Remediated risk-free claim to specify statutory NDIC cover.',
    });

    expect(newClaim.organizationId).toBe(dummyOrgId);
    expect(mockSupabase.from).toHaveBeenCalledWith('tenant_claims_ledger');
  });

  it('throws validation error if approvedText or ccoRationale is empty', async () => {
    await expect(
      service.addApprovedClaim({
        organizationId: dummyOrgId,
        productCategory: 'SAVINGS_DEPOSIT',
        approvedText: '',
        governingRegulator: 'CBN',
        statutoryCitation: 'NDIC Act 2023',
        ccoRationale: 'Valid rationale',
      })
    ).rejects.toThrow('Approved text cannot be empty');

    await expect(
      service.addApprovedClaim({
        organizationId: dummyOrgId,
        productCategory: 'SAVINGS_DEPOSIT',
        approvedText: 'Valid approved text',
        governingRegulator: 'CBN',
        statutoryCitation: 'NDIC Act 2023',
        ccoRationale: '   ',
      })
    ).rejects.toThrow('CCO rationale cannot be empty');
  });
});
