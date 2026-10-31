import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  ObligationMetricsService,
  formatStatutoryIdentifier,
  sanitizeRequirementText,
  categorizeObligationType,
} from '@/modules/regulatory/services/obligationMetricsService';
import { FourPhaseObligation } from '@/modules/regulatory/types';

// Mock DB client
let mockDbClient: any = null;

const createChainableQuery = (data: any = null) => {
  const queryObj: any = {
    select: () => queryObj,
    eq: () => queryObj,
    in: () => queryObj,
    or: () => queryObj,
    ilike: () => queryObj,
    limit: () => queryObj,
    order: () => queryObj,
    upsert: () => queryObj,
    maybeSingle: async () => ({ data, error: null }),
    single: async () => ({ data, error: null }),
    then: (resolve: any) => resolve({ data, error: null }),
  };
  return queryObj;
};

vi.mock('@/shared/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/auth')>();
  return {
    ...actual,
    getTenantContext: vi.fn().mockImplementation(async () => ({
      organizationId: 'org-test-tenant-1',
      userId: 'usr-compliance-officer-1',
      dbClient: mockDbClient,
    })),
  };
});

// Import route handlers
import { GET as getObligationsRoute } from '@/app/api/regulatory/obligations/route';
import { GET as getMetricsRoute } from '@/app/api/regulatory/metrics/route';
import { PATCH as patchObligationRoute } from '@/app/api/regulatory/obligations/[id]/route';

describe('Step 3: 4-Phase Obligation Architecture & Core Supervisory Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: 3 Core Supervisory Metrics Calculation with Dynamic Data
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 1: Calculation of Orphan Rate, Control Concentration & Redundant Controls', () => {
    const service = new ObligationMetricsService();

    it('should accurately calculate Orphan Obligation Rate (The Gaps)', () => {
      const mockObligations: FourPhaseObligation[] = [
        {
          internalId: 'obl-1',
          phase1Source: {
            regulator: 'CBN',
            regulatorName: 'Central Bank of Nigeria',
            rulebook: 'BOFIA 2020',
            sectionReference: 'Section 57(1)',
            sectionHeading: 'Capital Adequacy',
            statutoryCitation: 'BOFIA 2020 §57(1)',
          },
          phase2Obligation: {
            humanId: 'OBL-CBN-2024-001',
            obligationType: 'GOVERNANCE_CONTROL',
            atomicRequirement: 'Maintain minimum statutory capital adequacy buffer',
            statutoryText: 'Institutions shall maintain minimum capital ratio.',
            severity: 'CRITICAL',
            penalties: [],
          },
          phase3Safeguards: {
            controlId: 'CTRL-FIN-001',
            controlName: 'Daily Capital Adequacy Monitoring',
            policyId: 'POL-TREASURY-01',
            policyName: 'Capital Management Policy',
            custodianRole: 'Chief Financial Officer',
            department: 'TREASURY_FINANCE',
          },
          phase4Health: {
            effectivenessStatus: 'EFFECTIVE',
            evidenceStatus: 'VERIFIED',
            isOrphan: false,
          },
        },
        {
          internalId: 'obl-2',
          phase1Source: {
            regulator: 'CBN',
            regulatorName: 'Central Bank of Nigeria',
            rulebook: 'AML Regulations 2022',
            sectionReference: 'Regulation 14',
            sectionHeading: 'Politically Exposed Persons',
            statutoryCitation: 'CBN AML 2022 Reg 14',
          },
          phase2Obligation: {
            humanId: 'OBL-CBN-2024-002',
            obligationType: 'MANDATORY_DISCLOSURE',
            atomicRequirement: 'Perform enhanced due diligence on all PEP onboarding requests',
            statutoryText: 'Financial institutions must apply EDD to PEPs.',
            severity: 'CRITICAL',
            penalties: [],
          },
          phase3Safeguards: {
            controlId: null, // ORPHAN
            controlName: null,
            policyId: null,
            policyName: null,
            custodianRole: 'Chief Compliance Officer',
            department: 'COMPLIANCE_LEGAL',
          },
          phase4Health: {
            effectivenessStatus: 'UNMAPPED',
            evidenceStatus: 'MISSING_EVIDENCE',
            isOrphan: true,
          },
        },
        {
          internalId: 'obl-3',
          phase1Source: {
            regulator: 'SEC',
            regulatorName: 'Securities and Exchange Commission',
            rulebook: 'Digital Asset Directives 2024',
            sectionReference: 'Rule 3',
            sectionHeading: 'Virtual Asset Custody',
            statutoryCitation: 'SEC Digital Assets 2024 Rule 3',
          },
          phase2Obligation: {
            humanId: 'OBL-SEC-2024-003',
            obligationType: 'STRICT_PROHIBITION',
            atomicRequirement: 'Strict prohibition on commingling customer custody funds',
            statutoryText: 'Custodians shall not commingle proprietary and client funds.',
            severity: 'CRITICAL',
            penalties: [],
          },
          phase3Safeguards: {
            controlId: null, // ORPHAN
            controlName: null,
            policyId: null,
            policyName: null,
            custodianRole: 'Chief Compliance Officer',
            department: 'COMPLIANCE_LEGAL',
          },
          phase4Health: {
            effectivenessStatus: 'UNMAPPED',
            evidenceStatus: 'MISSING_EVIDENCE',
            isOrphan: true,
          },
        },
        {
          internalId: 'obl-4',
          phase1Source: {
            regulator: 'NDPC',
            regulatorName: 'Nigeria Data Protection Commission',
            rulebook: 'NDPA 2023',
            sectionReference: 'Section 40',
            sectionHeading: 'Data Breach Notification',
            statutoryCitation: 'NDPA 2023 §40',
          },
          phase2Obligation: {
            humanId: 'OBL-NDPC-2024-004',
            obligationType: 'STATUTORY_TIMELINE',
            atomicRequirement: 'Notify NDPC within 72 hours of data breach awareness',
            statutoryText: 'Data controller shall notify commission within 72 hours.',
            severity: 'HIGH',
            penalties: [],
          },
          phase3Safeguards: {
            controlId: 'CTRL-IT-002',
            controlName: 'Incident Response Protocol',
            policyId: 'POL-INFOSOC-02',
            policyName: 'Data Security Policy',
            custodianRole: 'Head of IT Infrastructure',
            department: 'ENGINEERING_TECH',
          },
          phase4Health: {
            effectivenessStatus: 'EFFECTIVE',
            evidenceStatus: 'VERIFIED',
            isOrphan: false,
          },
        },
      ];

      const metrics = service.calculateSupervisoryMetrics(mockObligations);

      // Total = 4, Orphans = 2 => 50%
      expect(metrics.orphanRate.totalObligations).toBe(4);
      expect(metrics.orphanRate.orphanCount).toBe(2);
      expect(metrics.orphanRate.mappedCount).toBe(2);
      expect(metrics.orphanRate.percentage).toBe(50);
      expect(metrics.orphanRate.riskSeverityLevel).toBe('CRITICAL');
      expect(metrics.orphanRate.statutoryGrounding).toContain('BOFIA 2020 §65');
    });

    it('should compute Control Concentration (The Bottlenecks) when single control bears excessive obligations', () => {
      const mockObligations: FourPhaseObligation[] = Array.from({ length: 5 }, (_, i) => ({
        internalId: `obl-conc-${i}`,
        phase1Source: {
          regulator: 'CBN',
          regulatorName: 'Central Bank of Nigeria',
          rulebook: 'Cybersecurity Guidelines',
          sectionReference: `Section 4.${i + 1}`,
          sectionHeading: `Access Control Rule ${i + 1}`,
          statutoryCitation: `CBN Cyber 2022 §4.${i + 1}`,
        },
        phase2Obligation: {
          humanId: `OBL-CBN-2024-00${i + 1}`,
          obligationType: 'GOVERNANCE_CONTROL',
          atomicRequirement: `Enforce multi-factor authentication protocol ${i + 1}`,
          statutoryText: 'Institutions shall enforce MFA.',
          severity: 'HIGH',
          penalties: [],
        },
        phase3Safeguards: {
          // All 5 mapped to the EXACT same single control
          controlId: 'CTRL-SEC-999',
          controlName: 'Identity and Access Management Engine',
          policyId: 'POL-IAM-01',
          policyName: 'IAM SOP',
          custodianRole: 'Head of IT Infrastructure',
          department: 'ENGINEERING_TECH',
        },
        phase4Health: {
          effectivenessStatus: 'EFFECTIVE',
          evidenceStatus: 'VERIFIED',
          isOrphan: false,
        },
      }));

      const metrics = service.calculateSupervisoryMetrics(mockObligations);

      expect(metrics.controlConcentration.bottleneckCount).toBe(1);
      expect(metrics.controlConcentration.maxRatio).toBe(5);
      expect(metrics.controlConcentration.topBottlenecks).toHaveLength(1);
      expect(metrics.controlConcentration.topBottlenecks[0].controlId).toBe('CTRL-SEC-999');
      expect(metrics.controlConcentration.topBottlenecks[0].mappedObligationsCount).toBe(5);
      expect(metrics.controlConcentration.riskSummary).toContain('Single point of operational failure risk');
    });

    it('should detect Redundant Controls (The Cost-Cutters) across multiple teams', () => {
      const mockObligations: FourPhaseObligation[] = [
        {
          internalId: 'obl-red-1',
          phase1Source: {
            regulator: 'CBN',
            regulatorName: 'Central Bank of Nigeria',
            rulebook: 'AML 2022',
            sectionReference: 'Reg 12',
            sectionHeading: 'Sanctions List Batch Screening',
            statutoryCitation: 'CBN AML 2022 Reg 12',
          },
          phase2Obligation: {
            humanId: 'OBL-CBN-2024-010',
            obligationType: 'STRICT_PROHIBITION',
            atomicRequirement: 'Screen all payment beneficiaries against UN/NFIU lists',
            statutoryText: 'Institutions shall screen transactions.',
            severity: 'CRITICAL',
            penalties: [],
          },
          phase3Safeguards: {
            controlId: 'CTRL-COMP-014', // Team 1 has control
            controlName: 'Compliance Sanctions Portal Screening',
            policyId: 'POL-COMP-01',
            policyName: 'AML Policy',
            custodianRole: 'Chief Compliance Officer',
            department: 'COMPLIANCE_LEGAL',
          },
          phase4Health: {
            effectivenessStatus: 'EFFECTIVE',
            evidenceStatus: 'VERIFIED',
            isOrphan: false,
          },
        },
        {
          internalId: 'obl-red-2',
          phase1Source: {
            regulator: 'CBN',
            regulatorName: 'Central Bank of Nigeria',
            rulebook: 'AML 2022',
            sectionReference: 'Reg 12',
            sectionHeading: 'Sanctions List Batch Screening',
            statutoryCitation: 'CBN AML 2022 Reg 12', // Exact duplicate statutory citation
          },
          phase2Obligation: {
            humanId: 'OBL-CBN-2024-011',
            obligationType: 'STRICT_PROHIBITION',
            atomicRequirement: 'Screen all payment beneficiaries against UN/NFIU lists',
            statutoryText: 'Institutions shall screen transactions.',
            severity: 'CRITICAL',
            penalties: [],
          },
          phase3Safeguards: {
            controlId: 'CTRL-OPS-088', // Team 2 has duplicate tool/control
            controlName: 'Operations Third-Party Screening Subscription',
            policyId: 'POL-OPS-05',
            policyName: 'Operations Vendor Policy',
            custodianRole: 'Chief Operating Officer',
            department: 'OPERATIONS',
          },
          phase4Health: {
            effectivenessStatus: 'EFFECTIVE',
            evidenceStatus: 'VERIFIED',
            isOrphan: false,
          },
        },
      ];

      const metrics = service.calculateSupervisoryMetrics(mockObligations);

      expect(metrics.redundantControls.redundantClusterCount).toBe(1);
      expect(metrics.redundantControls.redundancyFactor).toBe(2);
      expect(metrics.redundantControls.estimatedRedundantSavingsNaira).toBe(2500000);
      expect(metrics.redundantControls.redundantPairs).toHaveLength(1);
      expect(metrics.redundantControls.redundantPairs[0].statutoryCitation).toBe('CBN AML 2022 Reg 12');
      expect(metrics.redundantControls.redundantPairs[0].coveredControls).toEqual(
        expect.arrayContaining(['CTRL-COMP-014', 'CTRL-OPS-088'])
      );
      expect(metrics.redundantControls.optimizationSummary).toContain('Consolidation yields measurable OpEx recovery');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: Formatting of Human Identifiers & Raw UUID Suppression
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 2: Human Identifier Formatting & Complete Suppression of Raw UUIDs', () => {
    it('should format human statutory identifiers in standard OBL-REG-YEAR-XXX format', () => {
      const id1 = formatStatutoryIdentifier('CBN', 2024, 1);
      expect(id1).toBe('OBL-CBN-2024-001');

      const id2 = formatStatutoryIdentifier('SEC', 2023, 14);
      expect(id2).toBe('OBL-SEC-2023-014');

      const id3 = formatStatutoryIdentifier('NDPC', 2024, '42');
      expect(id3).toBe('OBL-NDPC-2024-042');
    });

    it('should convert raw database UUID into human-readable deterministic identifier', () => {
      const rawUuid = '3ad396c2-c3a1-46cc-985e-92f11605df45';
      const formatted = formatStatutoryIdentifier('CBN', 2024, rawUuid);

      // Must follow statutory format
      expect(formatted).toMatch(/^OBL-CBN-2024-\d{3}$/);
      // Must NOT contain the raw UUID
      expect(formatted).not.toContain(rawUuid);
      expect(formatted).not.toContain('3ad396c2');
      // Deterministic: same raw UUID produces exact same human ID
      expect(formatStatutoryIdentifier('CBN', 2024, rawUuid)).toBe(formatted);
    });

    it('should sanitize scraper portal garbage, search code, and language artifacts', () => {
      const scrapedGarbage =
        '40) ? true : false"> SEARCH English | Deutsch | Hausa | Section 1.0 : Directives on Foreign Exchange Remittance';
      const cleaned = sanitizeRequirementText(scrapedGarbage);

      expect(cleaned).not.toContain('40) ? true');
      expect(cleaned).not.toContain('SEARCH');
      expect(cleaned).not.toContain('Deutsch');
      expect(cleaned).not.toContain('Hausa');
      expect(cleaned).not.toContain('Section 1.0 :');
      expect(cleaned).toContain('Directives on Foreign Exchange Remittance');
    });

    it('should categorize raw obligation types into standard 4-phase categories', () => {
      expect(categorizeObligationType('STRICT_PROHIBITION')).toBe('STRICT_PROHIBITION');
      expect(categorizeObligationType('MANDATORY_DISCLOSURE')).toBe('MANDATORY_DISCLOSURE');
      expect(categorizeObligationType('STATUTORY_TIMELINE')).toBe('STATUTORY_TIMELINE');
      expect(categorizeObligationType('CONDITIONAL_PERMISSION')).toBe('CONDITIONAL_PERMISSION');
      expect(categorizeObligationType('RISK_BASED')).toBe('GOVERNANCE_CONTROL');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: API Route Endpoints GET /api/regulatory/obligations & /metrics
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 3: Endpoints GET /api/regulatory/obligations and GET /api/regulatory/metrics', () => {
    it('should return 4-phase enriched obligations via GET /api/regulatory/obligations', async () => {
      // Mock DB responses for clauses, obligations, penalties, and tenant controls
      const mockClauses = [
        {
          id: 'clause-uuid-1',
          document_version_id: 'ver-uuid-1',
          section_reference: 'Section 12.1',
          section_heading: 'Customer Identification and KYC',
          clause_text: 'Banks must verify customer identity prior to opening account.',
          page_number: 4,
          regulatory_document_versions: {
            id: 'ver-uuid-1',
            version_number: '1.0',
            regulatory_instruments: {
              id: 'inst-uuid-1',
              short_title: 'CBN AML Regulations',
              official_citation: 'CBN AML 2022',
              regulatory_domain: 'AML_CFT',
              jurisdiction: 'NG',
              regulatory_bodies: {
                code: 'CBN',
                name: 'Central Bank of Nigeria',
              },
            },
          },
        },
      ];

      const mockDbObligations = [
        {
          id: 'obl-db-uuid-1234',
          clause_id: 'clause-uuid-1',
          obligation_type: 'MANDATORY_DISCLOSURE',
          summary: 'Verify verified national identification number for tier 3 accounts',
          severity_floor: 'HIGH',
          statutory_timeline_days: 1,
          deadline_text: '24 Hours',
          verbatim_quote: 'Banks must verify customer identity.',
        },
      ];

      mockDbClient = {
        from: (table: string) => {
          if (table === 'regulatory_clauses') return createChainableQuery(mockClauses);
          if (table === 'regulatory_obligations') return createChainableQuery(mockDbObligations);
          if (table === 'statutory_penalties') return createChainableQuery([]);
          if (table === 'tenant_obligation_controls') {
            return createChainableQuery([
              {
                obligation_id: 'obl-db-uuid-1234',
                control_id: 'CTRL-KYC-001',
                control_name: 'NIN Automated Verification Engine',
                policy_id: 'POL-KYC-2024',
                policy_name: 'Enterprise KYC SOP',
                custodian_role: 'Chief Compliance Officer',
                department: 'COMPLIANCE_LEGAL',
                effectiveness_status: 'EFFECTIVE',
                evidence_status: 'VERIFIED',
                evidence_artifact_name: 'KYC_AUDIT_LOG.csv',
              },
            ]);
          }
          return createChainableQuery(null);
        },
      };

      const req = new NextRequest('http://localhost:3000/api/regulatory/obligations?page=1&limit=10');
      const res = await getObligationsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);

      const obl = json.data[0];
      // Assert 4-Phase properties are present
      expect(obl.phase1Source).toBeDefined();
      expect(obl.phase1Source.regulator).toBe('CBN');
      expect(obl.phase1Source.sectionReference).toBe('Section 12.1');

      expect(obl.phase2Obligation).toBeDefined();
      expect(obl.phase2Obligation.humanId).toMatch(/^OBL-CBN-2024-\d{3}$/);
      // Verify raw database UUID is suppressed from display identifier
      expect(obl.phase2Obligation.humanId).not.toBe('obl-db-uuid-1234');

      expect(obl.phase3Safeguards).toBeDefined();
      expect(obl.phase3Safeguards.controlId).toBe('CTRL-KYC-001');
      expect(obl.phase3Safeguards.custodianRole).toBe('Chief Compliance Officer');

      expect(obl.phase4Health).toBeDefined();
      expect(obl.phase4Health.effectivenessStatus).toBe('EFFECTIVE');
      expect(obl.phase4Health.isOrphan).toBe(false);

      // Verify metrics strip payload included
      expect(json.metrics).toBeDefined();
      expect(json.metrics.orphanRate).toBeDefined();
    });

    it('should return real-time metrics via GET /api/regulatory/metrics', async () => {
      const mockClauses = [
        {
          id: 'c1',
          document_version_id: 'v1',
          section_reference: 'Sec 1',
          section_heading: 'Mandate',
          clause_text: 'Text',
          regulatory_document_versions: {
            id: 'v1',
            regulatory_instruments: {
              short_title: 'BOFIA',
              regulatory_bodies: { code: 'CBN', name: 'Central Bank' },
            },
          },
        },
      ];

      const mockDbObligations = [
        {
          id: 'o1',
          clause_id: 'c1',
          obligation_type: 'GOVERNANCE_CONTROL',
          summary: 'Rule summary',
          severity_floor: 'HIGH',
        },
      ];

      mockDbClient = {
        from: (table: string) => {
          if (table === 'regulatory_clauses') return createChainableQuery(mockClauses);
          if (table === 'regulatory_obligations') return createChainableQuery(mockDbObligations);
          if (table === 'statutory_penalties') return createChainableQuery([]);
          if (table === 'tenant_obligation_controls') return createChainableQuery([]); // No controls = orphan
          return createChainableQuery(null);
        },
      };

      const req = new NextRequest('http://localhost:3000/api/regulatory/metrics');
      const res = await getMetricsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.orphanRate.orphanCount).toBe(1);
      expect(json.data.orphanRate.percentage).toBe(100);
      expect(json.data.controlConcentration).toBeDefined();
      expect(json.data.redundantControls).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: Horizon Circular Cross-Referencing & State Updates
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 4: Horizon Circular Cross-Referencing & Control Mapping Updates', () => {
    it('should filter obligations by circular reference when circularId is queried', async () => {
      const mockCircular = {
        id: 'circ-cbn-2024-001',
        document_version_id: 'doc-ver-target-77',
        circular_number: 'CBN/BSD/DIR/CON/01/014',
      };

      const mockClauses = [
        {
          id: 'clause-circ-1',
          document_version_id: 'doc-ver-target-77',
          section_reference: 'Section 2.0',
          section_heading: 'Customer Onboarding Directives',
          clause_text: 'Institutions shall verify accounts.',
          regulatory_document_versions: {
            id: 'doc-ver-target-77',
            regulatory_instruments: {
              short_title: 'Customer Onboarding Circular',
              regulatory_bodies: { code: 'CBN', name: 'Central Bank of Nigeria' },
            },
          },
        },
      ];

      const mockObligations = [
        {
          id: 'obl-circ-1',
          clause_id: 'clause-circ-1',
          obligation_type: 'MANDATORY_DISCLOSURE',
          summary: 'Customer identification protocol',
          severity_floor: 'HIGH',
        },
      ];

      mockDbClient = {
        from: (table: string) => {
          if (table === 'radar_circulars') return createChainableQuery(mockCircular);
          if (table === 'regulatory_clauses') return createChainableQuery(mockClauses);
          if (table === 'regulatory_obligations') return createChainableQuery(mockObligations);
          if (table === 'statutory_penalties') return createChainableQuery([]);
          if (table === 'tenant_obligation_controls') return createChainableQuery([]);
          return createChainableQuery(null);
        },
      };

      const req = new NextRequest(
        'http://localhost:3000/api/regulatory/obligations?circularId=circ-cbn-2024-001'
      );
      const res = await getObligationsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].phase1Source.documentVersionId).toBe('doc-ver-target-77');
      expect(json.data[0].phase1Source.circularId).toBe('circ-cbn-2024-001');
    });

    it('should update control mapping via PATCH /api/regulatory/obligations/[id]', async () => {
      let savedPayload: any = null;

      mockDbClient = {
        from: (table: string) => {
          if (table === 'tenant_obligation_controls') {
            const queryObj: any = {
              upsert: (payload: any) => {
                savedPayload = payload;
                return queryObj;
              },
              select: () => queryObj,
              single: async () => ({
                data: { id: 'ctrl-mapping-uuid', ...savedPayload },
                error: null,
              }),
            };
            return queryObj;
          }
          return createChainableQuery(null);
        },
      };

      const req = new NextRequest('http://localhost:3000/api/regulatory/obligations/obl-target-88', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlId: 'CTRL-IT-884',
          controlName: 'Automated Account Off-ramping Engine',
          policyId: 'POL-ENG-04',
          policyName: 'API Credential Policy',
          custodianRole: 'Head of IT Infrastructure',
          department: 'ENGINEERING_TECH',
          effectivenessStatus: 'EFFECTIVE',
          evidenceStatus: 'VERIFIED',
          evidenceArtifactName: 'DECOMMISSION_LOG_v1.pdf',
        }),
      });

      const res = await patchObligationRoute(req, {
        params: Promise.resolve({ id: 'obl-target-88' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.control_id).toBe('CTRL-IT-884');
      expect(json.data.custodian_role).toBe('Head of IT Infrastructure');
      expect(json.data.effectiveness_status).toBe('EFFECTIVE');
    });
  });
});
