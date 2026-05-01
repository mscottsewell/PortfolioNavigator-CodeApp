/* ── Lightweight hook to count assignment issues (over/under-allocated employees) ── */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAssignmentIssueResourceCount } from '../api';

interface UseAssignmentIssueCountResult {
  count: number | null;
  refetch: () => void;
}

export function useAssignmentIssueCount(
  resourceIds: string[],
  enabled: boolean = true,
): UseAssignmentIssueCountResult {
  const [count, setCount] = useState<number | null>(null);

  const stableIds = useMemo(() => [...resourceIds].sort().join(','), [resourceIds]);

  const fetchCount = useCallback(async () => {
    const ids = stableIds ? stableIds.split(',') : [];
    if (!enabled || ids.length === 0) {
      setCount(0);
      return;
    }
    try {
      const result = await getAssignmentIssueResourceCount(ids);
      setCount(result);
    } catch {
      setCount(null);
    }
  }, [enabled, stableIds]);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}
