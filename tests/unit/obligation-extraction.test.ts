import { describe, it, expect, vi } from 'vitest';
import {
  ObligationExtractionService,
  ValidatedObligation,
  StatedPenalty,
  ApplicabilityEngine,
  ClauseSegmentationEngine,
  TenantProfileContext,
  RichTenantProfileContext,
  ObligationTargetingContext,
} from '@/modules/radar';
import { AiEngine } from '@/shared/ai-engine';

describe('Phase 2: LLM-Driven Statutory Obligation Extraction & Grounded Quote Validation', () => {
  // Canonical multi-sentence Nigerian regulatory clause (CBN Contactless & Cyber Security Framework)
  const canonicalClauseText =
    '2.1 All Commercial Banks and Payment Service Providers shall implement mandatory two-factor authentication for all contactless transactions exceeding ₦15,000. ' +
    'Furthermore, regulated institutions must submit monthly transaction velocity and fraud reports to the Director of Payments System Management within 10 days of each calendar month-end. ' +
    'No licensed financial institution shall process international card acquiring transactions without obtaining prior written approval from the Central Bank of Nigeria. ' +
    'Any regulated entity that fails to comply with the reporting requirements of this section shall be liable to an administrative penalty of ₦10,000,000 and a daily default sanction of ₦200,000 for each day of default pursuant to BOFIA 2020 Section 57.';

  // Clause with zero stated penalties
  const zeroPenaltyClauseText =
    '4.2 Every Mobile Money Operator shall maintain a dedicated customer redress desk and resolve customer transaction disputes within 48 hours of lodgment. ' +
    'All operators must publish an escalation matrix on their mobile applications.';

  describe('1. Multi-Obligation Decomposition from Multi-Sentence Statutory Clauses', () => {
    it('decomposes a multi-sentence statutory clause into discrete actionable obligations', async () => {
      const obligations = ObligationExtractionService.extractDeterministicFallback({
        clauseText: canonicalClauseText,
        clauseReference: 'Section 2.1',
        sectionHeading: 'Operational Guidelines for Contactless Payments',
        regulatorCode: 'CBN',
        circularNumber: 'PSM/DIR/CON/CWS/08/014',
      });

      // Must extract at least 3 discrete obligations from the 4 sentences
      expect(obligations.length).toBeGreaterThanOrEqual(3);

      // Verify each obligation has distinct identifiers and operative components
      const types = obligations.map((o) => o.obligationType);
      expect(types).toContain('MANDATORY_DISCLOSURE'); // "must submit monthly..."
      expect(types).toContain('STRICT_PROHIBITION'); // "No licensed financial institution shall process..."

      // Verify timeline extraction
      const timelineObl = obligations.find((o) => o.obligationType === 'MANDATORY_DISCLOSURE');
      expect(timelineObl).toBeDefined();
      expect(timelineObl?.statutoryTimelineDays).toBe(10);
      expect(timelineObl?.deadline).toContain('within 10 days');

      // Verify strict prohibition
      const prohibitionObl = obligations.find((o) => o.obligationType === 'STRICT_PROHIBITION');
      expect(prohibitionObl).toBeDefined();
      expect(prohibitionObl?.action).toContain('is prohibited from');

      // Verify Zango-grade depth: assessment and compliance criteria are present
      expect(obligations[0].assessment).toBeTruthy();
      expect(obligations[0].complianceCriteria).toBeDefined();
      expect(obligations[0].complianceCriteria!.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts discrete obligations when using LLM structured extraction', async () => {
      const mockAiEngine = {
        generateStructured: vi.fn().mockResolvedValue({
          data: {
            obligations: [
              {
                actor: 'Commercial Banks',
                action: 'shall implement',
                object: 'two-factor authentication for contactless transactions exceeding ₦15,000',
                condition: 'transactions exceeding ₦15,000',
                deadline: null,
                statutoryTimelineDays: null,
                obligationType: 'GOVERNANCE_CONTROL',
                severityFloor: 'HIGH',
                verbatimQuote:
                  'All Commercial Banks and Payment Service Providers shall implement mandatory two-factor authentication for all contactless transactions exceeding ₦15,000.',
                statedPenalty: null,
                targetedLicenses: ['COMMERCIAL_BANK', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
                affectedRails: ['CARD_ACQUIRING_VERVE', 'CARD_ACQUIRING_MASTERCARD_VISA'],
                appliesUniversally: false,
              },
              {
                actor: 'Payment Service Providers',
                action: 'must submit',
                object: 'monthly transaction velocity and fraud reports',
                condition: null,
                deadline: 'within 10 days of each calendar month-end',
                statutoryTimelineDays: 10,
                obligationType: 'MANDATORY_DISCLOSURE',
                severityFloor: 'MEDIUM',
                verbatimQuote:
                  'regulated institutions must submit monthly transaction velocity and fraud reports to the Director of Payments System Management within 10 days of each calendar month-end.',
                statedPenalty: null,
                targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
                affectedRails: [],
                appliesUniversally: false,
              },
            ],
          },
          telemetry: {
            modelIdentifier: 'gemini-3.8-flash',
            latencyMs: 350,
            inputTokenCount: 150,
            outputTokenCount: 120,
            rawPromptHash: 'abc',
            rawOutputHash: 'def',
            retryAttempts: 0,
          },
        }),
      } as unknown as AiEngine;

      const extractor = new ObligationExtractionService({ aiEngine: mockAiEngine });
      const results = await extractor.extractObligationsFromClause({
        clauseText: canonicalClauseText,
        clauseReference: 'Section 2.1',
        regulatorCode: 'CBN',
      });

      expect(results).toHaveLength(2);
      expect(results[0].actor).toBe('Commercial Banks');
      expect(results[0].isValidated).toBe(true);
      expect(results[0].groundingConfidence).toBe(1.0);
      expect(results[1].statutoryTimelineDays).toBe(10);
    });
  });

  describe('2. Deterministic Quote-to-Source Validation & Grounding', () => {
    it('accurately validates and anchors exact verbatim quotes in source text', () => {
      const quote =
        'No licensed financial institution shall process international card acquiring transactions without obtaining prior written approval from the Central Bank of Nigeria.';

      const anchor = ObligationExtractionService.validateAndAnchorQuote(quote, canonicalClauseText);

      expect(anchor).not.toBeNull();
      expect(anchor!.confidence).toBe(1.0);
      expect(canonicalClauseText.substring(anchor!.startChar, anchor!.endChar)).toBe(quote);
      expect(canonicalClauseText.includes(anchor!.verbatimQuote)).toBe(true);
    });

    it('anchors quotes with normalized whitespace variations (newlines, extra spaces)', () => {
      const quoteWithNewlines =
        'All Commercial Banks and Payment Service Providers\n  shall implement mandatory two-factor authentication\nfor all contactless transactions exceeding ₦15,000.';

      const anchor = ObligationExtractionService.validateAndAnchorQuote(
        quoteWithNewlines,
        canonicalClauseText
      );

      expect(anchor).not.toBeNull();
      expect(anchor!.confidence).toBeGreaterThanOrEqual(0.95);
      // The verbatimQuote must be anchored to the actual text substring!
      expect(canonicalClauseText.substring(anchor!.startChar, anchor!.endChar)).toBe(
        anchor!.verbatimQuote
      );
      expect(canonicalClauseText.includes(anchor!.verbatimQuote)).toBe(true);
    });

    it('rejects and discards hallucinated quotes that do not exist in the source text', async () => {
      const mockAiWithHallucination = {
        generateStructured: vi.fn().mockResolvedValue({
          data: {
            obligations: [
              {
                actor: 'Commercial Banks',
                action: 'must pay',
                object: 'Special 5% turnover levy to the Federal Ministry of Finance',
                condition: null,
                deadline: null,
                statutoryTimelineDays: null,
                obligationType: 'GOVERNANCE_CONTROL',
                severityFloor: 'CRITICAL',
                // This quote is completely fabricated / not in the source text:
                verbatimQuote:
                  'Every fintech company in Lagos must pay a synthetic 5% revenue surcharge immediately.',
                statedPenalty: null,
              },
              {
                actor: 'Licensed Financial Institution',
                action: 'is prohibited from',
                object: 'processing international card acquiring transactions without approval',
                condition: null,
                deadline: null,
                statutoryTimelineDays: null,
                obligationType: 'STRICT_PROHIBITION',
                severityFloor: 'HIGH',
                // This quote IS authentic:
                verbatimQuote:
                  'No licensed financial institution shall process international card acquiring transactions without obtaining prior written approval from the Central Bank of Nigeria.',
                statedPenalty: null,
              },
            ],
          },
          telemetry: {
            modelIdentifier: 'gemini-3.8-flash',
            latencyMs: 400,
            inputTokenCount: 120,
            outputTokenCount: 90,
            rawPromptHash: 'abc',
            rawOutputHash: 'def',
            retryAttempts: 0,
          },
        }),
      } as unknown as AiEngine;

      const extractor = new ObligationExtractionService({ aiEngine: mockAiWithHallucination });
      const results = await extractor.extractObligationsFromClause({
        clauseText: canonicalClauseText,
        clauseReference: 'Section 2.1',
      });

      // The fabricated obligation must be dropped!
      expect(results).toHaveLength(1);
      expect(results[0].verbatimQuote).toContain('No licensed financial institution shall process');
      expect(canonicalClauseText.includes(results[0].verbatimQuote)).toBe(true);
    });
  });

  describe('3. Strict Character-Span Mapping', () => {
    it('guarantees startChar and endChar offsets strictly match verbatimQuote', () => {
      const obligations = ObligationExtractionService.extractDeterministicFallback({
        clauseText: zeroPenaltyClauseText,
        clauseReference: 'Section 4.2',
        regulatorCode: 'CBN',
      });

      expect(obligations.length).toBeGreaterThan(0);

      for (const obl of obligations) {
        expect(obl.startChar).toBeGreaterThanOrEqual(0);
        expect(obl.endChar).toBeGreaterThan(obl.startChar);
        expect(zeroPenaltyClauseText.substring(obl.startChar, obl.endChar)).toBe(obl.verbatimQuote);
        expect(zeroPenaltyClauseText.includes(obl.verbatimQuote)).toBe(true);
      }
    });
  });

  describe('4. Authentic Penalty Grounding (NOTHING MADE UP, EVER)', () => {
    it('returns null penalty when clause contains no stated fines or sanctions', () => {
      const obligations = ObligationExtractionService.extractDeterministicFallback({
        clauseText: zeroPenaltyClauseText,
        clauseReference: 'Section 4.2',
        regulatorCode: 'CBN',
      });

      for (const obl of obligations) {
        expect(obl.statedPenalty).toBeNull();
      }
    });

    it('extracts authentic statutory fines and compounding daily penalties from text', () => {
      const obligations = ObligationExtractionService.extractDeterministicFallback({
        clauseText: canonicalClauseText,
        clauseReference: 'Section 2.1',
        regulatorCode: 'CBN',
      });

      const penaltyObl = obligations.find((o) => o.statedPenalty !== null);
      expect(penaltyObl).toBeDefined();
      expect(penaltyObl!.statedPenalty!.minNaira).toBe(10_000_000);
      expect(penaltyObl!.statedPenalty!.dailyFineNaira).toBe(200_000);
      expect(penaltyObl!.statedPenalty!.citation).toContain('BOFIA 2020 Section 57');
    });

    it('rejects synthetic fallback fines when text has no penalty keywords', () => {
      const syntheticPenalty: StatedPenalty = {
        minNaira: 10_000_000,
        maxNaira: 20_000_000,
        dailyFineNaira: 500_000,
        carriesPersonalCriminalLiability: false,
        carriesLicenseSuspensionRisk: false,
        citation: 'Default Synthetic Penalty Schedule',
      };

      const verified = ObligationExtractionService.verifyStatedPenalty(
        syntheticPenalty,
        'All operators must publish an escalation matrix on their mobile applications.',
        zeroPenaltyClauseText
      );

      // Must be nullified because zeroPenaltyClauseText does not contain any penalty terms
      expect(verified).toBeNull();
    });
  });

  describe('5. Per-Obligation Tenant Profile Applicability Engine', () => {
    const commercialBankTenant: RichTenantProfileContext = {
      organizationId: 'org-cbn-bank-01',
      organizationName: 'Sterling Standard Bank Ltd',
      activeLicenses: ['COMMERCIAL_BANK'],
      activeRails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
      licenses: [
        {
          licenseType: 'COMMERCIAL_BANK',
          licenseNumber: 'CBN/BSD/DMB/2020/003',
          isActive: true,
        },
      ],
      paymentRails: [
        {
          railType: 'NIBSS_NIP',
          isActive: true,
        },
        {
          railType: 'CARD_ACQUIRING_MASTERCARD_VISA',
          isActive: true,
        },
      ],
    };

    it('evaluates applicability for license-matched obligation and generates statutory rationale', () => {
      const obligationTargeting: ObligationTargetingContext = {
        obligationId: 'obl-bofia-57',
        actor: 'Commercial Banks',
        targetedLicenses: ['COMMERCIAL_BANK', 'MERCHANT_BANK'],
        affectedRails: [],
        appliesUniversally: false,
        statutoryCitation: 'BOFIA 2020 s.57',
        clauseReference: 'Section 2.1',
      };

      const result = ApplicabilityEngine.evaluateObligationPure(
        commercialBankTenant,
        obligationTargeting
      );

      expect(result.isApplicable).toBe(true);
      expect(result.matchedLicenses).toContain('COMMERCIAL_BANK');
      expect(result.reason).toContain('BOFIA 2020 s.57');
      expect(result.reason).toContain('COMMERCIAL_BANK (CBN/BSD/DMB/2020/003)');
    });

    it('evaluates applicability for payment-rail matched obligation', () => {
      const obligationTargeting: ObligationTargetingContext = {
        obligationId: 'obl-card-limit',
        actor: 'Payment Switch',
        targetedLicenses: ['SWITCHING_AND_PROCESSING'],
        affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
        appliesUniversally: false,
        statutoryCitation: 'CBN Guidelines on Card Operations 2024',
      };

      const result = ApplicabilityEngine.evaluateObligationPure(
        commercialBankTenant,
        obligationTargeting
      );

      expect(result.isApplicable).toBe(true);
      expect(result.matchedRails).toContain('CARD_ACQUIRING_MASTERCARD_VISA');
      expect(result.reason).toContain('CARD ACQUIRING MASTERCARD VISA');
    });

    it('correctly filters out non-applicable obligations with clear explanation', () => {
      const obligationTargeting: ObligationTargetingContext = {
        obligationId: 'obl-sec-vasp',
        actor: 'Virtual Asset Service Providers',
        targetedLicenses: ['CRYPTO_VASP_SEC_APPROVED'],
        affectedRails: [],
        appliesUniversally: false,
        statutoryCitation: 'SEC Nigeria Rules on Digital Assets 2024 Section 12',
      };

      const result = ApplicabilityEngine.evaluateObligationPure(
        commercialBankTenant,
        obligationTargeting
      );

      expect(result.isApplicable).toBe(false);
      expect(result.matchedLicenses).toHaveLength(0);
      expect(result.reason).toContain('Not applicable: obligation targets [ CRYPTO_VASP_SEC_APPROVED ]');
    });

    it('applies universal obligations to all tenants with statutory citation', () => {
      const obligationTargeting: ObligationTargetingContext = {
        obligationId: 'obl-ndpa-audit',
        actor: 'All Data Controllers',
        targetedLicenses: [],
        affectedRails: [],
        appliesUniversally: true,
        statutoryCitation: 'Nigeria Data Protection Act 2023 Section 34',
      };

      const result = ApplicabilityEngine.evaluateObligationPure(
        commercialBankTenant,
        obligationTargeting
      );

      expect(result.isApplicable).toBe(true);
      expect(result.reason).toContain('universal statutory mandate');
      expect(result.reason).toContain('Nigeria Data Protection Act 2023 Section 34');
    });

    it('evaluates multiple obligations in batch preserving individual IDs and citations', () => {
      const batchObligations: ObligationTargetingContext[] = [
        {
          obligationId: 'obl-1',
          targetedLicenses: ['COMMERCIAL_BANK'],
          statutoryCitation: 'BOFIA 2020 s.57',
        },
        {
          obligationId: 'obl-2',
          targetedLicenses: ['CRYPTO_VASP_SEC_APPROVED'],
          statutoryCitation: 'SEC VASP Rule 4',
        },
      ];

      const results = ApplicabilityEngine.evaluateObligationsPure(
        commercialBankTenant,
        batchObligations
      );

      expect(results).toHaveLength(2);
      expect(results[0].obligationId).toBe('obl-1');
      expect(results[0].isApplicable).toBe(true);
      expect(results[1].obligationId).toBe('obl-2');
      expect(results[1].isApplicable).toBe(false);
    });
  });

  describe('6. Granular Database Persistence & Provenance Anchoring', () => {
    it('persists verified obligations, character spans, stated penalties, and applicability rules', async () => {
      const insertedRows: Record<string, any[]> = {
        regulatory_obligations: [],
        statutory_penalties: [],
        applicability_rules: [],
      };

      const mockDb = {
        from: vi.fn().mockImplementation((table: string) => ({
          insert: vi.fn().mockImplementation(async (data: any) => {
            if (!insertedRows[table]) insertedRows[table] = [];
            insertedRows[table].push(data);
            return { error: null };
          }),
        })),
      } as any;

      const extractor = new ObligationExtractionService({ dbClient: mockDb });

      const sampleObligation: ValidatedObligation = {
        id: 'obl-uuid-001',
        clauseId: 'clause-uuid-001',
        clauseReference: 'Section 2.1',
        pageNumber: 2,
        actor: 'Commercial Banks',
        action: 'shall maintain',
        object: 'Statutory Liquidity Reserve of 30%',
        condition: null,
        deadline: 'within 10 days',
        statutoryTimelineDays: 10,
        obligationType: 'GOVERNANCE_CONTROL',
        severityFloor: 'CRITICAL',
        verbatimQuote: 'Commercial Banks shall maintain Statutory Liquidity Reserve of 30%.',
        startChar: 45,
        endChar: 110,
        statedPenalty: {
          minNaira: 50_000_000,
          maxNaira: 100_000_000,
          dailyFineNaira: 1_000_000,
          carriesPersonalCriminalLiability: true,
          carriesLicenseSuspensionRisk: true,
          citation: 'BOFIA 2020 Section 15(4)',
        },
        summary: 'Commercial Banks shall maintain Statutory Liquidity Reserve of 30%',
        targetedLicenses: ['COMMERCIAL_BANK'],
        affectedRails: ['NIBSS_NIP'],
        appliesUniversally: false,
        isValidated: true,
        groundingConfidence: 1.0,
      };

      const count = await extractor.persistObligations([
        {
          clauseId: 'clause-uuid-001',
          pageNumber: 2,
          obligations: [sampleObligation],
        },
      ]);

      expect(count).toBe(1);

      // Verify regulatory_obligations row
      expect(insertedRows.regulatory_obligations).toHaveLength(1);
      const savedObl = insertedRows.regulatory_obligations[0];
      expect(savedObl.id).toBe('obl-uuid-001');
      expect(savedObl.clause_id).toBe('clause-uuid-001');
      expect(savedObl.verbatim_quote).toBe('Commercial Banks shall maintain Statutory Liquidity Reserve of 30%.');
      expect(savedObl.character_span_start).toBe(45);
      expect(savedObl.character_span_end).toBe(110);
      expect(savedObl.page_number).toBe(2);

      // Verify statutory_penalties row
      expect(insertedRows.statutory_penalties).toHaveLength(1);
      const savedPenalty = insertedRows.statutory_penalties[0];
      expect(savedPenalty.obligation_id).toBe('obl-uuid-001');
      expect(savedPenalty.penalty_min_naira).toBe(50_000_000);
      expect(savedPenalty.daily_fine_naira).toBe(1_000_000);
      expect(savedPenalty.carries_personal_criminal_liability).toBe(true);

      // Verify applicability_rules rows
      expect(insertedRows.applicability_rules.length).toBeGreaterThanOrEqual(2);
      const licenseRule = insertedRows.applicability_rules.find(
        (r) => r.applicable_license_type === 'COMMERCIAL_BANK'
      );
      expect(licenseRule).toBeDefined();
    });
  });
});
