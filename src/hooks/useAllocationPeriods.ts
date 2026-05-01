/* ── Allocation periods hook — reads from SharedDataContext ── */

import type { IAllocationPeriod } from '../types';
import { useSharedData } from '../contexts';

interface UseAllocationPeriodsResult {
  periods: IAllocationPeriod[];
  loading: boolean;
  error: string | null;
}

export function useAllocationPeriods(): UseAllocationPeriodsResult {
  const shared = useSharedData();
  return {
    periods: shared.periods,
    loading: shared.periodsLoading,
    error: shared.periodsError,
  };
}
