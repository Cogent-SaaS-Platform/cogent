import { describe, it, expect } from 'vitest';
import {
  circularToInspectorItem,
  findingToInspectorItem,
  gapItemToInspectorItem,
} from '@/shared/ui/inspector/adapters';
import { RadarCircularPresentationCard } from '@/modules/radar/types';
import { FindingPresentationCard } from '@/shared/types/presentation';

describe('TASK-03: Multi-Pane Inspector Engine & Domain Adapters', () => {
  it('correctly adapts a Radar Circular into an InspectorItemData with 4-metric strip and statutory evidence', () => {
    const mockCircular: RadarCircularPresentationCard = {
      id: 'circ-cbn-001',
      circularNumber: 'PSM/DIR/CON/CWS/08/014',
      regulator: 'CBN',
      subject: 'Operational Guidelines for Contactless Payments in Nigeria',
      summary: 'Central Bank of Nigeria mandates transaction limits and 2FA biometric/PIN validation.',
      publicationDate: '2026-03-01',
      effectiveDate: '2026-03-01',
      statutoryDeadline: '2026-03-15',
      daysRemaining: 11,
      countdownTier: 'HIGH',
      urgencyWindow: 'URGENT_ACTION',
      priority: 'HIGH',
      enforcementRiskLevel: 'CRITICAL_SANCTION_RISK',
      lineageStatus: 'ACTIVE_LAW',
      targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
      appliesUniversally: false,
      penaltyEscalationProjection: {
        baselineFineNaira: 10_000_000,
        dailyFineNaira: 2_000_000,
        accruedDailyFineNaira: 0,
        totalProjectedExposureNaira: 10_000_000,
        statutoryCitation: 'BOFIA 2020 Section 57(2)',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      applicability: {
        isApplicable: true,
        reason: 'Directly impacts PSSP license holders.',
        matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
        matchedRails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
      },
      executiveBriefCco: 'CCO brief: 14-day compliance window required.',
      actionItems: [
        {
          id: 'act-1',
          targetDepartment: 'ENGINEERING_TECH',
          actionTitle: 'Enforce PIN threshold',
          actionDescription: 'Configure ₦15,000 threshold in gateway.',
          suggestedDeadline: '2026-03-15',
          isCompleted: false,
        },
      ],
    };

    const item = circularToInspectorItem(mockCircular);

    expect(item.id).toBe('circ-cbn-001');
    expect(item.referenceCode).toBe('PSM/DIR/CON/CWS/08/014');
    expect(item.title).toContain('Contactless Payments');
    expect(item.statusVariant).toBe('critical'); // 11 days remaining <= 14 triggers critical
    expect(item.metrics).toHaveLength(4);
    expect(item.metrics[0].value).toBe('11d');
    expect(item.metrics[1].value).toBe('₦10.0M');
    expect(item.statutoryReference).toBeDefined();
    expect(item.statutoryReference?.statutoryPenaltyNaira).toBe(10_000_000);
    expect(item.statutoryReference?.regulatorCode).toBe('CBN');
    expect(item.criteria).toBeDefined();
    expect(item.criteria?.length).toBeGreaterThanOrEqual(2);
    expect(item.customSections).toBeDefined();
    expect(item.customSections?.length).toBeGreaterThan(0);
    expect(item.customSections?.[0].id).toBe('role-briefs');
  });

  it('correctly adapts a Marketing Shield finding with copy rewrite comparison', () => {
    const mockFinding: FindingPresentationCard = {
      id: 'finding-arcon-01',
      ruleCode: 'ARCON-RULE-14',
      regulatorCode: 'ARCON',
      severity: 'CRITICAL',
      findingType: 'DETERMINISTIC_MATCH',
      flaggedExcerpt: 'Guaranteed 50% ROI in 30 days without market risk.',
      whyItMatters: 'Guaranteed financial return claims violate Section 14 of ARCON Act 2022.',
      statutoryCitation: 'ARCON Act 2022 Section 14(1)',
      statutoryPenaltyNaira: 5_000_000,
      recommendedAction: 'Remove guarantee and provide mandatory risk disclaimer.',
      mandatoryDisclosureRequired: 'Investments are subject to market risks.',
    };

    const item = findingToInspectorItem(mockFinding, {
      originalCopy: 'Invest now with guaranteed 50% ROI!',
      compliantRewrite: 'Earn competitive potential returns of up to 50% annually. Terms apply.',
    });

    expect(item.id).toBe('finding-arcon-01');
    expect(item.referenceCode).toBe('ARCON-RULE-14');
    expect(item.statusVariant).toBe('critical');
    expect(item.statutoryPenaltyNaira).toBe(5_000_000);
    expect(item.statutoryReference?.citationClause).toBe('ARCON Act 2022 Section 14(1)');
    expect(item.statutoryReference?.highlightedPhrase).toBe('Guaranteed 50% ROI in 30 days without market risk.');
    expect(item.customSections).toBeDefined();
    expect(item.customSections?.[0].id).toBe('copy-rewrite-comparison');
  });

  it('correctly adapts a Gap Matrix policy clause with 5-W matrix and board-adopted replacement', () => {
    const mockGap = {
      id: 'gap-ndpa-01',
      policyTitle: 'Apex Cloud & Data Governance Manual',
      clauseNumber: 'Section 4.2',
      governingFramework: 'Nigeria Data Protection Act 2023',
      statutoryCitation: 'NDPA 2023 Section 39(1)',
      statutoryVerbatimText: 'A data controller shall not transfer personal data outside Nigeria unless...',
      concordanceScore: 42,
      regulatorCode: 'NDPC' as const,
      statutoryPenaltyNaira: 10_000_000,
      gapSummary: 'Policy permits unencrypted telemetry to US-East region without NDPC Whitelist verification.',
      boardAdoptedReplacement: 'All cardholder and PII data must be processed within sovereign Nigerian data zones.',
      department: 'COMPLIANCE_LEGAL',
    };

    const item = gapItemToInspectorItem(mockGap);

    expect(item.id).toBe('gap-ndpa-01');
    expect(item.referenceCode).toBe('Section 4.2');
    expect(item.statusVariant).toBe('critical'); // score 42 < 85
    expect(item.metrics[0].value).toBe('42%');
    expect(item.statutoryReference?.regulatorCode).toBe('NDPC');
    expect(item.customSections).toBeDefined();
    expect(item.customSections?.[0].id).toBe('board-adopted-wording');
  });
});
