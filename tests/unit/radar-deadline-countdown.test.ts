import { describe, it, expect } from 'vitest';
import { DeadlineCountdownCalculator } from '@/modules/radar/services/deadlineCountdownCalculator';

describe('Epic 12: Automated Deadline Countdown Calculator (Task 12.2)', () => {
  const calculator = new DeadlineCountdownCalculator();
  const fixedNow = new Date('2026-03-01T12:00:00Z');

  it('evaluates critical emergency tier for deadlines <= 7 days', () => {
    const result = calculator.calculateCountdown({
      statutoryDeadline: '2026-03-05',
      publicationDate: '2026-02-15',
      now: fixedNow,
    });

    expect(result.tier).toBe('CRITICAL_EMERGENCY');
    expect(result.daysRemaining).toBe(4);
    expect(result.shouldFlash).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.badgeLabel).toBe('CRITICAL: 4D LEFT');
    expect(result.humanCountdownText).toContain('CRITICAL EMERGENCY: Only 4 days remaining');
  });

  it('evaluates high priority tier for deadlines between 8 and 14 days', () => {
    const result = calculator.calculateCountdown({
      statutoryDeadline: '2026-03-12',
      publicationDate: '2026-02-01',
      now: fixedNow,
    });

    expect(result.tier).toBe('HIGH');
    expect(result.daysRemaining).toBe(11);
    expect(result.shouldFlash).toBe(false);
    expect(result.isExpired).toBe(false);
    expect(result.badgeLabel).toBe('HIGH: 11D LEFT');
  });

  it('evaluates medium priority tier for deadlines between 15 and 30 days', () => {
    const result = calculator.calculateCountdown({
      statutoryDeadline: '2026-03-25',
      publicationDate: '2026-02-20',
      now: fixedNow,
    });

    expect(result.tier).toBe('MEDIUM');
    expect(result.daysRemaining).toBe(24);
    expect(result.shouldFlash).toBe(false);
    expect(result.badgeLabel).toBe('MEDIUM: 24D');
  });

  it('evaluates low priority tier for deadlines > 30 days', () => {
    const result = calculator.calculateCountdown({
      statutoryDeadline: '2026-04-15',
      publicationDate: '2026-02-01',
      now: fixedNow,
    });

    expect(result.tier).toBe('LOW');
    expect(result.daysRemaining).toBe(45);
    expect(result.shouldFlash).toBe(false);
    expect(result.badgeLabel).toBe('LOW: 45D');
  });

  it('detects overdue / expired statutory compliance windows with urgent flashing status', () => {
    const result = calculator.calculateCountdown({
      statutoryDeadline: '2026-02-26',
      publicationDate: '2026-01-26',
      now: fixedNow,
    });

    expect(result.tier).toBe('CRITICAL_EMERGENCY');
    expect(result.isExpired).toBe(true);
    expect(result.shouldFlash).toBe(true);
    expect(result.daysRemaining).toBe(-3);
    expect(result.badgeLabel).toBe('OVERDUE (3D)');
    expect(result.humanCountdownText).toContain('expired 3 days ago');
  });

  it('handles circulars with no statutory deadline gracefully', () => {
    const result = calculator.calculateCountdown({
      statutoryDeadline: null,
      now: fixedNow,
    });

    expect(result.tier).toBe('NONE');
    expect(result.daysRemaining).toBeNull();
    expect(result.shouldFlash).toBe(false);
    expect(result.badgeLabel).toBe('NO DEADLINE');
  });
});
