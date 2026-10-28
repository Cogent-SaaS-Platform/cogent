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
 * assigns risk-tiered urgency badges, and projects compounding penalty exposure.
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
   * Deterministically projects statutory fine exposure based on regulator and remaining days
   */
  public calculatePenaltyEscalation(
    regulator: RegulatorCode = 'CBN',
    daysRemaining: number | null
  ): PenaltyEscalationProjection {
    const penaltySchedules: Record<
      RegulatorCode,
      {
        baselineFineNaira: number;
        dailyFineNaira: number;
        statutoryCitation: string;
        carriesPersonalCriminalLiability: boolean;
        carriesLicenseSuspensionRisk: boolean;
      }
    > = {
      CBN: {
        baselineFineNaira: 10_000_000,
        dailyFineNaira: 2_000_000,
        statutoryCitation: 'BOFIA 2020 Section 57(2) & CBN Sanctions Grid',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      SEC: {
        baselineFineNaira: 5_000_000,
        dailyFineNaira: 100_000,
        statutoryCitation: 'Investments and Securities Act (ISA) 2007 Section 303',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      FCCPC: {
        baselineFineNaira: 50_000_000,
        dailyFineNaira: 1_000_000,
        statutoryCitation: 'FCCPA 2018 Section 155(1) & Digital Lending Directives',
        carriesPersonalCriminalLiability: false,
        carriesLicenseSuspensionRisk: true,
      },
      NDPC: {
        baselineFineNaira: 10_000_000,
        dailyFineNaira: 500_000,
        statutoryCitation: 'Nigeria Data Protection Act (NDPA) 2023 Section 48(1)',
        carriesPersonalCriminalLiability: false,
        carriesLicenseSuspensionRisk: false,
      },
      NFIU: {
        baselineFineNaira: 25_000_000,
        dailyFineNaira: 1_000_000,
        statutoryCitation: 'Money Laundering (Prevention and Prohibition) Act 2022 Section 19',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      NDIC: {
        baselineFineNaira: 10_000_000,
        dailyFineNaira: 500_000,
        statutoryCitation: 'NDIC Act 2023 Section 39 & Deposit Guarantee Standards',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      ARCON: {
        baselineFineNaira: 2_500_000,
        dailyFineNaira: 100_000,
        statutoryCitation: 'ARCON Act 2022 Section 34 & ASP Directives',
        carriesPersonalCriminalLiability: false,
        carriesLicenseSuspensionRisk: false,
      },
      BOG: {
        baselineFineNaira: 15_000_000,
        dailyFineNaira: 150_000,
        statutoryCitation: 'Payment Systems and Services Act 2019 (Act 987) Section 42',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      CBK: {
        baselineFineNaira: 12_000_000,
        dailyFineNaira: 200_000,
        statutoryCitation: 'Central Bank of Kenya National Payment System Act Section 31',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
      SARB: {
        baselineFineNaira: 20_000_000,
        dailyFineNaira: 250_000,
        statutoryCitation: 'SARB National Payment System Act Section 14',
        carriesPersonalCriminalLiability: true,
        carriesLicenseSuspensionRisk: true,
      },
    };

    const schedule = penaltySchedules[regulator] || penaltySchedules.CBN;

    if (daysRemaining === null || daysRemaining >= 0) {
      return {
        baselineFineNaira: schedule.baselineFineNaira,
        dailyFineNaira: schedule.dailyFineNaira,
        accruedDailyFineNaira: 0,
        totalProjectedExposureNaira: schedule.baselineFineNaira,
        statutoryCitation: schedule.statutoryCitation,
        carriesPersonalCriminalLiability: schedule.carriesPersonalCriminalLiability,
        carriesLicenseSuspensionRisk: schedule.carriesLicenseSuspensionRisk,
      };
    }

    const daysOverdue = Math.abs(daysRemaining);
    const accruedDailyFineNaira = daysOverdue * schedule.dailyFineNaira;
    const totalProjectedExposureNaira = schedule.baselineFineNaira + accruedDailyFineNaira;

    return {
      baselineFineNaira: schedule.baselineFineNaira,
      dailyFineNaira: schedule.dailyFineNaira,
      accruedDailyFineNaira,
      totalProjectedExposureNaira,
      statutoryCitation: schedule.statutoryCitation,
      carriesPersonalCriminalLiability: schedule.carriesPersonalCriminalLiability,
      carriesLicenseSuspensionRisk: schedule.carriesLicenseSuspensionRisk,
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
  }): CountdownEvaluationResult {
    const { statutoryDeadline, publicationDate, now = new Date(), regulator = 'CBN' } = params;

    const emptyPenalty: PenaltyEscalationProjection = {
      baselineFineNaira: 0,
      dailyFineNaira: 0,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 0,
      statutoryCitation: 'No statutory deadline applicable',
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
    const penaltyEscalation = this.calculatePenaltyEscalation(regulator, daysRemaining);

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
        } ago. Immediate regulatory exposure of ₦${penaltyEscalation.totalProjectedExposureNaira.toLocaleString()}!`,
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
