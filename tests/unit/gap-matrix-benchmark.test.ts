import { describe, it, expect } from 'vitest';
import {
  StatutoryBenchmarkService,
  defaultStatutoryBenchmarkService,
} from '@/modules/gap-matrix/services/statutoryBenchmarkService';

describe('Epic 16: Statutory Benchmark Pairing Engine (Task 16.1)', () => {
  const service = new StatutoryBenchmarkService();

  it('retrieves available statutory benchmark frameworks across Nigerian regulators', async () => {
    const benchmarks = await service.getAvailableBenchmarks();
    expect(benchmarks.length).toBeGreaterThanOrEqual(3);

    const regulatorCodes = benchmarks.map((b) => b.regulatorCode);
    expect(regulatorCodes).toContain('CBN');
    expect(regulatorCodes).toContain('ARCON');
    expect(regulatorCodes).toContain('FCCPC');
  });

  it('sorts benchmarks by departmental affinity when department is specified', async () => {
    const marketingBenchmarks = await service.getAvailableBenchmarks('GROWTH_MARKETING');
    expect(marketingBenchmarks.length).toBeGreaterThan(0);
    // ARCON or FCCPC should appear ahead of strictly banking guidelines
    const topRegulators = marketingBenchmarks.slice(0, 2).map((b) => b.regulatorCode);
    expect(topRegulators.some((r) => r === 'ARCON' || r === 'FCCPC')).toBe(true);

    const complianceBenchmarks = await service.getAvailableBenchmarks('COMPLIANCE_LEGAL');
    expect(complianceBenchmarks.length).toBeGreaterThan(0);
    expect(complianceBenchmarks[0].suggestedDepartments).toContain('COMPLIANCE_LEGAL');
  });

  it('retrieves statutory clauses with obligations and verified penalty schedules', async () => {
    const benchmarks = await service.getAvailableBenchmarks();
    const cbnBenchmark = benchmarks.find((b) => b.regulatorCode === 'CBN') || benchmarks[0];

    const clauses = await service.getBenchmarkClausesWithObligations(cbnBenchmark.documentVersionId);
    expect(clauses.length).toBeGreaterThan(0);

    const firstClause = clauses[0];
    expect(firstClause.sectionReference).toBeDefined();
    expect(firstClause.clauseText).toBeDefined();
    expect(firstClause.obligations.length).toBeGreaterThan(0);

    const obligation = firstClause.obligations[0];
    expect(obligation.obligationType).toBeDefined();
    expect(obligation.penalties.length).toBeGreaterThan(0);

    const penalty = obligation.penalties[0];
    expect(penalty.penaltyMaxNaira).toBeGreaterThan(0);
    expect(penalty.penaltyLegalCitation).toBeDefined();
  });
});
