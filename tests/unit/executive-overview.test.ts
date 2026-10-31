import { describe, it, expect, beforeAll } from 'vitest';
import { ExecutiveOverviewService } from '@/modules/executive/services/executiveOverviewService';
import { PlatformPillar } from '@/shared/types';
import { createAdminClient } from '@/shared/db';
import type { ExecutiveOverviewData } from '@/modules/executive/types';

describe('Epic 19: Unified Executive Dashboard & Overview (Task 19.1)', () => {
  const service = new ExecutiveOverviewService({ dbClient: createAdminClient() });
  let overview: ExecutiveOverviewData;

  beforeAll(async () => {
    overview = await service.getExecutiveOverview(
      '00000000-0000-0000-0000-000000000001',
      'Apex Paystack FinTech Ltd'
    );
  }, 120000);

  it('generates a complete multi-pillar executive overview data payload', () => {
    expect(overview).toBeDefined();
    expect(overview.organizationId).toBe('00000000-0000-0000-0000-000000000001');
    expect(overview.organizationName).toBe('Apex Paystack FinTech Ltd');
    expect(overview.generatedAt).toBeDefined();
    expect(overview.activeSanctionsRiskCount).toBeGreaterThanOrEqual(0);
  });

  it('correctly calculates the composite institutional compliance health score', () => {
    const marketing = overview.pillars.marketing;
    const radar = overview.pillars.radar;
    const gap = overview.pillars.gapMatrix;

    expect(marketing).toBeDefined();
    expect(radar).toBeDefined();
    expect(gap).toBeDefined();

    // Verify 30% Marketing + 35% Radar + 35% Gap Matrix formula
    const expectedScore = Math.round(
      marketing.healthPercentage * 0.3 +
      radar.healthPercentage * 0.35 +
      gap.healthPercentage * 0.35
    );

    expect(overview.compositeHealthScore).toBe(expectedScore);
    expect(overview.compositeHealthScore).toBeGreaterThanOrEqual(80);
    expect(overview.compositeHealthScore).toBeLessThanOrEqual(100);
  });

  it('aggregates total statutory fine exposure avoided across all 3 pillars', () => {
    const sumPillarFines =
      overview.pillars.marketing.fineExposureAvoidedNaira +
      overview.pillars.radar.fineExposureAvoidedNaira +
      overview.pillars.gapMatrix.fineExposureAvoidedNaira;

    expect(overview.totalFinesAvoidedNaira).toBe(sumPillarFines);
    expect(overview.totalFinesAvoidedNaira).toBeGreaterThanOrEqual(0);
  });

  it('monitors all 7 canonical Nigerian regulatory authorities', () => {
    const regulators = overview.regulatorCoverage;

    expect(regulators.length).toBe(7);
    const codes = regulators.map((r) => r.regulatorCode);
    expect(codes).toContain('CBN');
    expect(codes).toContain('SEC');
    expect(codes).toContain('NDPC');
    expect(codes).toContain('FCCPC');
    expect(codes).toContain('ARCON');
    expect(codes).toContain('NFIU');
    expect(codes).toContain('NDIC');

    regulators.forEach((reg) => {
      expect(reg.complianceRate).toBeGreaterThan(0);
      expect(reg.activeInstrumentsCount).toBeGreaterThan(0);
      expect(reg.keyStatute).toBeDefined();
    });
  });

  it('aggregates risk and open obligations across FinTech operating departments', () => {
    const departments = overview.departmentalReadiness;

    expect(departments.length).toBeGreaterThanOrEqual(5);
    const deptCodes = departments.map((d) => d.department);
    expect(deptCodes).toContain('COMPLIANCE_LEGAL');
    expect(deptCodes).toContain('OPERATIONS');
    expect(deptCodes).toContain('ENGINEERING_TECH');
    expect(deptCodes).toContain('TREASURY_FINANCE');
    expect(deptCodes).toContain('GROWTH_MARKETING');

    departments.forEach((dept) => {
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(dept.overallRisk);
      expect(dept.leadRole).toBeDefined();
    });
  });

  it('sorts urgent compliance gates chronologically and anchors to current future dates', () => {
    const gates = overview.urgentGates;

    expect(gates.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < gates.length - 1; i++) {
      expect(gates[i].daysRemaining).toBeLessThanOrEqual(gates[i + 1].daysRemaining);
    }

    const todayIso = new Date().toISOString().split('T')[0];
    gates.forEach((gate) => {
      expect(gate.sourcePillar).toBeDefined();
      expect(['marketing', 'radar', 'gap-matrix']).toContain(gate.sourcePillar);
      expect(gate.actionRequired).toBeDefined();
      expect(gate.deadlineDate).toBeDefined();
      // Ensure deadline is not in the past or static dummy date
      expect(gate.deadlineDate >= todayIso || gate.daysRemaining > 0).toBe(true);
    });
  });

  it('dynamically computes and returns regulatory trending topics', () => {
    const topics = overview.trendingTopics;

    expect(topics).toBeDefined();
    expect(topics!.length).toBeGreaterThanOrEqual(4);

    topics!.forEach((topic) => {
      expect(topic.name).toBeDefined();
      expect(topic.count).toBeGreaterThan(0);
      expect(topic.max).toBeGreaterThanOrEqual(topic.count);
      expect(['UP', 'DOWN', 'STABLE']).toContain(topic.trend);
      expect(topic.trendValue).toBeDefined();
    });

    const topicNames = topics!.map((t) => t.name);
    expect(topicNames.some((n) => n.includes('AML') || n.includes('Consumer') || n.includes('Data') || n.includes('Cyber'))).toBe(true);
  });

  it('dynamically computes and returns most impacted policies', () => {
    const policies = overview.impactedPolicies;

    expect(policies).toBeDefined();
    expect(policies!.length).toBeGreaterThanOrEqual(3);

    policies!.forEach((pol) => {
      expect(pol.id).toBeDefined();
      expect(pol.name).toBeDefined();
      expect(pol.regulators).toBeInstanceOf(Array);
      expect(pol.regulators.length).toBeGreaterThan(0);
      expect(pol.alertCount).toBeGreaterThan(0);
      expect(pol.ownerInitials).toBeDefined();
      expect(pol.ownerInitials.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('provides a unified cross-pillar activity and cryptographic audit feed', () => {
    const feed = overview.recentActivities;

    expect(feed.length).toBeGreaterThanOrEqual(3);
    const pillarsInFeed = new Set(feed.map((f) => f.sourcePillar));
    expect(pillarsInFeed.has('marketing')).toBe(true);
    expect(pillarsInFeed.has('radar')).toBe(true);
    expect(pillarsInFeed.has('gap-matrix')).toBe(true);

    feed.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.action).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.timestamp).toBeDefined();
      expect(item.sha256VerificationHash).toBeDefined();
    });
  });
});
