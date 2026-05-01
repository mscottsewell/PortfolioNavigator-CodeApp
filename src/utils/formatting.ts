/* ── Display formatting helpers ── */

export function formatPercentage(value: number): string {
  return `${value}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/** Convert sum of whole-number percentages to FTE (e.g. 80 → "0.8") */
export function formatFte(totalPercentage: number): string {
  return (totalPercentage / 100).toFixed(1);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
