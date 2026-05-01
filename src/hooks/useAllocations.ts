/* ── Allocations hook ── */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IAllocation } from '../types';
import { AllocationStatus } from '../types';
import * as api from '../api';

interface UseAllocationsResult {
  allocations: IAllocation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  approve: (allocationIds: string[]) => Promise<void>;
  updateAllocation: (
    id: string,
    data: Partial<Pick<IAllocation,
      'cai_allocationpercentage'
      | '_cai_serviceorinitiativeid_value'
      | 'cai_managerapprovalstatus'
      | 'cai_managerreviewdate'
      | '_cai_managerreviewcompletedbyid_value'
    >>,
  ) => Promise<void>;
  addAllocation: (data: Omit<IAllocation, 'cai_allocationid'>) => Promise<void>;
  removeAllocation: (id: string) => Promise<void>;
}

export function useAllocations(
  periodId: string | null,
  resourceIds: string[],
): UseAllocationsResult {
  const [allocations, setAllocations] = useState<IAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize resourceIds by value to avoid refetching on reference-only changes
  const stableIds = useMemo(() => [...resourceIds].sort().join(','), [resourceIds]);

  const fetch = useCallback(async () => {
    const ids = stableIds ? stableIds.split(',') : [];
    if (!periodId || ids.length === 0) {
      setAllocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllocations(periodId, ids);
      setAllocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allocations');
    } finally {
      setLoading(false);
    }
  }, [periodId, stableIds]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const approve = useCallback(
    async (allocationIds: string[]) => {
      const { succeeded, failed } = await api.approveAllocations(allocationIds);
      // Update local state for any that succeeded, even on partial failure
      if (succeeded.length > 0) {
        const succeededSet = new Set(succeeded);
        setAllocations((prev) =>
          prev.map((allocation) =>
            succeededSet.has(allocation.cai_allocationid)
              ? {
                  ...allocation,
                  cai_managerapprovalstatus: AllocationStatus.ReviewComplete,
                  cai_managerapprovalstatus_formatted: 'Review Complete',
                }
              : allocation,
          ),
        );
      }
      if (failed > 0) {
        throw new Error(`${failed} of ${allocationIds.length} approval(s) failed`);
      }
    },
    [],
  );

  const update = useCallback(
    async (
      id: string,
      data: Partial<Pick<IAllocation,
        'cai_allocationpercentage'
        | '_cai_serviceorinitiativeid_value'
        | 'cai_managerapprovalstatus'
        | 'cai_managerreviewdate'
        | '_cai_managerreviewcompletedbyid_value'
      >>,
    ) => {
      try {
        await api.updateAllocation(id, data);
        setAllocations((prev) =>
          prev.map((allocation) =>
            allocation.cai_allocationid === id ? { ...allocation, ...data } : allocation,
          ),
        );
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to update allocation');
      }
    },
    [],
  );

  const addAlloc = useCallback(
    async (data: Omit<IAllocation, 'cai_allocationid'>) => {
      try {
        const created = await api.createAllocation(data);
        setAllocations((prev) => [...prev, created]);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to create allocation');
      }
    },
    [],
  );

  const removeAlloc = useCallback(
    async (id: string) => {
      try {
        await api.deleteAllocation(id);
        setAllocations((prev) => prev.filter((a) => a.cai_allocationid !== id));
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to remove allocation');
      }
    },
    [],
  );

  return {
    allocations,
    loading,
    error,
    refetch: fetch,
    approve,
    updateAllocation: update,
    addAllocation: addAlloc,
    removeAllocation: removeAlloc,
  };
}
