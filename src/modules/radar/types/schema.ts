import { z } from 'zod';
import {
  RegulatorCode,
  LicenseType,
  PaymentRail,
  RadarPriority,
  OrgDepartment
} from '@/shared/types';

/**
 * Zod validation schemas for Pillar 2 (Regulatory Radar & Circular Impact Tracer)
 * Strictly adheres to docs/PILLAR_2_REGULATORY_RADAR.md and docs/AI_ENGINE.md
 */

export const RadarActionItemOutputSchema = z.object({
  targetDepartment: z.enum([
    'EXECUTIVE_LEADERSHIP',
    'COMPLIANCE_LEGAL',
    'GROWTH_MARKETING',
    'PRODUCT_MANAGEMENT',
    'ENGINEERING_TECH',
    'OPERATIONS',
    'TREASURY_FINANCE'
  ]),
  actionTitle: z.string().describe('Concise actionable task title'),
  actionDescription: z.string().describe('Specific engineering or operational instruction'),
  suggestedDeadline: z.string().nullable().describe('ISO date string (YYYY-MM-DD) for task completion')
});

export const RadarRoleImpactOutputSchema = z.object({
  executiveBriefCco: z.string().describe('Statutory obligations, mandatory reporting timelines, sanctions for CCO / Legal'),
  actionBriefCoo: z.string().describe('Settlement continuity, partner bank uptime, operational workflows for COO'),
  technicalBriefProductEng: z.string().describe('API specifications, KYC flow changes, payload schemas for Product & Eng'),
  financialBriefCfo: z.string().describe('Reserve capital ratios, interchange fee caps, balance sheet exposure for CFO / Finance'),
  technicalBriefCto: z.string().optional().describe('System architecture, API specifications, DB migrations and security controls for CTO / Engineering'),
  governanceBriefCeoCro: z.string().optional().describe('Enterprise governance, systemic exposure, board reporting, license risk for CEO / CRO'),
  generalCounselBrief: z.string().optional().describe('Statutory powers, judicial citations, penalty exposure, licensing implications, precedent conflicts for General Counsel / Legal'),
  actionChecklist: z.array(RadarActionItemOutputSchema)
});

export type RadarActionItemOutput = z.infer<typeof RadarActionItemOutputSchema>;
export type RadarRoleImpactOutput = z.infer<typeof RadarRoleImpactOutputSchema>;

/**
 * Schema for layout-preserving structured extraction from circulars
 */
export const ExtractedScheduleItemSchema = z.object({
  scheduleTitle: z.string(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  notes: z.string().optional()
});

export const ExtractedCircularStructureSchema = z.object({
  rawText: z.string(),
  referenceCodeCandidate: z.string().nullable(),
  regulatorCandidate: z.string().nullable(),
  issuingDepartment: z.string().nullable(),
  signatoryName: z.string().nullable(),
  signatoryTitle: z.string().nullable(),
  officialSealsDetected: z.array(z.string()),
  addresseeText: z.string().nullable(),
  subject: z.string(),
  sections: z.array(
    z.object({
      sectionNumber: z.string(),
      heading: z.string(),
      content: z.string()
    })
  ),
  schedules: z.array(ExtractedScheduleItemSchema)
});

export type ExtractedScheduleItem = z.infer<typeof ExtractedScheduleItemSchema>;
export type ExtractedCircularStructure = z.infer<typeof ExtractedCircularStructureSchema>;

export * from './obligationSchema';

// ─────────────────────────────────────────────────────────────────────────────
// Production Document Object Model & Structured Synthesis Schema
// ─────────────────────────────────────────────────────────────────────────────

export const HorizonDocTypeEnum = z.enum([
  'Circular / Directive',
  'Regulations & Guidelines',
  'Exposure Draft',
  'Enforcement & Sanctions',
  'Legal Briefing / Law Firm Alert',
  'Reports & Research',
  'News & Events',
]);
export type HorizonDocType = z.infer<typeof HorizonDocTypeEnum>;

export const HorizonAlertTypeEnum = z.enum(['Actionable', 'Informative']);
export type HorizonAlertType = z.infer<typeof HorizonAlertTypeEnum>;

export const HorizonSeverityTierEnum = z.enum(['G1', 'G2', 'G3']);
export type HorizonSeverityTier = z.infer<typeof HorizonSeverityTierEnum>;

export const HorizonDepartmentCodeEnum = z.enum([
  'COMPLIANCE',
  'LEGAL',
  'OPERATIONS',
  'TECH_INFRA',
  'TREASURY',
  'GROWTH_MKT',
]);
export type HorizonDepartmentCode = z.infer<typeof HorizonDepartmentCodeEnum>;

export const HorizonDateItemSchema = z.object({
  id: z.string(),
  label: z.string().describe('e.g. Publication Date, Effective Date, Compliance Deadline, Event Date'),
  date: z.string().describe('ISO date string YYYY-MM-DD'),
  description: z.string().describe('One sentence explanation of what happens on this date'),
});
export type HorizonDateItem = z.infer<typeof HorizonDateItemSchema>;

export const HorizonSeverityMatrixSchema = z.object({
  tier: HorizonSeverityTierEnum.describe('G1 for low/routine/news, G2 for operational, G3 for critical/sanction risk'),
  score: z.number().min(0).max(100).describe('Empirical percentage score 0-100%'),
  natureOfDocument: z.string().describe('e.g. Directive, Guidance, Sanctions Order, Bilateral Study Tour, Communiqué'),
  associatedReports: z.array(z.string()).describe('Referenced circulars, acts, or reports'),
  externalEntities: z.array(z.string()).describe('Entities, foreign bodies, or counterparties involved'),
  complexity: z.string().describe('Core theme e.g. Data Governance, Capital Adequacy, Payment Switch, Cross-Border Remittance'),
  implementationDate: z.string().nullable().optional().describe('Implementation or effective date if known'),
});
export type HorizonSeverityMatrix = z.infer<typeof HorizonSeverityMatrixSchema>;

export const HorizonDepartmentalBriefsSchema = z.object({
  generalCounsel: z.string().optional().describe('Specific memo for General Counsel / Legal or empty if no action'),
  chiefCompliance: z.string().optional().describe('Specific memo for Chief Compliance Officer or empty if no action'),
  operations: z.string().optional().describe('Specific memo for Operations or empty if no action'),
  technicalCto: z.string().optional().describe('Specific memo for CTO / Tech Infrastructure or empty if no action'),
  financialCfo: z.string().optional().describe('Specific memo for CFO / Treasury or empty if no action'),
  governanceCeoCro: z.string().optional().describe('Specific memo for Board & CRO or empty if no action'),
});
export type HorizonDepartmentalBriefs = z.infer<typeof HorizonDepartmentalBriefsSchema>;

export function normalizeHorizonAiOutput(raw: any): any {
  if (!raw || typeof raw !== 'object') return {};

  const data: any = { ...raw };

  // If nested under metadata
  if (data.metadata && typeof data.metadata === 'object') {
    if (!data.docType && data.metadata.docType) data.docType = data.metadata.docType;
    if (!data.alertType && data.metadata.alertType) data.alertType = data.metadata.alertType;
    if (data.isRelevant === undefined && data.metadata.isRelevant !== undefined) data.isRelevant = data.metadata.isRelevant;
  }

  // Fallbacks for core classification
  if (!data.docType) data.docType = 'Circular / Directive';
  if (!data.alertType) data.alertType = 'Informative';
  if (data.isRelevant === undefined) data.isRelevant = true;

  // If executiveSummary is an object
  if (data.executiveSummary && typeof data.executiveSummary === 'object') {
    const parts = Object.values(data.executiveSummary).filter((v) => typeof v === 'string') as string[];
    data.executiveSummary = parts.join('\n\n');
  } else if (typeof data.executiveSummary !== 'string') {
    data.executiveSummary = String(data.executiveSummary || '');
  }

  // Normalize departmentalBriefs
  if (Array.isArray(data.departmentalBriefs)) {
    data.departmentalBriefs = {};
  } else if (!data.departmentalBriefs || typeof data.departmentalBriefs !== 'object') {
    data.departmentalBriefs = {};
  }

  // Normalize importantDates
  if (Array.isArray(data.importantDates)) {
    data.importantDates = data.importantDates.map((item: any, idx: number) => ({
      id: String(item.id || `dt-${idx + 1}`),
      label: String(item.label || (idx === 0 ? 'Publication Date' : 'Event Date')),
      date: String(item.date || new Date().toISOString().slice(0, 10)),
      description: String(item.description || 'Regulatory timeline date'),
    }));
  } else {
    data.importantDates = [];
  }

  // Normalize otherDates
  if (Array.isArray(data.otherDates)) {
    data.otherDates = data.otherDates.map((item: any, idx: number) => ({
      id: String(item.id || `odt-${idx + 1}`),
      label: String(item.label || 'Other Date'),
      date: String(item.date || new Date().toISOString().slice(0, 10)),
      description: String(item.description || 'Secondary date'),
    }));
  } else {
    data.otherDates = [];
  }

  // Normalize severityMatrix
  if (!data.severityMatrix || typeof data.severityMatrix !== 'object') {
    data.severityMatrix = {
      tier: 'G1',
      score: 20,
      natureOfDocument: 'Regulatory Intelligence',
      associatedReports: [],
      externalEntities: [],
      complexity: 'General Statutory Triage',
      implementationDate: null,
    };
  } else {
    let tier = String(data.severityMatrix.tier || 'G1').toUpperCase();
    if (!['G1', 'G2', 'G3'].includes(tier)) tier = 'G1';
    data.severityMatrix.tier = tier;

    let score = Number(data.severityMatrix.score);
    if (isNaN(score)) score = tier === 'G3' ? 75 : tier === 'G2' ? 50 : 20;
    data.severityMatrix.score = Math.max(0, Math.min(100, Math.round(score)));

    if (!Array.isArray(data.severityMatrix.associatedReports)) data.severityMatrix.associatedReports = [];
    if (!Array.isArray(data.severityMatrix.externalEntities)) data.severityMatrix.externalEntities = [];
    if (!data.severityMatrix.natureOfDocument) data.severityMatrix.natureOfDocument = 'Regulatory Intelligence';
    if (!data.severityMatrix.complexity) data.severityMatrix.complexity = 'General Governance';
  }

  // Normalize topics
  if (!Array.isArray(data.topics) || data.topics.length === 0) {
    data.topics = [data.docType || 'Regulatory Intelligence', 'Compliance'];
  }

  // Normalize impactedAreas
  if (!Array.isArray(data.impactedAreas) || data.impactedAreas.length === 0) {
    data.impactedAreas = ['Compliance', 'Operations'];
  }

  // Normalize impactedDepartments
  const allowedDepts = ['COMPLIANCE', 'LEGAL', 'OPERATIONS', 'TECH_INFRA', 'TREASURY', 'GROWTH_MKT'];
  if (Array.isArray(data.impactedDepartments)) {
    data.impactedDepartments = data.impactedDepartments
      .map((d: any) => String(d).toUpperCase())
      .filter((d: string) => allowedDepts.includes(d));
  } else {
    data.impactedDepartments = [];
  }

  // Normalize keyPoints
  if (!Array.isArray(data.keyPoints) || data.keyPoints.length === 0) {
    data.keyPoints = [
      `Factual notice regarding ${data.docType || 'regulatory matter'}.`,
      'Applicable institutional teams should review notice details for operational context.',
    ];
  } else {
    data.keyPoints = data.keyPoints.map((k: any) => String(k));
  }

  return data;
}

export const BaseHorizonSynthesisOutputSchema = z.object({
  docType: HorizonDocTypeEnum.describe('Accurate document taxonomy classification'),
  alertType: HorizonAlertTypeEnum.describe('Actionable if creating compliance duties, Informative if news/PR/events'),
  isRelevant: z.boolean().describe('True if relevant to licensed African/Nigerian financial entities, fintechs, banks'),
  executiveSummary: z.string().describe('1-2 rich, natural paragraphs summarizing what the document actually states without boilerplate templates'),
  keyPoints: z.array(z.string()).min(2).max(6).describe('3 to 6 concrete, verifiable takeaways citing facts, sections, or announcements in text'),
  impactedDepartments: z.array(HorizonDepartmentCodeEnum).describe('Departments genuinely impacted; empty or awareness only for Informative alerts'),
  departmentalBriefs: HorizonDepartmentalBriefsSchema.describe('Role memos with concrete steps, or empty/omitted if Informative'),
  importantDates: z.array(HorizonDateItemSchema).describe('Dates explicitly mentioned in document'),
  otherDates: z.array(HorizonDateItemSchema).optional().default([]).describe('Secondary event dates or historical references'),
  severityMatrix: HorizonSeverityMatrixSchema.describe('Calculated empirical severity matrix'),
  topics: z.array(z.string()).describe('Topic tags relevant to document'),
  impactedAreas: z.array(z.string()).describe('Business functional areas impacted'),
});

export const HorizonSynthesisOutputSchema = z.preprocess(
  normalizeHorizonAiOutput,
  BaseHorizonSynthesisOutputSchema
);
export type HorizonSynthesisOutput = z.infer<typeof BaseHorizonSynthesisOutputSchema>;


