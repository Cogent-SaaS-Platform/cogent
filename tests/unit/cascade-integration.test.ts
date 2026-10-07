import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CascadeTriggerService } from '@/modules/radar/services/cascadeTriggerService';
import { MarketingCascadeListener } from '@/modules/marketing-shield/services/marketingCascadeListener';
import { ExecutiveOverviewService } from '@/modules/executive/services/executiveOverviewService';
import { AuditService } from '@/modules/audit/auditService';

describe('Phase 4: The Connected Compliance Cascade Integration Tests', () => {
  const testOrgId = '00000000-0000-0000-0000-000000000001';
  const testCircularId = 'b20fb350-262a-409c-a7bc-9807604da6ec';

  const defaultMockDbClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  } as any;

  // ============================================================================
  // 4.1 Upstream Circular -> Trigger Downstream Gap Re-evaluation
  // ============================================================================
  describe('4.1 Upstream Circular -> Trigger Downstream Gap Re-evaluation', () => {
    it('accurately extracts affected regulatory domains and keywords from circular text', () => {
      const service = new CascadeTriggerService({ dbClient: defaultMockDbClient });

      // Test AML/CFT circular
      const amlExtraction = service.extractAffectedDomains({
        subject: 'CBN Anti-Money Laundering and Combating the Financing of Terrorism Guidelines 2026',
        summary: 'Directs all financial institutions to implement automated PEP screening and 72-hour STR reporting to NFIU.',
        raw_text: 'Section 4 requires immediate reporting of suspicious transactions under Money Laundering Prohibition Act.',
      });

      expect(amlExtraction.domains).toContain('AML_CFT');
      expect(amlExtraction.topicTags).toContain('Anti-Money Laundering');
      expect(amlExtraction.keywords.some((k) => k.includes('AML') || k.includes('KYC'))).toBe(true);

      // Test Payments & Rails circular
      const paymentsExtraction = service.extractAffectedDomains({
        subject: 'Operational Directive on Contactless Payments and POS Interchange Limits',
        summary: 'Sets limits of N50,000 per transaction and enforces biometric 2FA validation.',
      });

      expect(paymentsExtraction.domains).toContain('PAYMENTS_SETTLEMENT');
      expect(paymentsExtraction.topicTags).toContain('Payment Rails & Settlement');

      // Test Consumer Protection & APR circular
      const consumerExtraction = service.extractAffectedDomains({
        subject: 'FCCPC and CBN Joint Framework on Digital Lending and APR Disclosure',
        summary: 'Prohibits hidden charges and mandates total cost of credit transparency for nano-loans.',
      });

      expect(consumerExtraction.domains).toContain('CONSUMER_PROTECTION');
      expect(consumerExtraction.keywords).toContain('APR Disclosures');
    });

    it('triggers downstream gap re-evaluations and commits audit logs', async () => {
      const mockAuditService = {
        recordLog: vi.fn().mockResolvedValue({ id: 'mock-audit-uuid-101' }),
      } as unknown as AuditService;

      const mockDbClient = {
        from: vi.fn((table: string) => {
          if (table === 'radar_circulars') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: testCircularId,
                  circular_number: 'PSM/DIR/CON/CWS/08/014',
                  subject: 'Directive on Contactless Payment Limits & 2FA Enforcement',
                  summary: 'Mandates biometric 2FA for interbank transactions > N1M',
                  raw_text: 'Contactless payment rules and settlement operations',
                  document_version_id: 'doc-ver-123',
                },
              }),
            };
          }
          if (table === 'policy_documents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: '59442f9b-f494-420e-9ce4-2b10aad06cdb',
                    organization_id: testOrgId,
                    title: 'Apex Commercial Bank AML/CFT Operational Manual',
                    department: 'COMPLIANCE_LEGAL',
                    raw_text: 'Internal policy on compliance, reporting, and operations.',
                  },
                ],
              }),
            };
          }
          if (table === 'gap_evaluations' || table === 'radar_notifications' || table === 'notifications') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          };
        }),
      } as any;

      const service = new CascadeTriggerService({
        dbClient: mockDbClient,
        auditService: mockAuditService,
      });

      const result = await service.triggerGapReEvaluation({
        circularId: testCircularId,
        organizationId: testOrgId,
      });

      expect(result.success).toBe(true);
      expect(result.circularNumber).toBe('PSM/DIR/CON/CWS/08/014');
      expect(result.impactedPoliciesCount).toBeGreaterThanOrEqual(1);

      const triggeredItem = result.triggeredEvaluations[0];
      expect(triggeredItem).toBeDefined();
      expect(triggeredItem.status).toBe('TRIGGERED_BY_CASCADE');
      expect(triggeredItem.policyTitle).toContain('AML/CFT');
      expect(triggeredItem.auditId).toBe('mock-audit-uuid-101');

      // Verify AuditService was called with CASCADE_GAP_RE_EVALUATION_TRIGGERED
      expect(mockAuditService.recordLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CASCADE_GAP_RE_EVALUATION_TRIGGERED',
          entityType: 'gap_evaluations',
          organizationId: testOrgId,
        })
      );
    });
  });

  // ============================================================================
  // 4.2 Upstream Circular -> Trigger Downstream Marketing Drift Check
  // ============================================================================
  describe('4.2 Upstream Circular -> Trigger Downstream Marketing Drift Check', () => {
    it('correctly assesses whether an upstream circular impacts marketing copy', () => {
      const listener = new MarketingCascadeListener({ dbClient: defaultMockDbClient });

      const adCircular = listener.isMarketingImpacted({
        subject: 'ARCON Code of Advertising Practice 2026: Mandatory Commercial Vetting',
        summary: 'All financial promotions on social media and digital channels require ASP approval.',
      });
      expect(adCircular.impacted).toBe(true);
      expect(adCircular.rationale).toContain('advertising');

      const aprCircular = listener.isMarketingImpacted({
        subject: 'FCCPC Regulations on APR Transparency in Digital Consumer Lending',
        summary: 'Zero interest marketing promises without APR schedule are strictly prohibited.',
      });
      expect(aprCircular.impacted).toBe(true);
      expect(aprCircular.prohibitedTerms).toContain('zero interest');

      const nonMarketingCircular = listener.isMarketingImpacted({
        subject: 'NIBSS Clearing House Settlement Protocol Timing Update',
        summary: 'Technical adjustments to automated interbank clearing batch windows.',
      });
      expect(nonMarketingCircular.impacted).toBe(false);
    });

    it('mutates invalidated campaigns to NEEDS_RE_REVIEW, flags claims, and attaches deterministic penalty', async () => {
      const mockAuditService = {
        recordLog: vi.fn().mockResolvedValue({ id: 'mock-audit-uuid-202' }),
      } as unknown as AuditService;

      const mockDbClient = {
        from: vi.fn((table: string) => {
          if (table === 'radar_circulars') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: testCircularId,
                  circular_number: 'ARCON/DIR/2026/08',
                  subject: 'Directive on Vetting of Digital Nano-Loan Advertisements',
                  summary: 'Strict ban on zero interest and misleading loan advertisements.',
                  raw_text: 'Zero interest promises are prohibited without all-in APR.',
                },
              }),
            };
          }
          if (table === 'marketing_scans') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'scan-uuid-1',
                    campaign_name: 'Flash Nano Loan Campaign',
                    channel: 'SMS_BLAST',
                    raw_copy: 'Urgent cash alert! Get loan with zero interest and guaranteed approval in 5 mins!',
                    approval_status: 'APPROVED_BY_CCO',
                    verdict: 'BLOCKING_ISSUE',
                    deterministic_penalty_naira: 3000000,
                  },
                ],
              }),
              update: vi.fn().mockReturnThis(),
            };
          }
          if (table === 'tenant_claims_ledger') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              update: vi.fn().mockReturnThis(),
            };
          }
          if (table === 'marketing_live_assets' || table === 'radar_notifications' || table === 'notifications') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              update: vi.fn().mockReturnThis(),
              insert: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          };
        }),
      } as any;

      const listener = new MarketingCascadeListener({
        dbClient: mockDbClient,
        auditService: mockAuditService,
      });

      const result = await listener.checkMarketingDrift({
        circularId: testCircularId,
        organizationId: testOrgId,
        simulate: false,
      });

      expect(result.success).toBe(true);
      expect(result.isMarketingImpacted).toBe(true);
      expect(result.invalidatedCampaignsCount).toBeGreaterThanOrEqual(1);
      expect(result.totalStatutoryFineExposureNaira).toBeGreaterThanOrEqual(1000000);

      const invalidated = result.invalidatedCampaigns[0];
      expect(invalidated.newApprovalStatus).toBe('NEEDS_RE_REVIEW');
      expect(invalidated.stateReason).toContain('Circular ARCON/DIR/2026/08');
      expect(invalidated.flaggedPhrases).toContain('zero interest');
      expect(invalidated.deterministicPenaltyNaira).toBeGreaterThanOrEqual(1000000);

      // Verify AuditService was called
      expect(mockAuditService.recordLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CASCADE_MARKETING_DRIFT_DETECTED',
          entityType: 'marketing_scans',
        })
      );
    });

    it('respects simulationMode without mutating active records', async () => {
      const listener = new MarketingCascadeListener({ dbClient: defaultMockDbClient });
      const result = await listener.checkMarketingDrift({
        circularId: testCircularId,
        organizationId: testOrgId,
        simulate: true,
      });

      expect(result.success).toBe(true);
      expect(result.simulationMode).toBe(true);
      expect(result.checkedAt).toBeDefined();
    });
  });

  // ============================================================================
  // 4.3 Unified Executive Command Center
  // ============================================================================
  describe('4.3 Unified Executive Command Center Telemetry & Export', () => {
    const executiveService = new ExecutiveOverviewService({ dbClient: defaultMockDbClient });

    it('calculates the composite institutional health score and determines canonical health grade', async () => {
      const overview = await executiveService.getExecutiveOverview(testOrgId);

      expect(overview.compositeHealthScore).toBeGreaterThanOrEqual(60);
      expect(overview.compositeHealthScore).toBeLessThanOrEqual(100);

      // Verify weighted 30% Marketing + 35% Radar + 35% Gap Matrix calculation
      const calculated = Math.round(
        overview.pillars.marketing.healthPercentage * 0.3 +
        overview.pillars.radar.healthPercentage * 0.35 +
        overview.pillars.gapMatrix.healthPercentage * 0.35
      );
      expect(overview.compositeHealthScore).toBe(calculated);

      // Verify health grade classification
      if (overview.compositeHealthScore >= 90) {
        expect(overview.healthGrade).toBe('EXEMPLARY');
      } else if (overview.compositeHealthScore >= 75) {
        expect(overview.healthGrade).toBe('SATISFACTORY');
      } else if (overview.compositeHealthScore >= 60) {
        expect(overview.healthGrade).toBe('SUPERVISORY_CONCERN');
      } else {
        expect(overview.healthGrade).toBe('CRITICAL_INTERVENTION');
      }
    });

    it('aggregates multi-pillar live telemetry across Marketing, Radar, and Gap Matrix', async () => {
      const overview = await executiveService.getExecutiveOverview(testOrgId);

      expect(overview.liveTelemetry).toBeDefined();
      const telemetry = overview.liveTelemetry!;

      expect(telemetry.marketing.totalScans).toBeGreaterThan(0);
      expect(telemetry.marketing.approvalRate).toBeGreaterThanOrEqual(0);
      expect(telemetry.marketing.avoidedFineNaira).toBeGreaterThan(0);

      expect(telemetry.radar.activeCirculars).toBeGreaterThan(0);
      expect(telemetry.radar.avoidedFineNaira).toBeGreaterThan(0);

      expect(telemetry.gapMatrix.activePolicies).toBeGreaterThan(0);
      expect(telemetry.gapMatrix.concordancePercentage).toBeGreaterThan(0);
      expect(telemetry.gapMatrix.avoidedFineNaira).toBeGreaterThan(0);

      // Sum of pillar avoided fines equals totalFinesAvoidedNaira
      const totalAvoided =
        overview.pillars.marketing.fineExposureAvoidedNaira +
        overview.pillars.radar.fineExposureAvoidedNaira +
        overview.pillars.gapMatrix.fineExposureAvoidedNaira;
      expect(overview.totalFinesAvoidedNaira).toBe(totalAvoided);
    });

    it('monitors all 6 canonical Nigerian regulatory authorities', async () => {
      const overview = await executiveService.getExecutiveOverview(testOrgId);
      const regulators = overview.regulatorCoverage.map((r) => r.regulatorCode);

      expect(regulators).toContain('CBN');
      expect(regulators).toContain('SEC');
      expect(regulators).toContain('NDPC');
      expect(regulators).toContain('FCCPC');
      expect(regulators).toContain('NFIU');
      expect(regulators).toContain('ARCON');
    });

    it('orders urgent compliance countdown gates chronologically', async () => {
      const overview = await executiveService.getExecutiveOverview(testOrgId);
      const gates = overview.urgentGates;

      for (let i = 0; i < gates.length - 1; i++) {
        expect(gates[i].daysRemaining).toBeLessThanOrEqual(gates[i + 1].daysRemaining);
      }
    });

    it('generates a Board Audit & Executive Brief Dossier export with SHA-256 seal and attestation', async () => {
      const exportResult = await executiveService.generateExecutiveComplianceExport(
        testOrgId,
        'Apex Commercial Bank PLC'
      );

      expect(exportResult).toBeDefined();
      expect(exportResult.organizationName).toBe('Apex Commercial Bank PLC');
      expect(exportResult.compositeHealthScore).toBeGreaterThan(0);
      expect(exportResult.totalFinesAvoidedNaira).toBeGreaterThan(0);

      // Verify cryptographic SHA-256 seal format
      expect(exportResult.sha256Seal).toMatch(/^[a-f0-9]{64}$/i);

      // Verify Markdown briefing content
      expect(exportResult.markdownBrief).toContain('EXECUTIVE REGULATORY COMPLIANCE BRIEFING');
      expect(exportResult.markdownBrief).toContain('Apex Commercial Bank PLC');
      expect(exportResult.markdownBrief).toContain('Pillar 1 (Marketing Shield)');
      expect(exportResult.markdownBrief).toContain('Pillar 2 (Regulatory Radar)');
      expect(exportResult.markdownBrief).toContain('Pillar 3 (5-W Gap Matrix)');
      expect(exportResult.markdownBrief).toContain(exportResult.sha256Seal);

      // Verify Printable HTML content
      expect(exportResult.printableHtml).toContain('<!DOCTYPE html>');
      expect(exportResult.printableHtml).toContain('EXECUTIVE REGULATORY COMPLIANCE DOSSIER');
      expect(exportResult.printableHtml).toContain(exportResult.sha256Seal);

      // Verify Board Audit Committee Attestation Block
      expect(exportResult.boardAttestationBlock).toBeDefined();
      expect(exportResult.boardAttestationBlock.signoffStatus).toBe('VERIFIED_AND_SEALED');
      expect(exportResult.boardAttestationBlock.cryptographicVerificationSeal).toBe(
        exportResult.sha256Seal
      );
    });
  });
});
