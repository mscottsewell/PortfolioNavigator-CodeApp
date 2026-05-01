/**
 * Hooks for reading pre-calculated manager summaries from Dataverse
 * and computing parent-child tree rollups.
 *
 * The summary tree architecture:
 * - Each summary stores direct-report-only counts (cai_direct* fields)
 * - Summaries link via parent pointers (_cai_parentsummaryid_value)
 * - Rollups are computed client-side by walking the small summary tree
 * - Interactive changes update direct counts + recompute rollups instantly
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IManagerSummary, RollupCounts } from '../types';
import { ManagerSummaryType } from '../types';
import { getAllManagerSummaries } from '../api/managerSummaryApi';
import {
  buildSummaryChildrenMap,
  computeAllRollups,
} from '../utils/summaryTreeUtils';

export interface SummaryTreeResult {
  /** Raw summary records keyed by manager resource ID. */
  summaries: Map<string, IManagerSummary>;
  /** Computed rollups (direct + all descendants) keyed by manager resource ID. */
  rollups: Map<string, RollupCounts>;
  /** Parent→children map for the summary tree. */
  childrenMap: Map<string, string[]>;
  /** Whether the initial fetch is in progress. */
  loading: boolean;
  /** Error message if the last fetch failed. */
  error: string | null;
}

interface SummaryTreeOptions {
  allowUnfilteredAllocation?: boolean;
  transformResults?: (results: IManagerSummary[]) => IManagerSummary[];
}

function getSummaryPopulationScore(summary: IManagerSummary): number {
  return (
    (summary.cai_totalemployees ?? 0) +
    (summary.cai_alertcount ?? 0) +
    (summary.cai_pendingcount ?? 0) +
    (summary.cai_nottotalingcount ?? 0) +
    (summary.cai_norecordscount ?? 0) +
    (summary.cai_inactiveserviceemployeecount ?? 0) +
    (summary.cai_inactiveservicerecordcount ?? 0) +
    (summary.cai_directtotalemployees ?? 0) +
    (summary.cai_directalertcount ?? 0) +
    (summary.cai_directpendingcount ?? 0) +
    (summary.cai_directnottotalingcount ?? 0) +
    (summary.cai_directnorecordscount ?? 0) +
    (summary.cai_directinactiveserviceemployeecount ?? 0) +
    (summary.cai_directinactiveservicerecordcount ?? 0)
  );
}

export function selectBestSummaryPerManager(results: IManagerSummary[]): IManagerSummary[] {
  const byManager = new Map<string, IManagerSummary>();

  for (const summary of results) {
    const managerId = summary._cai_managerresourceid_value;
    const existing = byManager.get(managerId);
    if (!existing) {
      byManager.set(managerId, summary);
      continue;
    }

    const candidateScore = getSummaryPopulationScore(summary);
    const existingScore = getSummaryPopulationScore(existing);
    if (candidateScore !== existingScore) {
      if (candidateScore > existingScore) {
        byManager.set(managerId, summary);
      }
      continue;
    }

    const candidateCalculated = Date.parse(summary.cai_lastcalculatedon ?? '') || 0;
    const existingCalculated = Date.parse(existing.cai_lastcalculatedon ?? '') || 0;
    if (candidateCalculated > existingCalculated) {
      byManager.set(managerId, summary);
    }
  }

  return [...byManager.values()];
}

/**
 * Fetch ALL summaries for a type+period, build the parent-child tree,
 * and compute rollups. Returns the full tree state.
 */
export function useManagerSummaryTree(
  summaryType: number,
  periodId: string | null | undefined,
  refreshKey: number,
  enabled: boolean = true,
  options?: SummaryTreeOptions,
): SummaryTreeResult {
  const [summaries, setSummaries] = useState<Map<string, IManagerSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decompose options into stable primitives to avoid infinite re-render loops
  // when callers pass inline object literals.
  const allowUnfilteredAllocation = options?.allowUnfilteredAllocation ?? false;
  const transformResults = options?.transformResults;

  const fetchAll = useCallback(async () => {
    // For allocation summaries, wait until periodId is resolved to avoid
    // a wasteful unfiltered fetch that returns cross-period data.
    const needsPeriod = summaryType === ManagerSummaryType.Allocation && !allowUnfilteredAllocation;
    if (!enabled || (needsPeriod && !periodId)) {
      setSummaries(new Map());
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await getAllManagerSummaries(summaryType, periodId);
      const finalResults = transformResults ? transformResults(results) : results;
      const map = new Map(finalResults.map((s) => [s._cai_managerresourceid_value, s]));
      setSummaries(map);
    } catch (err) {
      console.error('[SummaryTree] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load manager summaries');
    } finally {
      setLoading(false);
    }
  }, [summaryType, periodId, enabled, allowUnfilteredAllocation, transformResults]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, refreshKey]);

  // Build children map from parent pointers
  const childrenMap = useMemo(
    () => buildSummaryChildrenMap(summaries),
    [summaries],
  );

  // Compute rollups from the tree
  const rollups = useMemo(
    () => summaries.size > 0 ? computeAllRollups(summaries, childrenMap) : new Map<string, RollupCounts>(),
    [summaries, childrenMap],
  );

  return { summaries, rollups, childrenMap, loading, error };
}

