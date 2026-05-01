/* ── Lightweight hook to count pending allocations for the current period ── */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSharedData } from '../contexts';
import { getPendingAllocationResourceCount } from '../api';

interface UsePendingAllocationCountResult {
  count: number | null;
  refetch: () => void;
}

export function usePendingAllocationCount(
  resourceIds: string[],
  enabled: boolean = true,
): UsePendingAllocationCountResult {
  const [count, setCount] = useState<number | null>(null);
  const { currentPeriodId } = useSharedData();

  const stableIds = useMemo(() => [...resourceIds].sort().join(','), [resourceIds]);

  const fetchCount = useCallback(async () => {
    const ids = stableIds ? stableIds.split(',') : [];
    if (!enabled || !currentPeriodId || ids.length === 0) {
      setCount(0);
      return;
    }
    try {
      const result = await getPendingAllocationResourceCount(currentPeriodId, ids);
      setCount(result);
    } catch {
      setCount(null);
    }
  }, [currentPeriodId, enabled, stableIds]);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}
