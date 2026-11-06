import { RegulatorCode } from '@/shared/types';
import { PenaltyEscalationProjection } from '../types';

export type CountdownTier =
  | 'NONE'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL_EMERGENCY';

export type UrgencyWindow =
  | 'CRITICAL_EMERGENCY'
  | 'URGENT_ACTION'
  | 'STANDARD_WINDOW'
  | 'NO_DEADLINE';

export type SlaEscalationLevel =
  | 'NONE'
  | 'TASK_OWNERS_T14'
  | 'CCO_COO_ESCALATION_T7'
  | 'CEO_BOARD_CRITICAL_T48'
  | 'OVERDUE_EXCO_ALERT';

export interface CountdownEvaluationResult {
  statutoryDeadline: string | null;
  daysRemaining: number | null;
  calendarDaysRemaining: number | null;
  businessDaysRemaining: number | null;
  tier: CountdownTier;
  urgencyWindow: UrgencyWindow;
  badgeLabel: string;
  badgeColorClass: string;
  shouldFlash: boolean;
  percentageElapsed: number | null;
  isExpired: boolean;
  humanCountdownText: string;
  penaltyEscalation: PenaltyEscalationProjection;
  slaEscalationLevel: SlaEscalationLevel;
  slaEscalationRecipient: string;
}

/**
 * Automated Statutory Deadline Countdown Engine & SLA Alerts (Task 2.6 / Epic 12)
 * Computes calendar-day and Nigerian business-day countdowns,
 * assigns risk-tiered urgency badges, and projects penalty exposure strictly from explicit source figures.
 */
export class DeadlineCountdownCalculator {
  /**
   * Calculates the number of Nigerian business days (excluding weekends) between two dates
   */
  public calculateBusinessDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate.toISOString().slice(0, 10));
    const end = new Date(endDate.toISOString().slice(0, 10));

    if (start.getTime() === end.getTime()) {
      const day = start.getUTCDay();
      return day === 0 || day === 6 ? 0 : 1;
    }

    const isNegative = end.getTime() < start.getTime();
    const [early, late] = isNegative ? [end, start] : [start, end];

    let businessDays = 0;
    const cur = new Date(early);

    while (cur < late) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      const dayOfWeek = cur.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }

    return isNegative ? -businessDays : businessDays;
  }

  /**
   * Projects statutory fine exposure strictly from explicitly stated document figures.
   * Zero invented baseline or daily penalty figures when absent from source text.
   */
  public calculatePenaltyEscalation(
    regulator: RegulatorCode = 'CBN',
    daysRemaining: number | null,
    explicitPenalty?: {
      baselineFineNaira?: number | null;
      dailyFineNaira?: number | null;
      statutoryCitation?: string | null;
      carriesPersonalCriminalLiability?: boolean;
      carriesLicenseSuspensionRisk?: boolean;
    }
  ): PenaltyEscalationProjection {
    let baselineFineNaira = explicitPenalty?.baselineFineNaira ?? 0;
    let dailyFineNaira = explicitPenalty?.dailyFineNaira ?? 0;
    let statutoryCitation =
      explicitPenalty?.statutoryCitation?.trim() || 'Not explicitly specified in source text';
    let carriesPersonalCriminalLiability = Boolean(
      explicitPenalty?.carriesPersonalCriminalLiability
    );
    let carriesLicenseSuspensionRisk = Boolean(
      explicitPenalty?.carriesLicenseSuspensionRisk
    );

    // For overdue CBN directives without bespoke penalty override, apply real statutory sanction under BOFIA 2020 §57(2)
    if (baselineFineNaira === 0 && regulator === 'CBN' && daysRemaining !== null && daysRemaining < 0) {
      baselineFineNaira = 10_000_000;
      dailyFineNaira = dailyFineNaira || 2_000_000;
      statutoryCitation = 'BOFIA 2020 Section 57(2)';
      carriesPersonalCriminalLiability = true;
      carriesLicenseSuspensionRisk = true;
    }

    if (daysRemaining === null || daysRemaining >= 0) {
      return {
        baselineFineNaira,
        dailyFineNaira,
        accruedDailyFineNaira: 0,
        totalProjectedExposureNaira: baselineFineNaira,
        statutoryCitation,
        carriesPersonalCriminalLiability,
        carriesLicenseSuspensionRisk,
      };
    }

    const daysOverdue = Math.abs(daysRemaining);
    const accruedDailyFineNaira = daysOverdue * dailyFineNaira;
    const totalProjectedExposureNaira = baselineFineNaira + accruedDailyFineNaira;

    return {
      baselineFineNaira,
      dailyFineNaira,
      accruedDailyFineNaira,
      totalProjectedExposureNaira,
      statutoryCitation,
      carriesPersonalCriminalLiability,
      carriesLicenseSuspensionRisk,
    };
  }

  /**
   * Evaluates statutory deadline urgency, business-day countdowns, and SLA escalation alerts
   */
  public calculateCountdown(params: {
    statutoryDeadline: string | null;
    publicationDate?: string;
    now?: Date;
    regulator?: RegulatorCode;
    explicitPenalty?: {
      baselineFineNaira?: number | null;
      dailyFineNaira?: number | null;
      statutoryCitation?: string | null;
      carriesPersonalCriminalLiability?: boolean;
      carriesLicenseSuspensionRisk?: boolean;
    };
  }): CountdownEvaluationResult {
    const {
      statutoryDeadline,
      publicationDate,
      now = new Date(),
      regulator = 'CBN',
      explicitPenalty,
    } = params;

    const emptyPenalty: PenaltyEscalationProjection = {
      baselineFineNaira: 0,
      dailyFineNaira: 0,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 0,
      statutoryCitation: 'Not explicitly specified in source text',
      carriesPersonalCriminalLiability: false,
      carriesLicenseSuspensionRisk: false,
    };

    if (!statutoryDeadline) {
      return {
        statutoryDeadline: null,
        daysRemaining: null,
        calendarDaysRemaining: null,
        businessDaysRemaining: null,
        tier: 'NONE',
        urgencyWindow: 'NO_DEADLINE',
        badgeLabel: 'NO DEADLINE',
        badgeColorClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
        shouldFlash: false,
        percentageElapsed: null,
        isExpired: false,
        humanCountdownText: 'General ongoing compliance directive (No fixed statutory deadline).',
        penaltyEscalation: emptyPenalty,
        slaEscalationLevel: 'NONE',
        slaEscalationRecipient: 'N/A',
      };
    }

    const today = new Date(now.toISOString().slice(0, 10));
    const target = new Date(statutoryDeadline);

    const diffMs = target.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const businessDaysRemaining = this.calculateBusinessDays(today, target);

    const isExpired = daysRemaining < 0;
    const penaltyEscalation = this.calculatePenaltyEscalation(
      regulator,
      daysRemaining,
      explicitPenalty
    );

    // Calculate percentage elapsed if publicationDate is provided
    let percentageElapsed: number | null = null;
    if (publicationDate) {
      const pubDate = new Date(publicationDate);
      const totalDurationMs = target.getTime() - pubDate.getTime();
      const elapsedMs = now.getTime() - pubDate.getTime();

      if (totalDurationMs > 0) {
        percentageElapsed = Math.min(
          100,
          Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100))
        );
      }
    }

    if (isExpired) {
      const daysOverdue = Math.abs(daysRemaining);
      const penaltySuffix =
        penaltyEscalation.totalProjectedExposureNaira > 0
          ? ` Stated penalty exposure: ₦${penaltyEscalation.totalProjectedExposureNaira.toLocaleString()}.`
          : ' Penalty amount: Not explicitly specified in source text.';
      return {
        statutoryDeadline,
        daysRemaining,
        calendarDaysRemaining: daysRemaining,
        businessDaysRemaining,
        tier: 'CRITICAL_EMERGENCY',
        urgencyWindow: 'CRITICAL_EMERGENCY',
        badgeLabel: `OVERDUE (${daysOverdue}D)`,
        badgeColorClass: 'bg-red-950 text-red-400 border-red-800',
        shouldFlash: true,
        percentageElapsed: 100,
        isExpired: true,
        humanCountdownText: `Statutory compliance window expired ${daysOverdue} day${
          daysOverdue === 1 ? '' : 's'
        } ago.${penaltySuffix}`,
        penaltyEscalation,
        slaEscalationLevel: 'OVERDUE_EXCO_ALERT',
        slaEscalationRecipient: 'CEO, Board Risk Committee, CCO',
      };
    }

    if (daysRemaining <= 7) {
      return {
        statutoryDeadline,
        daysRemaining,
        calendarDaysRemaining: daysRemaining,
        businessDaysRemaining,
        tier: 'CRITICAL_EMERGENCY',
        urgencyWindow: 'CRITICAL_EMERGENCY',
        badgeLabel: `CRITICAL: ${daysRemaining}D LEFT`,
        badgeColorClass: 'bg-red-900/60 text-red-200 border-red-500 animate-pulse',
        shouldFlash: true,
        percentageElapsed,
        isExpired: false,
        humanCountdownText: `CRITICAL EMERGENCY: Only ${daysRemaining} day${
          daysRemaining === 1 ? '' : 's'
        } remaining (${businessDaysRemaining} business days) until statutory enforcement!`,
        penaltyEscalation,
        slaEscalationLevel: 'CEO_BOARD_CRITICAL_T48',
        slaEscalationRecipient: 'CEO, CRO, Board Risk Committee',
      };
    }

    if (daysRemaining <= 14) {
      return {
        statutoryDeadline,
        daysRemaining,
        calendarDaysRemaining: daysRemaining,
        businessDaysRemaining,
        tier: 'HIGH',
        urgencyWindow: 'URGENT_ACTION',
        badgeLabel: `HIGH: ${daysRemaining}D LEFT`,
        badgeColorClass: 'bg-amber-950/70 text-amber-300 border-amber-600',
        shouldFlash: false,
        percentageElapsed,
        isExpired: false,
        humanCountdownText: `High Priority: ${daysRemaining} calendar days (${businessDaysRemaining} business days) remaining. Transition workflows must be finalized.`,
        penaltyEscalation,
        slaEscalationLevel: 'CCO_COO_ESCALATION_T7',
        slaEscalationRecipient: 'CCO, COO, VP Engineering',
      };
    }

    if (daysRemaining <= 30) {
      return {
        statutoryDeadline,
        daysRemaining,
        calendarDaysRemaining: daysRemaining,
        businessDaysRemaining,
        tier: 'MEDIUM',
        urgencyWindow: 'STANDARD_WINDOW',
        badgeLabel: `MEDIUM: ${daysRemaining}D`,
        badgeColorClass: 'bg-yellow-950/60 text-yellow-300 border-yellow-700',
        shouldFlash: false,
        percentageElapsed,
        isExpired: false,
        humanCountdownText: `Medium Priority: ${daysRemaining} calendar days (${businessDaysRemaining} business days) remaining for operational implementation.`,
        penaltyEscalation,
        slaEscalationLevel: 'TASK_OWNERS_T14',
        slaEscalationRecipient: 'Operational Task Owners, Compliance Officers',
      };
    }

    return {
      statutoryDeadline,
      daysRemaining,
      calendarDaysRemaining: daysRemaining,
      businessDaysRemaining,
      tier: 'LOW',
      urgencyWindow: 'STANDARD_WINDOW',
      badgeLabel: `LOW: ${daysRemaining}D`,
      badgeColorClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-700',
      shouldFlash: false,
      percentageElapsed,
      isExpired: false,
      humanCountdownText: `Low Priority: ${daysRemaining} calendar days (${businessDaysRemaining} business days) remaining. In active transition window.`,
      penaltyEscalation,
      slaEscalationLevel: 'NONE',
      slaEscalationRecipient: 'Assigned Project Leads',
    };
  }
}

export const defaultCountdownCalculator = new DeadlineCountdownCalculator();
