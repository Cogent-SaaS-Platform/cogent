import { describe, it, expect, vi } from 'vitest';
import { LineageService } from '@/modules/radar/services/lineageService';
import { DeadlineCountdownCalculator } from '@/modules/radar/services/deadlineCountdownCalculator';

describe('Phase 2: Circular Lineage & Supersession Graph Resolver (Task 2.5)', () => {
  it('instantiates LineageService and handles local fallback when DB is disconnected', async () => {
    const lineageService = new LineageService();
    const result = await lineageService.resolveLineageGraph('test-circular-uuid');

    expect(result).toBeDefined();
    expect(result.currentNode).toBeDefined();
    expect(result.activeGoverningCircular).toBeDefined();
    expect(result.isCurrentEffectiveLaw).toBe(true);
    expect(result.ancestors).toEqual([]);
    expect(result.descendants).toEqual([]);
  });

  it('creates supersession links and cascades lineage status updates', async () => {
    const mockDb: any = {
      from: vi.fn((table: string) => {
        if (table === 'circular_supersession_links') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'link-uuid-1', parent_circular_id: 'parent-1', child_circular_id: 'child-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'radar_circulars') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {};
      }),
    };

    const lineageService = new LineageService(mockDb);
    const edge = await lineageService.createSupersessionLink({
      parentCircularId: 'parent-1',
      childCircularId: 'child-1',
      amendmentType: 'REVOKES_AND_REPLACES',
      affectedClauseReferences: 'Section 4.0 in its entirety',
    });

    expect(edge.parentCircularId).toBe('parent-1');
    expect(edge.childCircularId).toBe('child-1');
    expect(edge.amendmentType).toBe('REVOKES_AND_REPLACES');
    expect(mockDb.from).toHaveBeenCalledWith('circular_supersession_links');
    expect(mockDb.from).toHaveBeenCalledWith('radar_circulars');
  });

  it('scans circular text for revocation and amendment clauses', async () => {
    const mockDb: any = {
      from: vi.fn((table: string) => {
        if (table === 'radar_circulars') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'parent-cbn-2021', circular_number: 'BPS/DIR/GEN/CIR/05/011' }],
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'circular_supersession_links') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'link-uuid-2' } }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    const lineageService = new LineageService(mockDb);
    const rawText = `
      CENTRAL BANK OF NIGERIA
      CIRCULAR REF: PSM/DIR/CON/CWS/08/014
      This circular supersedes BPS/DIR/GEN/CIR/05/011 issued on 15th January 2021.
      All contactless card processors must comply immediately.
    `;

    const edges = await lineageService.detectAndLinkLineageFromText('child-cbn-2026', rawText);
    expect(edges.length).toBeGreaterThanOrEqual(1);
    expect(edges[0].amendmentType).toBe('REVOKES_AND_REPLACES');
  });
});

describe('Phase 2: Statutory Countdown & Business-Day SLA Alerts (Task 2.6)', () => {
  const calculator = new DeadlineCountdownCalculator();
  const fixedNow = new Date('2026-03-02T09:00:00Z'); // Monday

  it('computes exact Nigerian business days excluding weekends', () => {
    const fridayDate = new Date('2026-03-06T17:00:00Z'); // Friday of same week = 4 business days
    const nextMondayDate = new Date('2026-03-09T09:00:00Z'); // Next Monday = 5 business days

    const bDaysFriday = calculator.calculateBusinessDays(fixedNow, fridayDate);
    const bDaysNextMonday = calculator.calculateBusinessDays(fixedNow, nextMondayDate);

    expect(bDaysFriday).toBe(4);
    expect(bDaysNextMonday).toBe(5);
  });

  it('projects daily compounding penalty exposure for overdue circulars', () => {
    const overdueResult = calculator.calculateCountdown({
      statutoryDeadline: '2026-02-27', // 3 days overdue relative to 2026-03-02
      now: fixedNow,
      regulator: 'CBN',
    });

    expect(overdueResult.isExpired).toBe(true);
    expect(overdueResult.urgencyWindow).toBe('CRITICAL_EMERGENCY');
    expect(overdueResult.penaltyEscalation.baselineFineNaira).toBe(10_000_000);
    expect(overdueResult.penaltyEscalation.dailyFineNaira).toBe(2_000_000);
    expect(overdueResult.penaltyEscalation.totalProjectedExposureNaira).toBeGreaterThan(10_000_000);
    expect(overdueResult.penaltyEscalation.statutoryCitation).toContain('BOFIA 2020');
    expect(overdueResult.slaEscalationLevel).toBe('OVERDUE_EXCO_ALERT');
  });

  it('assigns risk-tiered urgency badges with SLA notification recipients', () => {
    // T-11 Days: Urgent Action
    const urgentResult = calculator.calculateCountdown({
      statutoryDeadline: '2026-03-13',
      now: fixedNow,
      regulator: 'SEC',
    });

    expect(urgentResult.urgencyWindow).toBe('URGENT_ACTION');
    expect(urgentResult.slaEscalationLevel).toBe('CCO_COO_ESCALATION_T7');
    expect(urgentResult.slaEscalationRecipient).toContain('CCO');

    // T-25 Days: Standard Window
    const standardResult = calculator.calculateCountdown({
      statutoryDeadline: '2026-03-27',
      now: fixedNow,
      regulator: 'FCCPC',
    });

    expect(standardResult.urgencyWindow).toBe('STANDARD_WINDOW');
    expect(standardResult.slaEscalationLevel).toBe('TASK_OWNERS_T14');
  });
});
