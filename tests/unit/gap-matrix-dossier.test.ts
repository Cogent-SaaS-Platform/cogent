import { describe, it, expect } from 'vitest';
import {
  DossierExportService,
  defaultDossierExportService,
} from '@/modules/gap-matrix/services/dossierExportService';
import { GapEvaluationResult } from '@/modules/gap-matrix/types';

describe('Epic 18: Bank Examiner Defense Pack Export (Task 18.3)', () => {
  const service = new DossierExportService();

  const mockEvaluationResult: GapEvaluationResult = {
    evaluationId: '11111111-2222-3333-4444-555555555555',
    policyId: '22222222-3333-4444-5555-666666666666',
    policyTitle: 'Apex Paystack AML/CFT Manual 2024',
    organizationId: '00000000-0000-0000-0000-000000000001',
    benchmarkDocumentVersionId: 'bench-cbn-aml-2022',
    benchmarkTitle: 'CBN AML/CFT Regulations 2022',
    overallCompliancePercentage: 66.67,
    criticalGapsCount: 1,
    partiallyMetCount: 1,
    adequatelyMetCount: 1,
    totalPotentialPenaltyNaira: 12500000,
    executiveSummary: 'Statutory compliance gap evaluation identified 1 critical gap in PEP authorization and 1 partial divergence in STR timelines.',
    analysisRunId: null,
    auditId: 'audit-test-1',
    createdAt: new Date().toISOString(),
    items: [
      {
        regulatoryClauseId: 'rc_1',
        regulatoryClauseReference: 'Regulation 14(2)',
        matchedPolicySection: 'Section 4.1',
        matchedPolicyText: 'File STRs within 7 business days.',
        complianceStatus: 'PARTIALLY_MET',
        suggestedStatus: 'PARTIALLY_MET',
        statutoryPenaltyNaira: 2500000,
        statutoryLegalCitation: 'Section 25(2) MLA 2022',
        whatHappened: 'Policy allows 7 days; statute mandates 72 hours.',
        whatToKnow: 'NFIU enforces strict sanctions on filing delays.',
        whatHasChanged: 'MLA 2022 introduced strict 72-hour window.',
        whatToDo: 'Amend Section 4.1 to mandate 72-hour reporting.',
        derivedInsight: 'Avoids ₦2.5M administrative penalty.',
        responsibleRole: 'Chief Compliance Officer',
        statutoryRemediationTimelineDays: 14,
      },
      {
        regulatoryClauseId: 'rc_2',
        regulatoryClauseReference: 'Regulation 19(1)',
        matchedPolicySection: null,
        matchedPolicyText: null,
        complianceStatus: 'CRITICAL_GAP',
        suggestedStatus: 'CRITICAL_GAP',
        statutoryPenaltyNaira: 10000000,
        statutoryLegalCitation: 'Section 66 BOFIA 2020',
        whatHappened: 'Policy lacks mandatory Senior Management approval for PEPs.',
        whatToKnow: 'Level 1 material deficiency in CBN inspections.',
        whatHasChanged: 'Omitted governance approval control.',
        whatToDo: 'Draft and adopt Section 3.2.1 for MD approval on all PEPs.',
        derivedInsight: 'Protects banking license and payment rail access.',
        responsibleRole: 'Managing Director & CCO',
        statutoryRemediationTimelineDays: 7,
      },
      {
        regulatoryClauseId: 'rc_3',
        regulatoryClauseReference: 'Section 26',
        matchedPolicySection: 'Section 5.1',
        matchedPolicyText: '5-year record retention policy enforced.',
        complianceStatus: 'ADEQUATELY_MET',
        suggestedStatus: 'ADEQUATELY_MET',
        statutoryPenaltyNaira: 0,
        whatHappened: 'Internal policy strictly complies with 5-year retention.',
        whatToKnow: 'Standard statutory retention rule.',
        whatHasChanged: 'No change required.',
        whatToDo: 'Maintain semi-annual archive checks.',
        derivedInsight: 'Clean audit finding.',
        responsibleRole: 'Head of Operations',
        statutoryRemediationTimelineDays: 30,
      },
    ],
  };

  it('generates a cryptographically sealed AuditDefenseDossier', () => {
    const dossier = service.generateDossier({
      evaluationResult: mockEvaluationResult,
      organizationName: 'Apex Paystack FinTech Ltd',
      ccoName: 'Folake Adeyemi, Esq.',
    });

    expect(dossier.dossierReference).toMatch(/^CBN\/BSD\/AUDIT-DEFENSE\/\d{4}\/[A-Z0-9]+$/);
    expect(dossier.sha256VerificationHash).toBeDefined();
    expect(dossier.sha256VerificationHash.length).toBe(64);

    expect(dossier.ccoAttestation.ccoName).toBe('Folake Adeyemi, Esq.');
    expect(dossier.ccoAttestation.digitalSealHash.length).toBe(64);
    expect(dossier.ccoAttestation.attestationStatement).toContain('Chief Compliance Officer');

    expect(dossier.overallCompliancePercentage).toBe(66.67);
    expect(dossier.criticalGapsCount).toBe(1);
    expect(dossier.totalPotentialPenaltyNaira).toBe(12500000);
  });

  it('renders official bank examiner dossier to formatted markdown', () => {
    const dossier = service.generateDossier({
      evaluationResult: mockEvaluationResult,
      organizationName: 'Apex Paystack FinTech Ltd',
      ccoName: 'Folake Adeyemi, Esq.',
    });

    const markdown = service.renderToMarkdown(dossier);

    expect(markdown).toContain('OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER');
    expect(markdown).toContain('CENTRAL BANK OF NIGERIA (CBN) BANKING SUPERVISION DEPARTMENT');
    expect(markdown).toContain(dossier.dossierReference);
    expect(markdown).toContain(dossier.sha256VerificationHash);
    expect(markdown).toContain('Schedule 1: Regulation 14(2)');
    expect(markdown).toContain('Schedule 2: Regulation 19(1)');
    expect(markdown).toContain('1. What Happened?');
    expect(markdown).toContain('2. What to Know?');
    expect(markdown).toContain('3. What Has Changed?');
    expect(markdown).toContain('4. What to Do?');
    expect(markdown).toContain('5. Derived Insight');
    expect(markdown).toContain('CHIEF COMPLIANCE OFFICER & LEGAL COUNSEL');
  });
});
