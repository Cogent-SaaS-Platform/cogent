import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  RegulatoryExtractionService,
  StatutoryExtractionResultSchema,
} from '@/modules/regulatory/services/regulatoryExtractionService';
import { GET as getLibraryRoute } from '@/app/api/library/route';
import { GET as getInstrumentObligationsRoute } from '@/app/api/library/[id]/obligations/route';
import { PATCH as patchObligationRoute } from '@/app/api/obligations/[id]/route';
import { POST as postCriterionRoute } from '@/app/api/obligations/[id]/criteria/route';

describe('Regulation Library Production Architecture (Zango 01:20 - 02:30 Reference)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Statutory Extraction Engine & Schema Validation', () => {
    it('should validate structured extraction schema with real statutory fields', () => {
      const validResult = {
        overview: 'The Central Bank of Nigeria Guidelines on Contactless Payments establish supervisory limits, consumer protections, and transaction monitoring duties across authorized payment service providers.',
        scope: 'Deposit Money Banks, Other Financial Institutions, Payment Service Providers, Switching and Processing Companies, Card Schemes, and Acquirers.',
        keyRequirementAreas: [
          {
            title: 'Transaction Ceilings',
            description: 'Maximum single transaction limit of ₦15,000 and cumulative daily limit of ₦50,000 without PIN verification.',
          },
          {
            title: 'Fraud Liability Allocation',
            description: 'Zero customer liability for unauthorized contactless transactions executed without two-factor authentication.',
          },
          {
            title: 'Supervisory Returns',
            description: 'Monthly statutory reporting to the CBN Payments System Management Department.',
          },
        ],
        domain: 'FINTECH_PAYMENTS',
        instrumentType: 'GUIDELINE',
        publicationDate: '2023-06-27',
        entryIntoForceDate: '2023-06-27',
        sections: [
          {
            sectionNumber: 'Section 3.0',
            sectionTitle: 'Transaction Limits and Verification Requirements',
            content: 'Contactless transactions without customer verification shall not exceed ₦15,000 per transaction.',
          },
        ],
        obligations: [
          {
            sectionNumber: 'Section 3.1',
            title: 'Mandatory Transaction Limit Enforcement',
            description: 'Payment service providers must enforce contactless transaction ceiling of ₦15,000 without PIN verification.',
            obligationType: 'Prescriptive' as const,
            policyApplicability: 'Policy Applicable' as const,
            verbatimQuote: 'Contactless transactions without customer verification shall not exceed fifteen thousand Naira (₦15,000) per single transaction.',
            sectionOrPageRef: 'Section 3.1',
            assessmentCriteria: [
              {
                type: 'Core Criteria' as const,
                text: 'Internal switch routing rules hard-reject transactions exceeding ₦15,000 without PIN verification.',
                evidenceRequired: 'Switch routing configuration and terminal parameter inspection report.',
              },
            ],
            riskDescription: 'Failure to enforce limits triggers direct monetary fines under BOFIA 2020 §65.',
          },
        ],
      };

      const parsed = StatutoryExtractionResultSchema.safeParse(validResult);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.overview).not.toContain('Untitled');
        expect(parsed.data.keyRequirementAreas.length).toBe(3);
        expect(parsed.data.obligations[0].obligationType).toBe('Prescriptive');
        expect(parsed.data.obligations[0].assessmentCriteria[0].type).toBe('Core Criteria');
      }
    });

    it('should generate robust offline fallback extraction when LLM is unavailable', async () => {
      const service = new RegulatoryExtractionService();
      const fallback = service.deterministicFallbackExtraction({
        cleanText: 'Section 1.0 General Provisions. Regulated entities must maintain adequate capital reserves.',
        title: 'Prudential Banking Capital Adequacy Framework',
        regulatorCode: 'CBN',
        year: 2024,
      });

      expect(fallback).toBeDefined();
      expect(fallback.overview).toBeDefined();
      expect(fallback.overview.length).toBeGreaterThan(20);
      expect(fallback.scope).toBeDefined();
      expect(fallback.keyRequirementAreas.length).toBeGreaterThanOrEqual(2);
      expect(fallback.sections.length).toBeGreaterThanOrEqual(1);
      expect(fallback.obligations.length).toBeGreaterThanOrEqual(1);
      expect(fallback.obligations[0].verbatimQuote).toBeDefined();
      expect(fallback.obligations[0].assessmentCriteria.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. PATCH /api/obligations/[id] (Inspector Edit Mode & Audit Persistence)', () => {
    it('should successfully handle obligation updates for dev/mock and return updated state', async () => {
      const req = new NextRequest('http://localhost:3000/api/obligations/obl-mock-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleType: 'Risk Based',
          policyApplicability: 'Operational Only',
          status: 'Reviewed / Active',
          isRelevant: false,
        }),
      });

      const res = await patchObligationRoute(req, {
        params: Promise.resolve({ id: 'obl-mock-123' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updated.ruleType).toBe('Risk Based');
      expect(data.updated.status).toBe('Reviewed / Active');
      expect(data.updated.isRelevant).toBe(false);
    });
  });

  describe('3. POST /api/obligations/[id]/criteria (Interactive Assessment Criteria)', () => {
    it('should validate criterion text and reject empty submissions', async () => {
      const req = new NextRequest('http://localhost:3000/api/obligations/obl-mock-123/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          type: 'Core Criteria',
        }),
      });

      const res = await postCriterionRoute(req, {
        params: Promise.resolve({ id: 'obl-mock-123' }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('text is required');
    });

    it('should accept valid criteria and return criterion object', async () => {
      const req = new NextRequest('http://localhost:3000/api/obligations/obl-mock-123/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Annual third-party audit verifies contactless encryption keys and PIN blocks.',
          type: 'Best Practice',
          evidenceRequired: 'Independent external penetration test and key management audit report.',
        }),
      });

      const res = await postCriterionRoute(req, {
        params: Promise.resolve({ id: 'obl-mock-123' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.criterion.type).toBe('Best Practice');
      expect(data.criterion.text).toContain('Annual third-party audit');
    });
  });

  describe('4. GET /api/library (Screen 1 Directory List)', () => {
    it('should return 200 with instruments array and live statistics', async () => {
      const req = new NextRequest('http://localhost:3000/api/library');
      const res = await getLibraryRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.instruments)).toBe(true);
      expect(data.totalCount).toBeGreaterThanOrEqual(1);

      if (data.instruments.length > 0) {
        const inst = data.instruments[0];
        expect(inst.id).toBeDefined();
        expect(inst.shortTitle).toBeDefined();
        expect(inst.regulator).toBeDefined();
        expect(inst.jurisdiction).toBeDefined();
        expect(inst.domain).toBeDefined();
      }
    });
  });

  describe('5. GET /api/library/[id]/obligations (Screen 3 Split-Screen Data)', () => {
    it('should return sections with decomposed obligations and assessment criteria', async () => {
      const req = new NextRequest('http://localhost:3000/api/library/seed-cbn-bofia/obligations');
      const res = await getInstrumentObligationsRoute(req, {
        params: Promise.resolve({ id: 'seed-cbn-bofia' }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.sections)).toBe(true);

      if (data.sections.length > 0) {
        const sec = data.sections[0];
        expect(sec.sectionReference).toBeDefined();
        expect(sec.sectionHeading).toBeDefined();
        expect(Array.isArray(sec.obligations)).toBe(true);

        if (sec.obligations.length > 0) {
          const obl = sec.obligations[0];
          expect(obl.ruleType).toBeDefined();
          expect(obl.verbatimQuote).toBeDefined();
          expect(Array.isArray(obl.assessmentCriteria)).toBe(true);
        }
      }
    });
  });
});
