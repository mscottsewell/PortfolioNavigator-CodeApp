/* ── Percentage validation tests ── */

import { describe, it, expect } from 'vitest';
import { sumPercentages, isValidTotal, validatePercentages } from '../utils/percentageValidation';

describe('sumPercentages', () => {
  it('sums percentages correctly', () => {
    expect(sumPercentages([
      { cai_allocationpercentage: 50 },
      { cai_allocationpercentage: 30 },
      { cai_allocationpercentage: 20 },
    ])).toBe(100);
  });

  it('returns 0 for empty array', () => {
    expect(sumPercentages([])).toBe(0);
  });
});

describe('isValidTotal', () => {
  it('returns true when total is 100', () => {
    expect(isValidTotal([
      { cai_allocationpercentage: 60 },
      { cai_allocationpercentage: 40 },
    ])).toBe(true);
  });

  it('returns false when under 100', () => {
    expect(isValidTotal([{ cai_allocationpercentage: 50 }])).toBe(false);
  });

  it('returns false when over 100', () => {
    expect(isValidTotal([
      { cai_allocationpercentage: 60 },
      { cai_allocationpercentage: 60 },
    ])).toBe(false);
  });
});

describe('validatePercentages', () => {
  it('valid at 100%', () => {
    const result = validatePercentages([{ cai_allocationpercentage: 100 }]);
    expect(result.isValid).toBe(true);
    expect(result.total).toBe(100);
  });

  it('under-allocated', () => {
    const result = validatePercentages([{ cai_allocationpercentage: 40 }]);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('60% remaining');
  });

  it('over-allocated', () => {
    const result = validatePercentages([
      { cai_allocationpercentage: 70 },
      { cai_allocationpercentage: 50 },
    ]);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('Over-allocated by 20%');
  });
});
