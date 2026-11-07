import { describe, it, expect } from 'vitest';
import { MultiConcordanceService } from '@/modules/gap-matrix/services/multiConcordanceService';
import { SeniorCounselBriefing, ExecutiveMacroBriefing } from '@/modules/gap-matrix/types';

describe('Senior Regulatory Counsel Briefing & Executive Intelligence Architecture', () => {
  const mockDbClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({
            range: async () => ({ data: [], error: null }),
          }),
        }),
        in: () => ({
          data: [],
          error: null,
        }),
      }),
    }),
  };

  const service = new MultiConcordanceService(mockDbClient as any);

  it('constructs a senior counsel briefing fallback structure with rich legal reasoning', async () => {
    // Test the internal fallback or briefing construction
    const obligation = {
      id: 'obl-aml-001',
      title: 'Mandatory Immediate STR Reporting within 72 Hours',
      description: 'The reporting institution must file all Suspicious Transaction Reports (STRs) to the NFIU within 72 hours of detection.',
      sourceSectionRef: 'Section 25(2)',
      verbatimQuote: 'Every financial institution shall report any suspicious transaction to the Special Control Unit Against Money Laundering or the Nigeria Financial Intelligence Unit within 72 hours.',
    };

    const criteriaResults = [
      {
        criterionId: 'crit-1',
        status: 'MET' as const,
        aiReason: 'Internal policy section 4.1 contains the express requirement to transmit suspicious transaction reports via the goAML portal.',
        matchedPolicySectionIds: ['sec-4-1'],
        matchedSections: [
          {
            sectionId: 'sec-4-1',
            policyTitle: 'Apex AML/CFT Policy Manual 2026',
            sectionTitle: 'Section 4.1 goAML STR Transmission',
            verbatimContent: 'Compliance Officers shall file STRs directly onto the NFIU goAML system.',
          },
        ],
      },
      {
        criterionId: 'crit-2',
        status: 'NOT_MET' as const,
        aiReason: 'Internal policy section 4.1 stipulates a 7-day reporting timeline instead of the statutory 72-hour window mandated by Section 25(2).',
        matchedPolicySectionIds: [],
        matchedSections: [],
      },
    ];

    // Verify macro briefing generation with senior counsel persona
    const macroBriefing = await service.generateExecutiveMacroBriefing({
      analysisName: 'Fintech AML Compliance Audit 2026',
      organizationId: '00000000-0000-0000-0000-000000000001',
      totalObligations: 10,
      adequateCount: 6,
      partialCount: 3,
      gapCount: 1,
      overallCompliancePercentage: 75.0,
      evaluatedItems: [],
      instruments: [{ title: 'Money Laundering (Prevention and Prohibition) Act 2022' }],
      policyDocs: [{ title: 'Apex AML/CFT Policy Manual 2026' }],
      createdByName: 'Folake Adeyemi, Esq.',
    });

    expect(macroBriefing).toBeDefined();
    expect(macroBriefing.headlineVerdict).toBeTruthy();
    expect(macroBriefing.riskPostureRating).toBe('CRITICAL_SUPERVISORY_EXPOSURE');
    expect(macroBriefing.boardExecutiveSummary).toContain('Apex AML/CFT Policy Manual 2026');
    expect(macroBriefing.supervisoryInspectionVulnerabilities.length).toBeGreaterThan(0);
    expect(macroBriefing.systemicPolicyGaps.length).toBeGreaterThan(0);
    expect(macroBriefing.strategicRoadmap30_60_90.immediate30Days.length).toBeGreaterThan(0);
    expect(macroBriefing.strategicRoadmap30_60_90.intermediate60Days.length).toBeGreaterThan(0);
    expect(macroBriefing.strategicRoadmap30_60_90.strategic90Days.length).toBeGreaterThan(0);
    expect(macroBriefing.executiveBriefingMarkdown).toContain('# EXECUTIVE REGULATORY COUNSEL BRIEFING');
  });

  it('validates senior counsel briefing type contract for individual obligations', () => {
    const counselBriefing: SeniorCounselBriefing = {
      executiveVerdict: 'CRITICAL STATUTORY DIVERGENCE: Internal operating procedures allow a 7 business day filing lag, violating Section 25(2) MLPPA 2022.',
      verdictSummary: 'Failure to enforce the statutory 72-hour filing deadline leaves the institution exposed to mandatory civil sanctions.',
      supervisoryContext: 'The statutory objective of the 72-hour window is to ensure near real-time intelligence dissemination to law enforcement. A 7-day delay creates immediate Level 1 Supervisory Sanction exposure during routine CBN / NFIU examinations.',
      evidentiaryAnalysis: 'While Section 4.1 recognizes the goAML reporting channel (fulfilling Criterion 1), it fails to constrain the escalation-to-filing timeframe to 72 hours (failing Criterion 2).',
      strategicRemediation: '1. Update Section 4.1.2 to replace "7 business days" with "72 hours".\n2. Establish an automated goAML alert triggered when compliance flags a transaction as suspicious.',
      briefingMarkdown: '# SENIOR REGULATORY COUNSEL BRIEFING\n\n## 1. Executive Verdict\n> [!CRITICAL]\n> Divergence identified.',
    };

    expect(counselBriefing.executiveVerdict).toBeTruthy();
    expect(counselBriefing.verdictSummary).toBeTruthy();
    expect(counselBriefing.supervisoryContext).toBeTruthy();
    expect(counselBriefing.evidentiaryAnalysis).toBeTruthy();
    expect(counselBriefing.strategicRemediation).toBeTruthy();
    expect(counselBriefing.briefingMarkdown).toBeTruthy();
  });
});
