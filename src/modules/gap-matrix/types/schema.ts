import { z } from 'zod';
import {
  OrgDepartment,
  ComplianceStatus,
  RegulatorCode,
  SeverityLevel,
} from '@/shared/types';

/**
 * Zod Schemas for Pillar 3: 5-W Decision Gap Matrix & Audit Defense Pack
 * Aligned with docs/PILLAR_3_5W_GAP_MATRIX.md and docs/DATA_MODEL.md Section 8
 */

export const ExtractedPolicyClauseSchema = z.object({
  sectionNumber: z.string().describe("e.g. 'Section 3.2.1' or '4.1'"),
  heading: z.string().describe("Section title, e.g. 'Reporting Timelines for Suspicious Transactions'"),
  clauseText: z.string().describe("Verbatim text content of the policy clause"),
  pageNumber: z.number().int().positive().optional(),
  paragraphReference: z.string().optional(),
});

export const ExtractedPolicyStructureSchema = z.object({
  title: z.string(),
  department: z.enum([
    'EXECUTIVE_LEADERSHIP',
    'COMPLIANCE_LEGAL',
    'GROWTH_MARKETING',
    'PRODUCT_MANAGEMENT',
    'ENGINEERING_TECH',
    'OPERATIONS',
    'TREASURY_FINANCE',
  ]),
  versionTag: z.string().default('1.0'),
  rawText: z.string(),
  clauses: z.array(ExtractedPolicyClauseSchema),
});

export const PolicyIngestInputSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(3),
  department: z.enum([
    'EXECUTIVE_LEADERSHIP',
    'COMPLIANCE_LEGAL',
    'GROWTH_MARKETING',
    'PRODUCT_MANAGEMENT',
    'ENGINEERING_TECH',
    'OPERATIONS',
    'TREASURY_FINANCE',
  ]),
  versionTag: z.string().default('1.0'),
  fileBuffer: z.any().optional(),
  fileName: z.string(),
  mimeType: z.string().default('application/pdf'),
  rawText: z.string().optional(),
});

export const PolicyIngestResultSchema = z.object({
  policyId: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string(),
  department: z.string(),
  versionTag: z.string(),
  storagePath: z.string(),
  sourceFileHash: z.string(),
  clausesCount: z.number().int(),
  clauses: z.array(ExtractedPolicyClauseSchema),
  auditId: z.string(),
  deduplicated: z.boolean().optional(),
});

/**
 * 5-W Operational Framework Item Schema (Gemini Structured Output)
 */
export const GapItemSynthesisSchema = z.object({
  regulatoryClauseReference: z.string().describe("e.g. 'Section 3.2.1' or 'Regulation 14(2) NFIU Regulations 2022'"),
  matchedPolicySection: z.string().nullable().describe("e.g. 'Section 4.1' or null if Critical Gap"),
  matchedPolicyText: z.string().nullable().describe("Excerpt from company policy or null"),
  suggestedStatus: z.enum(['ADEQUATELY_MET', 'PARTIALLY_MET', 'CRITICAL_GAP']),
  whatHappened: z.string().describe("Factual baseline: Exact wording of statutory obligation vs internal policy clause"),
  whatToKnow: z.string().describe("Regulatory context: Why regulator enacted rule and historical enforcement patterns"),
  whatHasChanged: z.string().describe("Operational delta: Exactly where internal procedures diverge from statutory requirements"),
  whatToDo: z.string().describe("Role-based remediation playbook: Responsible role + exact replacement policy clause wording"),
  draftReplacementPolicyLanguage: z.string().optional().describe("Exact legal wording ready for board adoption"),
  derivedInsight: z.string().describe("Strategic business bottom line: Fine avoidance quantification and bank examiner defense argument"),
  responsibleRole: z.string().optional().describe("Departmental role, e.g. 'Chief Compliance Officer' or 'Head of Credit'"),
  statutoryRemediationTimelineDays: z.number().optional().describe("Remediation timeline in calendar days"),
});

export const GapEvaluationOutputSchema = z.object({
  executiveSummary: z.string().describe("Executive synthesis of compliance posture for Board and Bank Examiners"),
  items: z.array(GapItemSynthesisSchema),
});

export const EvaluatedGapItemSchema = GapItemSynthesisSchema.extend({
  id: z.string().uuid().optional(),
  evaluationId: z.string().uuid().optional(),
  regulatoryClauseId: z.string().uuid(),
  obligationId: z.string().uuid().nullable().optional(),
  policyClauseId: z.string().uuid().nullable().optional(),
  complianceStatus: z.enum(['ADEQUATELY_MET', 'PARTIALLY_MET', 'CRITICAL_GAP']),
  statutoryPenaltyNaira: z.number().nonnegative(),
  statutoryLegalCitation: z.string().optional(),
  draftReplacementLanguage: z.string().optional().describe("Ready-to-adopt board policy replacement language"),
  carriesPersonalCriminalLiability: z.boolean().optional(),
  carriesLicenseSuspensionRisk: z.boolean().optional(),
});

export const GapEvaluationResultSchema = z.object({
  evaluationId: z.string().uuid(),
  policyId: z.string().uuid(),
  policyTitle: z.string(),
  organizationId: z.string().uuid(),
  benchmarkDocumentVersionId: z.string().uuid(),
  benchmarkTitle: z.string(),
  overallCompliancePercentage: z.number().min(0).max(100),
  criticalGapsCount: z.number().int(),
  partiallyMetCount: z.number().int(),
  adequatelyMetCount: z.number().int(),
  totalPotentialPenaltyNaira: z.number().nonnegative(),
  items: z.array(EvaluatedGapItemSchema),
  executiveSummary: z.string(),
  analysisRunId: z.string().uuid().nullable(),
  auditId: z.string(),
  createdAt: z.string(),
});

export const AuditDefenseDossierSchema = z.object({
  dossierReference: z.string(),
  policyTitle: z.string(),
  policyVersion: z.string(),
  department: z.string(),
  organizationName: z.string(),
  benchmarkTitle: z.string(),
  benchmarkReferenceCode: z.string(),
  issuingRegulator: z.string(),
  overallCompliancePercentage: z.number(),
  criticalGapsCount: z.number(),
  partiallyMetCount: z.number(),
  adequatelyMetCount: z.number(),
  totalPotentialPenaltyNaira: z.number(),
  executiveSummary: z.string(),
  sha256VerificationHash: z.string(),
  generatedAt: z.string(),
  ccoAttestation: z.object({
    ccoName: z.string(),
    attestationStatement: z.string(),
    timestamp: z.string(),
    digitalSealHash: z.string(),
  }),
  transmittalLetter: z.object({
    recipientTitle: z.string(),
    recipientDepartment: z.string(),
    regulatorName: z.string(),
    subject: z.string(),
    body: z.string(),
  }).optional(),
  items: z.array(EvaluatedGapItemSchema),
});
