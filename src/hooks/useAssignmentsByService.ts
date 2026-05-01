/* ── useAssignmentsByService — lazy-loads all active assignments for a service ── */

import { useState, useEffect } from 'react';
import type { IAssignment, IResource } from '../types';
import * as api from '../api';

export interface ServiceAssignmentData {
  assignments: IAssignment[];
  resourcesById: Map<string, IResource>;
  loading: boolean;
  error: string | null;
}

export function useAssignmentsByService(serviceId: string | null): ServiceAssignmentData {
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [resourcesById, setResourcesById] = useState<Map<string, IResource>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      setAssignments([]);
      setResourcesById(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const fetchedAssignments = await api.getAssignmentsByServiceId(serviceId);
        if (cancelled) return;

        const resourceIds = [...new Set(fetchedAssignments.map((a) => a._cai_resourceid_value))];
        const resources = resourceIds.length > 0 ? await api.getResourcesByIds(resourceIds) : [];
        if (cancelled) return;

        const resourceMap = new Map<string, IResource>();
        for (const r of resources) {
          resourceMap.set(r.cai_resourceid, r);
        }

        setAssignments(fetchedAssignments);
        setResourcesById(resourceMap);
        setLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  return { assignments, resourcesById, loading, error };
}
