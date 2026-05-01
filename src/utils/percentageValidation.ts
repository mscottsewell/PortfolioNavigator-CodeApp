/* ── Percentage validation utilities ── */

import type { IAssignment, IAllocation } from '../types';

export function sumPercentages(items: Pick<IAssignment | IAllocation, 'cai_allocationpercentage'>[]): number {
  return items.reduce((sum, item) => sum + (Number.isNaN(item.cai_allocationpercentage) ? 0 : item.cai_allocationpercentage), 0);
}

export function isValidTotal(items: Pick<IAssignment | IAllocation, 'cai_allocationpercentage'>[]): boolean {
  return sumPercentages(items) === 100;
}

export type ValidationResult = {
  total: number;
  isValid: boolean;
  message: string;
};

export function validatePercentages(
  items: Pick<IAssignment | IAllocation, 'cai_allocationpercentage'>[],
): ValidationResult {
  const total = sumPercentages(items);
  if (total === 100) {
    return { total, isValid: true, message: 'Allocations total 100%' };
  }
  if (total < 100) {
    return { total, isValid: false, message: `${100 - total}% remaining to allocate` };
  }
  return { total, isValid: false, message: `Over-allocated by ${total - 100}%` };
}
