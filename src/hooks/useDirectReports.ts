/* ── Direct reports hook (multi-level hierarchy with on-demand loading) ── */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IResource } from '../types';
import { getDirectReports, getSubReports, getResourceById } from '../api';
import { dedupeResourcesById } from '../utils';

interface UseDirectReportsResult {
  /** Flat list of all loaded resources (excluding the top-level manager) */
  resources: IResource[];
  /** Map from manager resource ID → their direct reports */
  subReportsByManager: Map<string, IResource[]>;
  /** Set of resource IDs that are known managers (have reports) */
  subManagerIds: Set<string>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Load a manager's direct reports on demand (for drill-down navigation) */
  loadManagerTeam: (managerId: string) => Promise<void>;
  /** Set of manager IDs whose direct reports have been fully loaded */
  loadedManagerIds: Set<string>;
  /** Manager ID currently being loaded (for loading spinner) */
  loadingManagerId: string | null;
  /** The top-level managerResourceId the current `resources` were loaded for (null until first successful load). Used by callers to avoid acting on stale state between scope changes. */
  loadedForManagerId: string | null;
}

export function useDirectReports(managerResourceId: string | null, flat: boolean = false): UseDirectReportsResult {
  const [resources, setResources] = useState<IResource[]>([]);
  const [subReportsByManager, setSubReportsByManager] = useState<Map<string, IResource[]>>(new Map());
  const [subManagerIds, setSubManagerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedManagerIds, setLoadedManagerIds] = useState<Set<string>>(new Set());
  const [loadingManagerId, setLoadingManagerId] = useState<string | null>(null);
  const [loadedForManagerId, setLoadedForManagerId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const probeDiscoveredManagers = useCallback(async (managerIds: string[], isCancelled?: () => boolean) => {
    if (managerIds.length === 0) {
      return;
    }

    try {
      const nextLevel = await getSubReports(managerIds);
      if (isCancelled?.()) return;

      const discoveredManagerIds = new Set(
        nextLevel
          .map((r) => r._cai_managerresourceid_value)
          .filter((id): id is string => !!id),
      );

      setSubManagerIds((prev) => {
        if (discoveredManagerIds.size === 0) {
          return prev;
        }

        const next = new Set(prev);
        for (const id of discoveredManagerIds) {
          next.add(id);
        }
        return next;
      });
    } catch (err) {
      console.warn('[PortfolioNavigator] Failed to probe additional manager levels.', err);
    }
  }, []);

  // Main data loading effect with cancellation for scope switches
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const load = async () => {
      if (!managerResourceId) {
        if (!cancelled) {
          setResources([]);
          setSubReportsByManager(new Map());
          setSubManagerIds(new Set());
          setLoadedManagerIds(new Set());
          setLoadedForManagerId(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
        // Clear the loaded-for marker so callers don't act on stale state while we refetch.
        setLoadedForManagerId(null);
      }

      try {
        const direct = await getDirectReports(managerResourceId);
        if (cancelled) return;

        if (flat) {
          const subMap = new Map<string, IResource[]>();
          if (direct.length > 0) {
            subMap.set(managerResourceId, direct);
          }
          setResources(dedupeResourcesById(direct));
          setSubReportsByManager(subMap);
          setSubManagerIds(new Set());
          setLoadedManagerIds(new Set([managerResourceId]));
        } else {
          const directReportIds = direct.map((r) => r.cai_resourceid);
          const allSubReports = directReportIds.length > 0
            ? await getSubReports(directReportIds)
            : [];
          if (cancelled) return;

          const subMap = new Map<string, IResource[]>();
          const managerIdSet = new Set<string>();

          if (direct.length > 0) {
            subMap.set(managerResourceId, direct);
          }

          for (const sub of allSubReports) {
            if (!sub._cai_managerresourceid_value) continue;
            const managerId = sub._cai_managerresourceid_value;
            const list = subMap.get(managerId) ?? [];
            list.push(sub);
            subMap.set(managerId, list);
            managerIdSet.add(managerId);
          }

          const loaded = new Set<string>();
          loaded.add(managerResourceId);
          for (const id of subMap.keys()) {
            loaded.add(id);
          }

          const allResources = dedupeResourcesById([...direct, ...allSubReports]);

          // Merge with functional updaters so any concurrent loadManagerTeam results
          // (e.g. from a deep-link that calls loadManagerTeam before this load finishes)
          // are preserved rather than overwritten by a direct set.
          setResources((prev) => {
            const mainLoadIds = new Set(allResources.map((r) => r.cai_resourceid));
            const extras = prev.filter((r) => !mainLoadIds.has(r.cai_resourceid));
            return dedupeResourcesById([...allResources, ...extras]);
          });
          setSubReportsByManager((prev) => {
            // Start from existing state (preserves loadManagerTeam entries), then
            // apply fresh main-load data (overrides any stale same-key entries).
            const next = new Map(prev);
            for (const [k, v] of subMap) next.set(k, v);
            return next;
          });
          setSubManagerIds((prev) => new Set([...prev, ...managerIdSet]));
          setLoadedManagerIds((prev) => new Set([...prev, ...loaded]));

          // Deeper manager discovery in background (respects cancellation)
          void probeDiscoveredManagers(allSubReports.map((r) => r.cai_resourceid), isCancelled);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load direct reports');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedForManagerId(managerResourceId);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [managerResourceId, flat, refreshToken, probeDiscoveredManagers]);

  const refetch = useCallback(() => setRefreshToken((n) => n + 1), []);

  const probeChildManagers = useCallback(async (managerId: string, reports: IResource[]) => {
    const reportIds = reports.map((r) => r.cai_resourceid);
    if (reportIds.length === 0) {
      return;
    }

    try {
      await probeDiscoveredManagers(reportIds, undefined);
    } catch (err) {
      console.warn(`[PortfolioNavigator] Failed to probe child managers for ${managerId}`, err);
    } finally {
      setLoadingManagerId((current) => (current === managerId ? null : current));
    }
  }, [probeDiscoveredManagers]);

  /** Load a manager's direct reports on demand and probe for sub-managers */
  const loadManagerTeam = useCallback(async (managerId: string) => {
    setLoadingManagerId(managerId);
    try {
      // Load the manager's direct reports + the manager resource itself in parallel
      const [reports, managerResource] = await Promise.all([
        getDirectReports(managerId).then(dedupeResourcesById),
        // Only fetch if not already in resources
        getResourceById(managerId),
      ]);

      // Add new resources (including manager if not already present)
      setResources((prev) => {
        const newResources = [...prev, ...reports];
        if (managerResource && !prev.some((r) => r.cai_resourceid === managerId)) {
          newResources.push(managerResource);
        }
        return dedupeResourcesById(newResources);
      });

      // Add to the reports-by-manager map
      setSubReportsByManager((prev) => {
        const next = new Map(prev);
        next.set(managerId, reports);
        return next;
      });

      // Mark this manager's team as loaded
      setLoadedManagerIds((prev) => new Set([...prev, managerId]));

      // Keep the visible team responsive: manager detection happens in the background.
      void probeChildManagers(managerId, reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
      setLoadingManagerId((current) => (current === managerId ? null : current));
    }
  }, [probeChildManagers]);

  return useMemo(() => ({
    resources,
    subReportsByManager,
    subManagerIds,
    loading,
    error,
    refetch,
    loadManagerTeam,
    loadedManagerIds,
    loadingManagerId,
    loadedForManagerId,
  }), [resources, subReportsByManager, subManagerIds, loading, error, refetch, loadManagerTeam, loadedManagerIds, loadingManagerId, loadedForManagerId]);
}
