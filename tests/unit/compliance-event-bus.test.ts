import { describe, it, expect, vi } from 'vitest';
import { ComplianceEventBus } from '@/modules/shared/events/complianceEventBus';
import { ExecutiveTelemetryService } from '@/modules/executive/services/executiveTelemetryService';
import { AuditService } from '@/modules/audit/auditService';

describe('Phase 4: ComplianceEventBus & ExecutiveTelemetryService Unit Tests', () => {
  const testOrgId = '00000000-0000-0000-0000-000000000001';
  const testCircularId = 'b20fb350-262a-409c-a7bc-9807604da6ec';

  const createMockDbClient = () => {
    return {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({
          data: table === 'radar_circulars' ? {
            id: testCircularId,
            circular_number: 'CBN/DIR/2026/01',
            subject: 'Directive on Capital Adequacy and Risk Hedging',
            summary: 'Mandates commercial banks to maintain 15% CAR buffer.',
            raw_text: 'Commercial banks must maintain capital adequacy ratio of 15%.',
          } : null,
          error: null,
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
      })),
    } as any;
  };

  describe('ComplianceEventBus Cryptographic Ledgering', () => {
    it('computes deterministic SHA-256 hop hashes with chaining', () => {
      const hash1 = ComplianceEventBus.computeHopHash({
        organizationId: testOrgId,
        circularId: testCircularId,
        hopNumber: 1,
        sourcePillar: 'PILLAR_2_RADAR',
        targetPillar: 'PILLAR_3_GAP_MATRIX',
        eventType: 'GAP_RE_EVALUATION_TRIGGERED',
        entityType: 'gap_evaluations',
        entityId: 'eval-uuid-1',
        details: { impactedCount: 2 },
        previousEventHash: null,
      });

      expect(hash1).toMatch(/^[a-f0-9]{64}$/);

      const hash2 = ComplianceEventBus.computeHopHash({
        organizationId: testOrgId,
        circularId: testCircularId,
        hopNumber: 2,
        sourcePillar: 'PILLAR_2_RADAR',
        targetPillar: 'PILLAR_1_MARKETING_SHIELD',
        eventType: 'MARKETING_DRIFT_INVALIDATED',
        entityType: 'marketing_scans',
        entityId: 'scan-uuid-1',
        details: { invalidatedCount: 1 },
        previousEventHash: hash1,
      });

      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).not.toBe(hash1);
    });

    it('records cascade hops and notifies registered listeners', async () => {
      const mockDb = createMockDbClient();
      const mockAuditService = {
        recordLog: vi.fn().mockResolvedValue({ id: 'audit-log-uuid-1' }),
      } as unknown as AuditService;

      const bus = new ComplianceEventBus({
        dbClient: mockDb,
        auditService: mockAuditService,
      });

      const listenerFn = vi.fn();
      const unsubscribe = bus.subscribe('GAP_RE_EVALUATION_TRIGGERED', listenerFn);

      const hop = await bus.recordCascadeHop({
        organizationId: testOrgId,
        circularId: testCircularId,
        hopNumber: 1,
        sourcePillar: 'PILLAR_2_RADAR',
        targetPillar: 'PILLAR_3_GAP_MATRIX',
        eventType: 'GAP_RE_EVALUATION_TRIGGERED',
        entityType: 'gap_evaluations',
        entityId: 'eval-uuid-1',
        details: { policyTitle: 'AML Manual 2026' },
      });

      expect(hop).toBeDefined();
      expect(hop.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hop.status).toBe('COMPLETED');
      expect(listenerFn).toHaveBeenCalledWith(hop);

      unsubscribe();
    });

    it('executes full autonomous 3-pillar cascade loop', async () => {
      const mockDb = createMockDbClient();
      const mockAuditService = {
        recordLog: vi.fn().mockResolvedValue({ id: 'audit-log-uuid-2' }),
      } as unknown as AuditService;

      const bus = new ComplianceEventBus({
        dbClient: mockDb,
        auditService: mockAuditService,
      });

      const result = await bus.executeAutonomousCascade({
        circularId: testCircularId,
        organizationId: testOrgId,
      });

      expect(result.success).toBe(true);
      expect(result.hops.length).toBe(4); // Hop 0, 1, 2, 3
      expect(result.hops[0].eventType).toBe('CIRCULAR_RATIFIED');
      expect(result.hops[1].eventType).toBe('GAP_RE_EVALUATION_TRIGGERED');
      expect(result.hops[2].eventType).toBe('MARKETING_DRIFT_INVALIDATED');
      expect(result.hops[3].eventType).toBe('RISK_POSTURE_UPDATED');
      expect(result.cryptographicRootHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('ExecutiveTelemetryService Live Aggregation', () => {
    it('aggregates live telemetry across Marketing, Radar, and Gap Matrix', async () => {
      const mockDb = createMockDbClient();
      const service = new ExecutiveTelemetryService({ dbClient: mockDb });

      const telemetry = await service.getCrossPillarTelemetry(testOrgId);

      expect(telemetry).toBeDefined();
      expect(telemetry.marketingShield).toBeDefined();
      expect(telemetry.regulatoryRadar).toBeDefined();
      expect(telemetry.policyGapMatrix).toBeDefined();
      expect(telemetry.compositeHealthScore).toBeGreaterThanOrEqual(0);
      expect(telemetry.compositeHealthScore).toBeLessThanOrEqual(100);
      expect(telemetry.lastTelemetrySync).toBeDefined();
    });
  });
});
