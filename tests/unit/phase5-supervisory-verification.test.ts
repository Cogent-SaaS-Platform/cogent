import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoldenBenchmarkEvaluator } from '@/modules/radar/services/goldenBenchmarkEvaluator';
import { OperationalTelemetryService } from '@/modules/operations/services/operationalTelemetryService';
import { TenantBootstrapService } from '@/modules/onboarding/services/tenantBootstrapService';
import { GoldenBenchmarkInstrument } from '@/modules/radar/services/goldenBenchmarkEvaluator';

function createMockQueryBuilder(resolvedData: any = []) {
  const builder: any = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: Array.isArray(resolvedData) ? resolvedData[0] || null : resolvedData, error: null })),
    then: (resolve: any, reject?: any) => Promise.resolve({ data: resolvedData, error: null }).then(resolve, reject),
  };
  return builder;
}

describe('Phase 5: Supervisory Verification, Telemetry & Launch Certification', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Golden Benchmark Evaluator Engine
  // ──────────────────────────────────────────────────────────────────────────
  describe('GoldenBenchmarkEvaluator', () => {
    it('initializes and executes evaluation over synthetic or loaded golden instruments', async () => {
      const mockInstrument: GoldenBenchmarkInstrument = {
        id: 'test-inst-001',
        regulator: 'CBN',
        title: 'Guidelines on Contactless Payments',
        circular_reference: 'PSM/DIR/CON/CWS/08/014',
        published_date: '2023-06-27',
        canonical_source_url: 'https://example.com/cbn.pdf',
        applicable_licenses: ['COMMERCIAL_BANK'],
        applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
        raw_text:
          'Section 1.1 All commercial banks shall ensure contactless transactions do not exceed ₦50,000 per transaction.',
        ground_truth_obligations: [
          {
            obligation_id: 'gt-01',
            verbatim_quote:
              'All commercial banks shall ensure contactless transactions do not exceed ₦50,000 per transaction.',
            character_span_start: 12,
            character_span_end: 110,
            actor: 'All commercial banks',
            action: 'shall ensure',
            target_object: 'contactless transactions do not exceed ₦50,000 per transaction',
            condition: null,
            deadline_text: null,
            obligation_type: 'STATUTORY_TIMELINE',
            statutory_penalty: null,
            applicable_licenses: ['COMMERCIAL_BANK'],
            applicable_rails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
          },
        ],
      };

      const evaluator = new GoldenBenchmarkEvaluator();
      const result = evaluator.evaluateInstrument(mockInstrument);

      expect(result.instrumentId).toBe('test-inst-001');
      expect(result.regulator).toBe('CBN');
      expect(result.groundTruthCount).toBe(1);
      expect(result.characterSpanFidelity).toBe(1.0);
      expect(result.statutoryPenaltyGrounding).toBe(1.0);
    });

    it('generates a 64-character SHA-256 seal for benchmark runs', async () => {
      const evaluator = new GoldenBenchmarkEvaluator();
      const suiteResult = await evaluator.runBenchmarkSuite();

      expect(suiteResult.totalInstruments).toBeGreaterThanOrEqual(1);
      expect(suiteResult.sha256Seal).toMatch(/^[a-f0-9]{64}$/);
      expect(suiteResult.precision).toBeGreaterThanOrEqual(0.85);
      expect(suiteResult.recall).toBeGreaterThanOrEqual(0.85);
      expect(suiteResult.characterSpanFidelity).toBe(1.0);
      expect(suiteResult.statutoryPenaltyGrounding).toBe(1.0);
      expect(suiteResult.hallucinatedPenaltiesCount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Supervisory Telemetry Service
  // ──────────────────────────────────────────────────────────────────────────
  describe('OperationalTelemetryService', () => {
    let mockSupabase: any;

    beforeEach(() => {
      mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'source_runs') {
            return createMockQueryBuilder([
              {
                id: 'run-1',
                source_code: 'CBN_CIRCULARS_MAIN',
                status: 'OPERATIONAL',
                http_status: 200,
                response_latency_ms: 120,
                started_at: new Date().toISOString(),
              },
            ]);
          }
          if (table === 'compliance_cascade_events') {
            return createMockQueryBuilder([
              {
                id: 'evt-1',
                status: 'COMPLETED',
                processing_latency_ms: 45,
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
              },
            ]);
          }
          if (table === 'supervisory_benchmark_runs') {
            return createMockQueryBuilder([
              {
                id: 'bench-1',
                total_instruments: 26,
                precision_score: 0.9787,
                recall_score: 1.0,
                f1_score: 0.9892,
                character_span_fidelity_score: 1.0,
                statutory_penalty_grounding_score: 1.0,
                sha256_seal: '84f037ece908efb8b043fb2f2b5c496c68842538efc61b1d850a70d722794634',
                created_at: new Date().toISOString(),
              },
            ]);
          }
          return createMockQueryBuilder([]);
        }),
      };
    });

    it('compiles a complete supervisory telemetry report across all 4 operational domains', async () => {
      const service = new OperationalTelemetryService(mockSupabase);
      const report = await service.getSupervisoryTelemetryReport('org-123');

      expect(report.overview).toBeDefined();
      expect(report.scrapers).toBeDefined();
      expect(report.scrapers.sources.length).toBeGreaterThanOrEqual(1);
      expect(report.cascadeLedger).toBeDefined();
      expect(report.inferenceTelemetry).toBeDefined();
      expect(report.goldenBenchmark).toBeDefined();
      expect(report.goldenBenchmark.precisionPercentage).toBeGreaterThanOrEqual(90);
      expect(report.goldenBenchmark.sha256Seal).toHaveLength(64);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Tenant Rapid Onboarding Service
  // ──────────────────────────────────────────────────────────────────────────
  describe('TenantBootstrapService', () => {
    let mockSupabase: any;

    beforeEach(() => {
      mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tenant_licenses' || table === 'tenant_payment_rails') {
            return createMockQueryBuilder([]);
          }
          if (table === 'radar_circulars') {
            return createMockQueryBuilder([
              {
                id: 'circ-1',
                circular_number: 'PSM/DIR/CON/CWS/08/014',
                subject: 'Contactless Payments Guidelines',
                targeted_license_types: ['COMMERCIAL_BANK'],
                affected_payment_rails: ['CARD_ACQUIRING_MASTERCARD_VISA'],
                applies_universally: false,
                raw_text:
                  'All commercial banks shall ensure contactless transactions do not exceed ₦50,000 per transaction.',
              },
            ]);
          }
          if (table === 'policy_documents') {
            return createMockQueryBuilder([{ id: 'pol-1', title: 'Sterling Policy' }]);
          }
          return createMockQueryBuilder([]);
        }),
      };
    });

    it('bootstraps tenant profile with matched circulars and 6-role baseline risk posture', async () => {
      const service = new TenantBootstrapService(mockSupabase);
      const result = await service.bootstrapTenantProfile({
        organizationId: 'test-org-456',
        licenseType: 'COMMERCIAL_BANK',
        additionalLicenses: ['SWITCHING_AND_PROCESSING'],
        paymentRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
      });

      expect(result.organizationId).toBe('test-org-456');
      expect(result.activeLicenses).toContain('COMMERCIAL_BANK');
      expect(result.activePaymentRails).toContain('NIBSS_NIP');
      expect(result.matchedCircularsCount).toBeGreaterThan(0);
      expect(result.obligationRegister.totalObligationsRegistered).toBeGreaterThan(0);

      // Verify all 6 executive roles are populated
      const roles = Object.keys(result.departmentalReadiness);
      expect(roles).toEqual(
        expect.arrayContaining(['GC', 'CCO', 'CTO', 'CFO', 'COO', 'CRO'])
      );
    });

    it('evaluates policy manual concordance when policy text is provided', async () => {
      const service = new TenantBootstrapService(mockSupabase);
      const result = await service.bootstrapTenantProfile({
        organizationId: 'test-org-456',
        licenseType: 'COMMERCIAL_BANK',
        paymentRails: [],
        policyManualTitle: 'AML/CFT Governance Policy',
        policyManualText: `1. All transactions exceeding ₦5,000,000 shall be reported to the NFIU within 7 days.
2. The bank shall verify customer identity using the National Identity Number.`,
      });

      expect(result.initialConcordance).toBeDefined();
      expect(result.initialConcordance?.assessedObligationsCount).toBeGreaterThan(0);
      expect(typeof result.initialConcordance?.overallCompliancePercentage).toBe('number');
      expect(result.initialConcordance?.overallCompliancePercentage).toBeGreaterThanOrEqual(0);
    });
  });
});
