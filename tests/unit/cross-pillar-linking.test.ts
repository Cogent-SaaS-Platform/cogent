import { describe, it, expect } from 'vitest';
import { CrossPillarLinkContextSchema } from '@/modules/executive/types/schema';
import { CrossPillarLinkContext, PlatformPillar } from '@/shared/types';

describe('Epic 19: Cross-Pillar Synergies & Deep Linking (Task 19.2)', () => {
  it('validates a valid cross-pillar link targeting Marketing Shield', () => {
    const payload: CrossPillarLinkContext = {
      targetPillar: 'marketing',
      findingRuleCode: 'ARCON-ART-24',
      searchTerm: 'instant loan',
      action: 'pre-vet',
    };

    const parsed = CrossPillarLinkContextSchema.parse(payload);
    expect(parsed.targetPillar).toBe('marketing');
    expect(parsed.findingRuleCode).toBe('ARCON-ART-24');
    expect(parsed.action).toBe('pre-vet');
  });

  it('validates a valid cross-pillar link targeting Regulatory Radar', () => {
    const payload: CrossPillarLinkContext = {
      targetPillar: 'radar',
      circularNumber: 'PSM/DIR/CON/CWS/08/014',
      regulatorCode: 'CBN',
      searchTerm: 'contactless payments',
      action: 'inspect',
    };

    const parsed = CrossPillarLinkContextSchema.parse(payload);
    expect(parsed.targetPillar).toBe('radar');
    expect(parsed.circularNumber).toBe('PSM/DIR/CON/CWS/08/014');
    expect(parsed.regulatorCode).toBe('CBN');
  });

  it('validates a valid cross-pillar link targeting 5-W Gap Matrix', () => {
    const payload: CrossPillarLinkContext = {
      targetPillar: 'gap-matrix',
      benchmarkId: 'bench-cbn-aml-2022',
      policySectionNumber: 'Section 4.1',
      searchTerm: 'Regulation 14(2) AML/CFT',
      action: 'trace',
    };

    const parsed = CrossPillarLinkContextSchema.parse(payload);
    expect(parsed.targetPillar).toBe('gap-matrix');
    expect(parsed.benchmarkId).toBe('bench-cbn-aml-2022');
    expect(parsed.policySectionNumber).toBe('Section 4.1');
    expect(parsed.searchTerm).toBe('Regulation 14(2) AML/CFT');
  });

  it('validates minimal valid context targeting Executive Overview', () => {
    const payload: CrossPillarLinkContext = {
      targetPillar: 'executive',
    };

    const parsed = CrossPillarLinkContextSchema.parse(payload);
    expect(parsed.targetPillar).toBe('executive');
    expect(parsed.action).toBeUndefined();
  });

  it('rejects an invalid pillar name in schema validation', () => {
    const invalidPayload = {
      targetPillar: 'accounting',
      searchTerm: 'tax audit',
    };

    const result = CrossPillarLinkContextSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('verifies bi-directional link context generation between Radar and Gap Matrix', () => {
    // 1. Radar to Gap Matrix link creation
    const radarToGapLink: CrossPillarLinkContext = {
      targetPillar: 'gap-matrix',
      benchmarkId: 'bench-cbn-aml-2022',
      searchTerm: 'PSM/DIR/CON/CWS/08/014',
      action: 'trace',
    };
    expect(CrossPillarLinkContextSchema.safeParse(radarToGapLink).success).toBe(true);

    // 2. Gap Matrix to Radar return link creation
    const gapToRadarLink: CrossPillarLinkContext = {
      targetPillar: 'radar',
      searchTerm: 'Regulation 14(2) AML/CFT',
      action: 'inspect',
    };
    expect(CrossPillarLinkContextSchema.safeParse(gapToRadarLink).success).toBe(true);
  });

  it('verifies bi-directional link context generation between Marketing Shield and Radar', () => {
    // 1. Marketing Shield to Radar
    const marketingToRadarLink: CrossPillarLinkContext = {
      targetPillar: 'radar',
      regulatorCode: 'ARCON',
      searchTerm: 'ARCON Art. 24',
      action: 'inspect',
    };
    expect(CrossPillarLinkContextSchema.safeParse(marketingToRadarLink).success).toBe(true);

    // 2. Radar to Marketing Shield
    const radarToMarketingLink: CrossPillarLinkContext = {
      targetPillar: 'marketing',
      regulatorCode: 'CBN',
      searchTerm: 'contactless payment guidelines',
      action: 'pre-vet',
    };
    expect(CrossPillarLinkContextSchema.safeParse(radarToMarketingLink).success).toBe(true);
  });
});
