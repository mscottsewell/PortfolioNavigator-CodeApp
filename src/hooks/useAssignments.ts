/* ── Assignments hook ── */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IAssignment } from '../types';
import * as api from '../api';

type AssignmentUpdateData = Partial<Pick<IAssignment, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value' | 'cai_totalallocatedperuserperperiod'>>;

interface UseAssignmentsResult {
  assignments: IAssignment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  addAssignment: (
    resourceId: string,
    serviceOrInitiativeId: string,
    percentage: number,
    name?: string,
  ) => Promise<void>;
  updateAssignment: (
    id: string,
    data: AssignmentUpdateData,
  ) => Promise<void>;
  updateMultipleAssignments: (
    changes: { id: string; data: AssignmentUpdateData }[],
  ) => Promise<void>;
  removeAssignment: (id: string) => Promise<void>;
}

export function useAssignments(resourceIds: string[]): UseAssignmentsResult {
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize resourceIds by value to avoid refetching on reference-only changes
  const stableIds = useMemo(() => [...resourceIds].sort().join(','), [resourceIds]);

  const fetch = useCallback(async () => {
    const ids = stableIds ? stableIds.split(',') : [];
    if (ids.length === 0) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAssignments(ids);
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [stableIds]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const addAssignment = useCallback(
    async (resourceId: string, serviceOrInitiativeId: string, percentage: number, name?: string) => {
      try {
        const created = await api.createAssignment({
          cai_assignmentname: name || 'Assignment',
          _cai_resourceid_value: resourceId,
          _cai_serviceorinitiativeid_value: serviceOrInitiativeId,
          cai_allocationpercentage: percentage,
          cai_totalallocatedperuserperperiod: percentage,
        } as Omit<IAssignment, 'cai_assignmentid'>);
        setAssignments((prev) => [...prev, created]);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to create assignment');
      }
    },
    [],
  );

  const update = useCallback(
    async (
      id: string,
      data: AssignmentUpdateData,
    ) => {
      try {
        await api.updateAssignment(id, data);
        setAssignments((prev) =>
          prev.map((assignment) =>
            assignment.cai_assignmentid === id ? { ...assignment, ...data } : assignment,
          ),
        );
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to update assignment');
      }
    },
    [],
  );

  const updateMultiple = useCallback(
    async (
      changes: { id: string; data: AssignmentUpdateData }[],
    ) => {
      const succeeded: typeof changes = [];
      let failCount = 0;
      for (const change of changes) {
        try {
          await api.updateAssignment(change.id, change.data);
          succeeded.push(change);
        } catch {
          failCount++;
        }
      }
      if (succeeded.length > 0) {
        setAssignments((prev) => {
          const changeMap = new Map(succeeded.map(({ id, data }) => [id, data]));
          return prev.map((a) => {
            const change = changeMap.get(a.cai_assignmentid);
            return change ? { ...a, ...change } : a;
          });
        });
      }
      if (failCount > 0) {
        throw new Error(`${failCount} of ${changes.length} assignment update(s) failed`);
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteAssignment(id);
      setAssignments((prev) => prev.filter((assignment) => assignment.cai_assignmentid !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  }, []);

  return {
    assignments,
    loading,
    error,
    refetch: fetch,
    addAssignment,
    updateAssignment: update,
    updateMultipleAssignments: updateMultiple,
    removeAssignment: remove,
  };
}
