import type { IAllocationPeriod } from '../types';

/**
 * Finds the "current" allocation period — the one whose start/end dates
 * fall within the previous calendar month relative to today.
 * Falls back to the first period in the list if none matches.
 */
export function findCurrentPeriod(periods: IAllocationPeriod[]): IAllocationPeriod | undefined {
  if (periods.length === 0) return undefined;

  const now = new Date();
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthYear = lastMonth.getUTCFullYear();
  const lastMonthMonth = lastMonth.getUTCMonth();

  const match = periods.find((p) => {
    const start = new Date(p.cai_allocationperiod_start);
    return start.getUTCFullYear() === lastMonthYear && start.getUTCMonth() === lastMonthMonth;
  });

  return match ?? periods[0];
}

/**
 * Returns true if the given period is the "current" period
 * (i.e. its start date falls in the previous calendar month).
 */
export function isCurrentPeriod(period: IAllocationPeriod): boolean {
  const now = new Date();
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const start = new Date(period.cai_allocationperiod_start);
  return start.getUTCFullYear() === lastMonth.getUTCFullYear()
    && start.getUTCMonth() === lastMonth.getUTCMonth();
}

/**
 * Returns true if the period is editable (current month or last month).
 * Periods older than last month are read-only.
 */
export function isPeriodEditable(period: IAllocationPeriod): boolean {
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const start = new Date(period.cai_allocationperiod_start);
  return start >= cutoff;
}
