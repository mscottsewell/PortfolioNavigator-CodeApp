/* ── Formatting utility tests ── */

import { describe, it, expect } from 'vitest';
import { formatPercentage, formatCount, formatFte, getInitials } from '../utils/formatting';

describe('formatPercentage', () => {
  it('formats number as percentage string', () => {
    expect(formatPercentage(50)).toBe('50%');
    expect(formatPercentage(0)).toBe('0%');
    expect(formatPercentage(100)).toBe('100%');
  });
});

describe('formatFte', () => {
  it('converts whole-number percentage sum to FTE', () => {
    expect(formatFte(80)).toBe('0.8');
    expect(formatFte(100)).toBe('1.0');
    expect(formatFte(250)).toBe('2.5');
    expect(formatFte(0)).toBe('0.0');
    expect(formatFte(30)).toBe('0.3');
  });
});

describe('formatCount', () => {
  it('adds thousands separators', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(12)).toBe('12');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(7513)).toBe('7,513');
  });
});

describe('getInitials', () => {
  it('extracts initials from full name', () => {
    expect(getInitials('Alex Chen')).toBe('AC');
  });

  it('handles single name', () => {
    expect(getInitials('Alex')).toBe('A');
  });

  it('limits to 2 initials', () => {
    expect(getInitials('John Paul Smith')).toBe('JP');
  });
});
