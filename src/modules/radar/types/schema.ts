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
