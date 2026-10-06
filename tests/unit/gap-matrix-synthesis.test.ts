import { describe, it, expect } from 'vitest';
import {
  GapSynthesisService,
  defaultGapSynthesisService,
} from '@/modules/gap-matrix/services/gapSynthesisService';

describe('Epic 17: 5-W Operational Synthesis & Deterministic Penalty Engine', () => {
  const service = new GapSynthesisService();

  it('synthesizes complete 5-W framework items with deterministic penalty attachment', async () => {
    const result = await service.evaluatePolicyGap({
      organizationId: '00000000-0000-0000-0000-000000000001',
      policyId: '00000000-0000-0000-0000-000000000081',
      benchmarkDocumentVersionId: 'bench-cbn-cpf-2019',
      policyTitle: 'Apex Digital Lending Credit Policy 2024',
      department: 'COMPLIANCE_LEGAL',
    });

    expect(result.evaluationId).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.overallCompliancePercentage).toBeGreaterThanOrEqual(0);
    expect(result.overallCompliancePercentage).toBeLessThanOrEqual(100);

    for (const item of result.items) {
      // 1. Verify 5-W Operational Fields
      expect(item.whatHappened).toBeDefined();
      expect(item.whatHappened.length).toBeGreaterThan(10);
      expect(item.whatToKnow).toBeDefined();
      expect(item.whatToKnow.length).toBeGreaterThan(10);
      expect(item.whatHasChanged).toBeDefined();
      expect(item.whatHasChanged.length).toBeGreaterThan(10);
      expect(item.whatToDo).toBeDefined();
      expect(item.whatToDo.length).toBeGreaterThan(10);
      expect(item.derivedInsight).toBeDefined();
      expect(item.derivedInsight.length).toBeGreaterThan(10);

      // 2. Verify Three Standardized Compliance Tiers
      expect(['ADEQUATELY_MET', 'PARTIALLY_MET', 'CRITICAL_GAP']).toContain(
        item.complianceStatus
      );

      // 3. Verify Deterministic Statutory Penalty (Zero Hallucinations)
      expect(typeof item.statutoryPenaltyNaira).toBe('number');
      expect(item.statutoryPenaltyNaira).toBeGreaterThanOrEqual(0);

      if (item.complianceStatus === 'ADEQUATELY_MET') {
        expect(item.statutoryPenaltyNaira).toBe(0);
      } else {
        expect(item.statutoryLegalCitation).toBeDefined();
      }
    }

    // 4. Verify Total Potential Penalty matches sum of items
    const sumFines = result.items.reduce((acc, curr) => acc + curr.statutoryPenaltyNaira, 0);
    expect(result.totalPotentialPenaltyNaira).toBe(sumFines);

    // 5. Verify Metric Counts Consistency
    const adequateCount = result.items.filter((i) => i.complianceStatus === 'ADEQUATELY_MET').length;
    const partialCount = result.items.filter((i) => i.complianceStatus === 'PARTIALLY_MET').length;
    const criticalCount = result.items.filter((i) => i.complianceStatus === 'CRITICAL_GAP').length;

    expect(result.adequatelyMetCount).toBe(adequateCount);
    expect(result.partiallyMetCount).toBe(partialCount);
    expect(result.criticalGapsCount).toBe(criticalCount);

    // 6. Verify Health Score Formula: (adequate * 100 + partial * 50) / total
    const expectedHealth = Math.round(((adequateCount * 100 + partialCount * 50) / result.items.length) * 100) / 100;
    expect(result.overallCompliancePercentage).toBe(expectedHealth);
  });
});
