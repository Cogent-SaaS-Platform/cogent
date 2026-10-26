import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { RoleSynthesisService } from '@/modules/radar/services/roleSynthesisService';
import { defaultDossierExportService } from '@/modules/gap-matrix/services/dossierExportService';
import { ConcordanceEngine } from '@/modules/gap-matrix/services/concordanceEngine';
import { StatutoryBenchmarkService } from '@/modules/gap-matrix/services/statutoryBenchmarkService';
import { GET as getEvaluationById } from '@/app/api/gap-matrix/evaluations/[id]/route';
import { POST as postEvaluationDossier } from '@/app/api/gap-matrix/evaluations/[id]/dossier/route';
import { PATCH as patchItemStatus } from '@/app/api/gap-matrix/items/[id]/status/route';
import { AuditDefensePackModal, AuditDefenseDossierModal } from '@/modules/gap-matrix/ui';
import { ValidatedObligation } from '@/modules/radar/types';
import { GapEvaluationResult, StatutoryClauseWithObligations, PolicyClauseMatch } from '@/modules/gap-matrix/types';
import { createAdminClient } from '@/shared/db';

describe('Phase 3: Automated Multi-Role Statutory Synthesis, 5-W Gap Matrix & Bank Examiner Audit Defense', () => {
  const dbClient = createAdminClient();

  // ──────────────────────────────────────────────────────────────────────────
  // Epic 1: Obligation-Driven Multi-Role Synthesis Service
  // ──────────────────────────────────────────────────────────────────────────
  describe('Epic 1: Obligation-Driven Multi-Role Synthesis Service', () => {
    it('synthesizes deep role briefs anchored directly to ValidatedObligation[] array', () => {
      const service = new RoleSynthesisService({ dbClient });

      const obligations: ValidatedObligation[] = [
        {
          id: 'obl-bofia-64-1',
          clauseReference: 'BOFIA 2020 § 64(1)',
          obligationType: 'GOVERNANCE_CONTROL',
          actor: 'All Licensed Banks & OFIs',
          action: 'Deploy dual-factor biometric authorization on transfers above ₦5,000,000',
          object: 'Instant Payment (NIP) switch',
          condition: 'Prior to clearing settlement cycle cut-off',
          deadline: 'Within 30 calendar days of publication',
          verbatimQuote: 'Every licensed financial institution shall deploy dual-factor biometric verification on electronic funds transfers exceeding ₦5,000,000.',
          startChar: 120,
          endChar: 245,
          statutoryTimelineDays: 30,
          severityFloor: 'HIGH',
          statedPenalty: {
            minNaira: 10000000,
            maxNaira: 25000000,
            dailyFineNaira: 500000,
            carriesPersonalCriminalLiability: true,
            carriesLicenseSuspensionRisk: true,
            citation: 'BOFIA 2020 § 64(1)',
          },
          targetedLicenses: ['COMMERCIAL_BANK'],
          affectedRails: ['NIBSS_NIP'],
          appliesUniversally: false,
          isValidated: true,
          groundingConfidence: 1.0,
          summary: 'Deploy dual-factor biometric authorization on transfers above ₦5,000,000',
          complianceCriteria: [
            'Biometric verification integrated on NIP transfer switch',
            'Immutable audit logging with 6-year retention',
          ],
          assessment: 'High supervisory priority. Failure exposes institution to ₦25,000,000 penalty and director disqualification.',
        },
      ];

      const briefs = service.generateDeterministicFallback({
        circular: {
          id: 'circ-cbn-2026-01',
          circularNumber: 'CBN/BSD/DIR/GEN/2026/001',
          regulatorCode: 'CBN',
          subject: 'Mandatory Biometric Verification and High-Value Electronic Funds Settlement',
          summary: 'CBN mandates immediate rollout of biometric secondary authentication on core payment rails.',
          statutoryDeadline: '2026-03-31',
          obligations,
        },
        tenant: {
          organizationId: 'org-test-fintech',
          organizationName: 'Apex FinTech Limited',
          matchedLicenses: ['COMMERCIAL_BANK'],
          matchedRails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
          applicabilityReason: 'Direct applicability under commercial banking license and active NIP payment rails.',
        },
      });

      // Verify all executive domains synthesized
      expect(briefs.generalCounselBrief).toBeDefined();
      expect(briefs.generalCounselBrief).toContain('BOFIA 2020 § 64(1)');
      expect(briefs.generalCounselBrief).toContain('₦25,000,000');
      expect(briefs.generalCounselBrief).toContain('personal liability and potential criminal sanctions');

      expect(briefs.executiveBriefCco).toBeDefined();
      expect(briefs.executiveBriefCco).toContain('Apex FinTech Limited');
      expect(briefs.executiveBriefCco).toContain('Biometric verification integrated on NIP transfer switch');

      expect(briefs.technicalBriefCto || briefs.technicalBriefProductEng).toBeDefined();
      const techBrief = briefs.technicalBriefCto || briefs.technicalBriefProductEng;
      expect(techBrief).toContain('NIP');
      expect(techBrief).toContain('Instant Payment (NIP) switch');

      expect(briefs.financialBriefCfo).toBeDefined();
      expect(briefs.financialBriefCfo).toContain('₦25,000,000');
      expect(briefs.financialBriefCfo).toContain('₦500,000');

      expect(briefs.actionBriefCoo).toBeDefined();
      expect(briefs.actionBriefCoo).toContain('NIP');

      expect(briefs.governanceBriefCeoCro).toBeDefined();
      expect(briefs.actionChecklist.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Epic 2: Multi-Pillar Gap Matrix Concordance Engine
  // ──────────────────────────────────────────────────────────────────────────
  describe('Epic 2: Multi-Pillar Gap Matrix Concordance Engine', () => {
    it('correctly classifies concordance tiers (ADEQUATELY_MET, PARTIALLY_MET, CRITICAL_GAP)', () => {
      const engine = new ConcordanceEngine({ dbClient });

      const mockStatClause: StatutoryClauseWithObligations = {
        clauseId: 'clause-1',
        documentVersionId: 'doc-1',
        sectionReference: 'Section 4.1',
        sectionHeading: 'Customer Identification Controls',
        clauseText: 'The institution must conduct customer identification prior to account activation.',
        obligations: [
          {
            obligationId: 'obl-1',
            obligationType: 'MANDATORY',
            summary: 'Customer identification prior to account activation',
            severityFloor: 'HIGH',
            statutoryTimelineDays: 3,
            mandatoryDisclosureText: null,
            verbatimQuote: 'conduct customer identification prior to account activation',
            characterSpanStart: 25,
            characterSpanEnd: 82,
            complianceCriteria: ['Customer identification conducted prior to activation'],
            penalties: [],
          },
        ],
      };

      // 1. Adequate affirmative match
      const adequateMatch: PolicyClauseMatch = {
        policyClauseId: 'pc-1',
        sectionNumber: 'Section 2.1',
        clauseText: 'All operational units must conduct full customer identification and document verification prior to account activation within 3 days.',
        similarity: 0.92,
      };
      const adequate = engine.classifyComplianceTier(mockStatClause, adequateMatch, mockStatClause.obligations[0]);
      expect(adequate).toBe('ADEQUATELY_MET');

      // 2. Partial match with missing statutory threshold (e.g. 7 days vs required 3 days)
      const partialMatch: PolicyClauseMatch = {
        policyClauseId: 'pc-2',
        sectionNumber: 'Section 2.2',
        clauseText: 'Customer identification shall be compiled and verified within 7 business days of account registration.',
        similarity: 0.78,
      };
      const partial = engine.classifyComplianceTier(mockStatClause, partialMatch, mockStatClause.obligations[0]);
      expect(partial).toBe('PARTIALLY_MET');

      // 3. Critical gap when policy is silent or score is low
      const gap = engine.classifyComplianceTier(mockStatClause, null, mockStatClause.obligations[0]);
      expect(gap).toBe('CRITICAL_GAP');
    });

    it('StatutoryBenchmarkService retrieves authentic obligations with verbatim quotes and spans', async () => {
      const benchmarkService = new StatutoryBenchmarkService({ dbClient });
      const clauses = await benchmarkService.getBenchmarkClausesWithObligations('bench-bofia-2020');

      expect(clauses.length).toBeGreaterThan(0);
      const firstClause = clauses[0];
      expect(firstClause.clauseId).toBeDefined();
      expect(firstClause.sectionReference).toBeDefined();
      expect(firstClause.obligations.length).toBeGreaterThan(0);

      const firstObl = firstClause.obligations[0];
      expect(firstObl.verbatimQuote).toBeDefined();
      expect(firstObl.characterSpanStart).toBeDefined();
      expect(firstObl.characterSpanEnd).toBeDefined();
      expect(firstObl.complianceCriteria).toBeDefined();
      expect(Array.isArray(firstObl.complianceCriteria)).toBe(true);
      expect(firstObl.penalties.length).toBeGreaterThan(0);
      expect(firstObl.penalties[0].penaltyMaxNaira).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Epic 3: Bank Examiner Audit Defense Dossier Exporter
  // ──────────────────────────────────────────────────────────────────────────
  describe('Epic 3: Bank Examiner Audit Defense Dossier Exporter', () => {
    it('produces cryptographic validation table, markdown diff matrix, and HTML defense pack', () => {
      const mockResult: GapEvaluationResult = {
        evaluationId: 'e0000000-0000-0000-0000-000000000001',
        organizationId: 'o0000000-0000-0000-0000-000000000001',
        policyId: 'p0000000-0000-0000-0000-000000000001',
        benchmarkDocumentVersionId: 'b0000000-0000-0000-0000-000000000001',
        policyTitle: 'Institutional Governance & AML Operating Manual',
        benchmarkTitle: 'BOFIA 2020 Banking Supervision Benchmark',
        overallCompliancePercentage: 75.0,
        criticalGapsCount: 1,
        partiallyMetCount: 1,
        adequatelyMetCount: 2,
        totalPotentialPenaltyNaira: 15000000,
        executiveSummary: 'Executive statutory concordance review identifying 1 critical gap.',
        auditId: 'aud-test-123',
        analysisRunId: null,
        createdAt: '2026-10-26T00:00:00Z',
        items: [
          {
            id: 'item-1',
            regulatoryClauseId: 'rc-1',
            regulatoryClauseReference: 'BOFIA 2020 Section 57.1',
            matchedPolicySection: null,
            matchedPolicyText: null,
            complianceStatus: 'CRITICAL_GAP',
            suggestedStatus: 'CRITICAL_GAP',
            statutoryPenaltyNaira: 10000000,
            statutoryLegalCitation: 'BOFIA 2020 Section 57.2',
            whatHappened: 'Internal policy manual omits mandatory daily reserve ratio notification controls.',
            whatToKnow: 'Enforced by CBN under Section 57. Non-compliance warrants ₦10,000,000 fine.',
            whatHasChanged: 'Complete omission from operational manual.',
            whatToDo: 'Adopt statutory clause amendment immediately.',
            draftReplacementLanguage: 'Section 4.1: The institution shall maintain mandatory reserve ratio verification logs.',
            derivedInsight: 'Mitigates ₦10M administrative fine risk.',
            responsibleRole: 'Chief Compliance Officer',
            statutoryRemediationTimelineDays: 14,
            statutoryQuote: 'Every bank shall maintain with the Bank a reserve fund into which it shall transfer not less than thirty percent of its net profit.',
            policyEvidenceQuote: null,
            characterSpanStart: 50,
            characterSpanEnd: 198,
            complianceCriteria: ['Transfer minimum 30% net profit to statutory reserve', 'Submit monthly audit certificate'],
            assessment: 'Blocking regulatory deficiency.',
          },
        ],
      };

      const dossier = defaultDossierExportService.generateDossier({
        evaluationResult: mockResult,
        organizationName: 'Sterling Horizon Bank Plc',
        ccoName: 'Adewale Adeleke, Esq.',
      });

      // 1. Verify cryptographic validation table
      expect(dossier.cryptographicValidationTable).toBeDefined();
      expect(dossier.cryptographicValidationTable?.inputPolicyHash).toMatch(/^[a-f0-9]{64}$/);
      expect(dossier.cryptographicValidationTable?.benchmarkVersionHash).toMatch(/^[a-f0-9]{64}$/);
      expect(dossier.cryptographicValidationTable?.findingsDigestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(dossier.cryptographicValidationTable?.digitalSealHash).toMatch(/^[a-f0-9]{64}$/);

      // 2. Verify Markdown generation contains Cryptographic Chain of Custody & Verbatim Diff Matrix
      const md = defaultDossierExportService.renderToMarkdown(dossier);
      expect(md).toContain('OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER');
      expect(md).toContain('Cryptographic Chain of Custody & Validation Table');
      expect(md).toContain('Verbatim Concordance Diff Matrix');
      expect(md).toContain('BOFIA 2020 Section 57.1');
      expect(md).toContain('Every bank shall maintain with the Bank a reserve fund');

      // 3. Verify HTML generation contains formal styling and tamper-evident tables
      const html = defaultDossierExportService.renderToHtml(dossier);
      expect(html).toContain('STATUTORY CONCORDANCE AUDIT DEFENSE DOSSIER');
      expect(html).toContain('Cryptographic Chain of Custody');
      expect(html).toContain('Verbatim Concordance Diff Matrix');
      expect(html).toContain('Sterling Horizon Bank Plc');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Epic 4: Production API Endpoints
  // ──────────────────────────────────────────────────────────────────────────
  describe('Epic 4: Production API Endpoints', () => {
    it('GET /api/gap-matrix/evaluations/[id] returns complete 5-W Decision Gap Matrix', async () => {
      const req = new NextRequest('http://localhost:3000/api/gap-matrix/evaluations/eval-seed-bofia-2020');
      const response = await getEvaluationById(req, {
        params: Promise.resolve({ id: 'eval-seed-bofia-2020' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.evaluation).toBeDefined();
      expect(json.data.evaluation.id).toBe('eval-seed-bofia-2020');
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.items.length).toBeGreaterThan(0);

      const firstItem = json.data.items[0];
      expect(firstItem.whatHappened).toBeDefined();
      expect(firstItem.whatToKnow).toBeDefined();
      expect(firstItem.whatHasChanged).toBeDefined();
      expect(firstItem.whatToDo).toBeDefined();
      expect(firstItem.draftReplacementLanguage).toBeDefined();
      expect(firstItem.statutoryQuote).toBeDefined();
      expect(firstItem.complianceCriteria).toBeDefined();
    });

    it('POST /api/gap-matrix/evaluations/[id]/dossier generates sealed audit defense pack', async () => {
      const req = new NextRequest('http://localhost:3000/api/gap-matrix/evaluations/eval-seed-bofia-2020/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'First Digital FinTech Ltd',
          ccoName: 'Chief Compliance Officer',
        }),
      });

      const response = await postEvaluationDossier(req, {
        params: Promise.resolve({ id: 'eval-seed-bofia-2020' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.dossier).toBeDefined();
      expect(json.data.dossier.dossierReference).toContain('CBN/BSD/AUDIT-DEFENSE');
      expect(json.data.markdown).toContain('OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER');
      expect(json.data.html).toContain('STATUTORY CONCORDANCE AUDIT DEFENSE DOSSIER');
    });

    it('PATCH /api/gap-matrix/items/[id]/status validates input and records status override', async () => {
      // Rejection of invalid status
      const invalidReq = new NextRequest('http://localhost:3000/api/gap-matrix/items/item-123/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      const invalidRes = await patchItemStatus(invalidReq, {
        params: Promise.resolve({ id: 'item-123' }),
      });
      expect(invalidRes.status).toBe(400);

      // Acceptance of valid status
      const validReq = new NextRequest('http://localhost:3000/api/gap-matrix/items/00000000-0000-0000-0000-000000000001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ADEQUATELY_MET',
          overrideReason: 'Board policy amendment verified and adopted.',
        }),
      });

      const validRes = await patchItemStatus(validReq, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000001' }),
      });
      expect(validRes.status).toBe(200);
      const validJson = await validRes.json();
      expect(validJson.success).toBe(true);
      expect(validJson.data.status).toBe('ADEQUATELY_MET');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Epic 5: Component Export Verification
  // ──────────────────────────────────────────────────────────────────────────
  describe('Epic 5: Cockpit Component Exports', () => {
    it('AuditDefensePackModal and AuditDefenseDossierModal are exported and accessible', () => {
      expect(AuditDefensePackModal).toBeDefined();
      expect(typeof AuditDefensePackModal).toBe('function');
      expect(AuditDefenseDossierModal).toBeDefined();
      expect(typeof AuditDefenseDossierModal).toBe('function');
    });
  });
});
