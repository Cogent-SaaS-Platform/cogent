import { describe, it, expect } from 'vitest';
import {
  GeminiEmbeddingClient,
  defaultGeminiEmbeddingClient,
} from '@/modules/gap-matrix/services/geminiEmbeddingClient';
import {
  PolicyChunkerService,
} from '@/modules/gap-matrix/services/policyChunkerService';
import {
  ConcordanceEngine,
} from '@/modules/gap-matrix/services/concordanceEngine';
import {
  DossierExportService,
  defaultDossierExportService,
} from '@/modules/gap-matrix/services/dossierExportService';
import {
  GapEvaluationResult,
} from '@/modules/gap-matrix/types';

const mockDb: any = {
  from: () => ({
    select: () => ({
      eq: () => Promise.resolve({ data: [] }),
    }),
  }),
};

describe('Pillar 3 Complete Integration & Production Validation', () => {
  describe('Sub-Module 3.2: Gemini Embedding Client & pgvector Vector Calculations', () => {
    it('calculates cosine similarity correctly for identical and orthogonal vectors', () => {
      const v1 = new Array(768).fill(0);
      const v2 = new Array(768).fill(0);
      v1[0] = 1;
      v2[0] = 1;

      const simIdentical = GeminiEmbeddingClient.cosineSimilarity(v1, v2);
      expect(simIdentical).toBeCloseTo(1.0, 5);

      const v3 = new Array(768).fill(0);
      v3[1] = 1;
      const simOrthogonal = GeminiEmbeddingClient.cosineSimilarity(v1, v3);
      expect(simOrthogonal).toBeCloseTo(0.0, 5);
    });

    it('rejects empty input text with descriptive error', async () => {
      const client = new GeminiEmbeddingClient();
      await expect(client.generateEmbedding('')).rejects.toThrow('empty text content');
    });
  });

  describe('Sub-Module 3.2: Policy Chunker Service', () => {
    it('hierarchically parses policies preserving section numbers and headings', async () => {
      const chunker = new PolicyChunkerService({ dbClient: mockDb });
      const rawPolicy = `
# FinTech Credit Risk & AML Operational Manual

### Section 1.0 Governance and Executive Oversight
The Board Risk Committee shall review credit risk thresholds quarterly.

### Section 2.1 Customer Identification & CDD
All users must provide BVN or NIN credentials prior to transaction processing.

### Section 4.1.2 Suspicious Transaction Reporting Window
All suspicious transactions shall be filed within seventy-two (72) hours to the NFIU goAML portal.
`;

      const result = await chunker.parsePolicy({
        rawText: rawPolicy,
        department: 'COMPLIANCE_LEGAL',
        versionTag: '1.5',
      });

      expect(result.clauses.length).toBeGreaterThanOrEqual(3);
      const sectionNumbers = result.clauses.map((c) => c.sectionNumber);
      expect(sectionNumbers).toContain('Section 1.0');
      expect(sectionNumbers).toContain('Section 2.1');
      expect(sectionNumbers).toContain('Section 4.1.2');

      const strClause = result.clauses.find((c) => c.sectionNumber === 'Section 4.1.2');
      expect(strClause).toBeDefined();
      expect(strClause?.clauseText).toContain('seventy-two (72) hours');
    });
  });

  describe('Sub-Module 3.3: 3-Tier Clause Concordance Engine', () => {
    it('classifies compliance into 3 strict statutory tiers', () => {
      const engine = new ConcordanceEngine({ dbClient: mockDb });

      const statClause72h: any = {
        sectionReference: 'Regulation 14(2)',
        sectionHeading: 'Suspicious Transaction Reporting Window',
        clauseText: 'Report suspicious transactions within 72 hours.',
        obligations: [
          {
            obligationId: 'ob_1',
            obligationType: 'STATUTORY_TIMELINE',
            summary: '72-hour reporting',
            severityFloor: 'CRITICAL',
            statutoryTimelineDays: 3,
            penalties: [{ penaltyMaxNaira: 10000000, penaltyLegalCitation: 'Section 25(2) MLA 2022' }],
          },
        ],
      };

      // 1. Matched internal clause with 7 days -> PARTIALLY_MET (timeline divergence)
      const partialMatch: any = {
        policyClauseId: 'pc_1',
        sectionNumber: 'Section 4.1',
        clauseText: 'All STRs shall be filed within 7 business days of detection.',
        similarity: 0.6,
      };
      const partialVerdict = engine.classifyComplianceTier(statClause72h, partialMatch);
      expect(partialVerdict).toBe('PARTIALLY_MET');

      // 2. Completely omitted clause -> CRITICAL_GAP
      const criticalVerdict = engine.classifyComplianceTier(statClause72h, null);
      expect(criticalVerdict).toBe('CRITICAL_GAP');

      // 3. Fully conforming clause with 72 hours -> ADEQUATELY_MET
      const adequateMatch: any = {
        policyClauseId: 'pc_2',
        sectionNumber: 'Section 4.1',
        clauseText: 'All STRs must be transmitted to NFIU within seventy-two (72) hours.',
        similarity: 0.85,
      };
      const adequateVerdict = engine.classifyComplianceTier(statClause72h, adequateMatch);
      expect(adequateVerdict).toBe('ADEQUATELY_MET');
    });

    it('classifies PEP approval omission as CRITICAL_GAP when executive sign-off is missing', () => {
      const engine = new ConcordanceEngine({ dbClient: mockDb });
      const pepStatClause: any = {
        sectionReference: 'Regulation 19(1)(b)',
        sectionHeading: 'Executive Sign-Off on Politically Exposed Persons (PEPs)',
        clauseText: 'Must obtain prior Senior Management approval.',
        obligations: [
          {
            obligationId: 'ob_pep',
            obligationType: 'GOVERNANCE_CONTROL',
            summary: 'PEP MD approval',
            severityFloor: 'CRITICAL',
            statutoryTimelineDays: 7,
            penalties: [{ penaltyMaxNaira: 20000000, penaltyLegalCitation: 'BOFIA 2020' }],
          },
        ],
      };

      const routineKycMatch: any = {
        policyClauseId: 'pc_pep',
        sectionNumber: 'Section 3.2',
        clauseText: 'PEPs undergo standard KYC file verification by the onboarding analyst.',
        similarity: 0.55,
      };

      const verdict = engine.classifyComplianceTier(pepStatClause, routineKycMatch);
      expect(verdict).toBe('CRITICAL_GAP');
    });
  });

  describe('Sub-Module 3.5: Bank Examiner Audit Defense Dossier Generator (HTML & Markdown)', () => {
    const mockEvalResult: GapEvaluationResult = {
      evaluationId: 'eval-cbn-test-001',
      policyId: 'policy-test-001',
      policyTitle: 'Apex Digital Payments Policy Manual 2025',
      organizationId: '00000000-0000-0000-0000-000000000001',
      benchmarkDocumentVersionId: 'bench-cbn-aml-2022',
      benchmarkTitle: 'CBN AML/CFT Regulations 2022',
      overallCompliancePercentage: 66.7,
      criticalGapsCount: 1,
      partiallyMetCount: 1,
      adequatelyMetCount: 1,
      totalPotentialPenaltyNaira: 15000000,
      executiveSummary: 'Institutional audit defense indicates 1 critical deficiency in PEP executive governance and 1 partial divergence in STR reporting timelines.',
      analysisRunId: null,
      auditId: 'audit-dossier-001',
      createdAt: new Date().toISOString(),
      items: [
        {
          regulatoryClauseId: 'rc_1',
          regulatoryClauseReference: 'Regulation 14(2)',
          matchedPolicySection: 'Section 4.1',
          matchedPolicyText: 'File within 7 days.',
          complianceStatus: 'PARTIALLY_MET',
          suggestedStatus: 'PARTIALLY_MET',
          statutoryPenaltyNaira: 5000000,
          statutoryLegalCitation: 'Section 25(2) MLA 2022',
          whatHappened: 'Policy allows 7 days; statute mandates 72 hours.',
          whatToKnow: 'NFIU enforces strict sanctions on filing delays.',
          whatHasChanged: 'MLA 2022 reduced reporting window to 72 hours.',
          whatToDo: 'Amend Section 4.1 to mandate 72-hour reporting.',
          draftReplacementLanguage: 'Section 4.1.2 (Amended): All STRs must be transmitted to NFIU within 72 hours.',
          draftReplacementPolicyLanguage: 'Section 4.1.2 (Amended): All STRs must be transmitted to NFIU within 72 hours.',
          derivedInsight: 'Avoids ₦5M fine and protects bank examiner standing.',
          responsibleRole: 'Chief Compliance Officer',
          statutoryRemediationTimelineDays: 14,
        },
        {
          regulatoryClauseId: 'rc_2',
          regulatoryClauseReference: 'Regulation 19(1)(b)',
          matchedPolicySection: null,
          matchedPolicyText: null,
          complianceStatus: 'CRITICAL_GAP',
          suggestedStatus: 'CRITICAL_GAP',
          statutoryPenaltyNaira: 10000000,
          statutoryLegalCitation: 'Section 66 BOFIA 2020',
          whatHappened: 'Omission of mandatory Senior Management PEP approval.',
          whatToKnow: 'Level 1 material deficiency in CBN banking supervision.',
          whatHasChanged: 'Zero controls exist in company policy.',
          whatToDo: 'Adopt Section 3.2.1 mandating MD approval on all PEP accounts.',
          draftReplacementLanguage: 'Section 3.2.1 (New Governance Control): No account shall be opened for any PEP without prior written sign-off from the Managing Director.',
          draftReplacementPolicyLanguage: 'Section 3.2.1 (New Governance Control): No account shall be opened for any PEP without prior written sign-off from the Managing Director.',
          derivedInsight: 'Eliminates ₦10M statutory penalty exposure.',
          responsibleRole: 'Managing Director & CCO',
          statutoryRemediationTimelineDays: 7,
        },
      ],
    };

    it('generates official publication-grade HTML defense dossier with all required sections', () => {
      const exportService = new DossierExportService();
      const dossier = exportService.generateDossier({
        evaluationResult: mockEvalResult,
        organizationName: 'Apex Paystack FinTech Ltd',
        ccoName: 'Folake Adeyemi, Esq. (CCO)',
      });

      const html = exportService.generateHtmlDossier(dossier);

      // Must be valid self-contained HTML
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('CENTRAL BANK OF NIGERIA (CBN) • BANKING SUPERVISION DEPARTMENT');
      expect(html).toContain('STATUTORY CONCORDANCE AUDIT DEFENSE DOSSIER');

      // Formal Transmittal Letter
      expect(html).toContain('Formal Supervisory Transmittal');
      expect(html).toContain('Banking Supervision Department');
      expect(html).toContain(dossier.dossierReference);

      // Section 1: Clause Concordance Matrix Table
      expect(html).toContain('Section 1: Clause Concordance Matrix Table');
      expect(html).toContain('Regulation 14(2)');
      expect(html).toContain('Regulation 19(1)(b)');
      expect(html).toContain('badge-partial');
      expect(html).toContain('badge-critical');

      // Section 2: Board Remediation Plan with Draft Replacement Language
      expect(html).toContain('Section 2: Active Board Remediation Plan & Draft Replacement Language');
      expect(html).toContain('BOARD-READY DRAFT REPLACEMENT POLICY WORDING');
      expect(html).toContain('Managing Director');

      // Section 3: Itemized 5-W Operational Decision Matrix
      expect(html).toContain('Section 3: Itemized 5-W Operational Decision Matrix');
      expect(html).toContain('1. What Happened?');
      expect(html).toContain('2. What to Know?');
      expect(html).toContain('3. What Has Changed?');
      expect(html).toContain('4. What to Do?');
      expect(html).toContain('5. Derived Insight');

      // CCO Attestation Block & SHA-256 seal
      expect(html).toContain('Chief Compliance Officer (CCO) & Board Attestation Block');
      expect(html).toContain('Folake Adeyemi, Esq. (CCO)');
      expect(html).toContain('SHA-256 CRYPTOGRAPHIC CHAIN OF CUSTODY SEAL');
      expect(html).toContain(dossier.sha256VerificationHash);
    });

    it('generates official Markdown defense dossier with transmittal and concordance table', () => {
      const exportService = new DossierExportService();
      const dossier = exportService.generateDossier({
        evaluationResult: mockEvalResult,
        organizationName: 'Apex Paystack FinTech Ltd',
        ccoName: 'Folake Adeyemi, Esq. (CCO)',
      });

      const md = exportService.generateMarkdownDossier(dossier);

      expect(md).toContain('# OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER');
      expect(md).toContain('## 1. Formal Transmittal Letter');
      expect(md).toContain('## 4. Statutory Clause Concordance Matrix Table');
      expect(md).toContain('## 5. Board Remediation Plan & Draft Replacement Language');
      expect(md).toContain('## 6. Chief Compliance Officer (CCO) Official Attestation');
      expect(md).toContain(dossier.sha256VerificationHash);
    });
  });
});
