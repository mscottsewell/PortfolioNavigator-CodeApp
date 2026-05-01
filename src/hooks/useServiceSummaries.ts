/**
 * Hook for reading and computing per-service summaries from Dataverse.
 * Returns a Map<serviceId, IServiceInitiativeSummary> for O(1) lookup.
 *
 * Summaries are computed client-side for the loaded hierarchy and persisted.
 * The pipeline provides full-hierarchy accuracy; client writes handle the
 * loaded subtree for immediate feedback after saves.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IServiceInitiativeSummary } from '../types';
import { getServiceSummaries, getServiceSummariesForManagers } from '../api/serviceInitiativeSummaryApi';

/**
 * Fetch service summaries for a single manager from Dataverse.
 */
export function useServiceSummaryMap(
  managerResourceId: string | undefined,
  summaryType: number,
  periodId: string | null | undefined,
  refreshKey: number,
): { summaries: Map<string, IServiceInitiativeSummary>; loading: boolean } {
  const [summaries, setSummaries] = useState<Map<string, IServiceInitiativeSummary>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchSummaries = useCallback(async () => {
    if (!managerResourceId) {
      setSummaries(new Map());
      return;
    }

    setLoading(true);
    try {
      const results = await getServiceSummaries(managerResourceId, summaryType, periodId);
      setSummaries(new Map(results.map((s) => [s._cai_serviceorinitiativeid_value, s])));
    } catch {
      // Non-critical — dashboard just uses client-side computation
    } finally {
      setLoading(false);
    }
  }, [managerResourceId, summaryType, periodId]);

  useEffect(() => {
    void fetchSummaries();
  }, [fetchSummaries, refreshKey]);

  return { summaries, loading };
}

export function useServiceSummariesByManager(
  managerResourceIds: string[],
  summaryType: number,
  periodId: string | null | undefined,
  serviceId: string | undefined,
  refreshKey: number,
): { summariesByManager: Map<string, IServiceInitiativeSummary>; loading: boolean } {
  const [summariesByManager, setSummariesByManager] = useState<Map<string, IServiceInitiativeSummary>>(new Map());
  const [loading, setLoading] = useState(false);

  const managerIdsKey = useMemo(
    () => Array.from(new Set(managerResourceIds)).sort().join('|'),
    [managerResourceIds],
  );

  const fetchSummaries = useCallback(async () => {
    if (!serviceId || managerResourceIds.length === 0) {
      setSummariesByManager(new Map());
      return;
    }

    setLoading(true);
    try {
      const results = await getServiceSummariesForManagers(managerResourceIds, summaryType, periodId, serviceId);
      setSummariesByManager(new Map(
        results
          .filter((summary): summary is typeof summary & { _cai_managerresourceid_value: string } =>
            summary._cai_managerresourceid_value !== null)
          .map((summary) => [summary._cai_managerresourceid_value, summary]),
      ));
    } catch {
      setSummariesByManager(new Map());
    } finally {
      setLoading(false);
    }
  }, [managerIdsKey, managerResourceIds, periodId, serviceId, summaryType]);

  useEffect(() => {
    void fetchSummaries();
  }, [fetchSummaries, refreshKey]);

  return { summariesByManager, loading };
}

