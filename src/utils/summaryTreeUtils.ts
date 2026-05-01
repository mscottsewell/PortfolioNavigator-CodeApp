/**
 * Summary tree utilities for the parent-child manager summary architecture.
 *
 * Each manager summary stores direct-report-only counts. The tree structure
 * (via parent pointers) allows the client to compute full-subtree rollups
 * by walking the small summary tree (~200 records) instead of the employee
 * tree (~6,800 records).
 */

import type { IManagerSummary, DirectCounts, RollupCounts } from '../types';

const ZERO_DIRECT: DirectCounts = {
  totalEmployees: 0,
  alertCount: 0,
  pendingCount: 0,
  nottotalingCount: 0,
  noRecordsCount: 0,
  inactiveServiceEmployeeCount: 0,
  inactiveServiceRecordCount: 0,
};

const ZERO_ROLLUP: RollupCounts = {
  ...ZERO_DIRECT,
  directCounts: ZERO_DIRECT,
};

/** Extract direct counts from a persisted summary record. */
function extractDirectCounts(summary: IManagerSummary): DirectCounts {
  return {
    totalEmployees: summary.cai_directtotalemployees ?? 0,
    alertCount: summary.cai_directalertcount ?? 0,
    pendingCount: summary.cai_directpendingcount ?? 0,
    nottotalingCount: summary.cai_directnottotalingcount ?? 0,
    noRecordsCount: summary.cai_directnorecordscount ?? 0,
    inactiveServiceEmployeeCount: summary.cai_directinactiveserviceemployeecount ?? 0,
    inactiveServiceRecordCount: summary.cai_directinactiveservicerecordcount ?? 0,
  };
}

/**
 * Build a parent→children map from a flat list of manager summaries.
 * Returns a Map<managerResourceId, childManagerResourceIds[]>.
 */
export function buildSummaryChildrenMap(
  summaries: Map<string, IManagerSummary>,
): Map<string, string[]> {
  const children = new Map<string, string[]>();

  // Build reverse lookup: summary record ID → manager resource ID
  const summaryIdToManagerId = new Map<string, string>();
  for (const [managerId, summary] of summaries) {
    if (summary.cai_managersummaryid) {
      summaryIdToManagerId.set(summary.cai_managersummaryid, managerId);
    }
  }

  for (const [managerId, summary] of summaries) {
    const parentSummaryId = summary._cai_parentsummaryid_value;
    if (parentSummaryId) {
      // Resolve parent summary ID to parent's manager resource ID
      const parentManagerId = summaryIdToManagerId.get(parentSummaryId);
      if (parentManagerId) {
        const list = children.get(parentManagerId);
        if (list) {
          list.push(managerId);
        } else {
          children.set(parentManagerId, [managerId]);
        }
      }
    }
  }

  return children;
}

function addCounts(a: DirectCounts, b: DirectCounts): DirectCounts {
  return {
    totalEmployees: a.totalEmployees + b.totalEmployees,
    alertCount: a.alertCount + b.alertCount,
    pendingCount: a.pendingCount + b.pendingCount,
    nottotalingCount: a.nottotalingCount + b.nottotalingCount,
    noRecordsCount: a.noRecordsCount + b.noRecordsCount,
    inactiveServiceEmployeeCount: a.inactiveServiceEmployeeCount + b.inactiveServiceEmployeeCount,
    inactiveServiceRecordCount: a.inactiveServiceRecordCount + b.inactiveServiceRecordCount,
  };
}

/** Extract pipeline rollup counts from a summary record (full subtree, computed by pipeline). */
function extractPipelineRollup(summary: IManagerSummary): DirectCounts {
  return {
    totalEmployees: summary.cai_totalemployees ?? 0,
    alertCount: summary.cai_alertcount ?? 0,
    pendingCount: summary.cai_pendingcount ?? 0,
    nottotalingCount: summary.cai_nottotalingcount ?? 0,
    noRecordsCount: summary.cai_norecordscount ?? 0,
    inactiveServiceEmployeeCount: summary.cai_inactiveserviceemployeecount ?? 0,
    inactiveServiceRecordCount: summary.cai_inactiveservicerecordcount ?? 0,
  };
}

/** Use the greater of tree rollup vs pipeline rollup for each field. */
function maxCounts(a: DirectCounts, b: DirectCounts): DirectCounts {
  return {
    totalEmployees: Math.max(a.totalEmployees, b.totalEmployees),
    alertCount: Math.max(a.alertCount, b.alertCount),
    pendingCount: Math.max(a.pendingCount, b.pendingCount),
    nottotalingCount: Math.max(a.nottotalingCount, b.nottotalingCount),
    noRecordsCount: Math.max(a.noRecordsCount, b.noRecordsCount),
    inactiveServiceEmployeeCount: Math.max(a.inactiveServiceEmployeeCount, b.inactiveServiceEmployeeCount),
    inactiveServiceRecordCount: Math.max(a.inactiveServiceRecordCount, b.inactiveServiceRecordCount),
  };
}

/**
 * Compute rollups for ALL managers in the summary tree using bottom-up traversal.
 *
 * For each manager: rollup = own direct counts + sum of all descendants' direct counts.
 * Uses memoization to avoid recomputing subtrees.
 *
 * As a fallback, each manager's rollup is floored by the pipeline's full-subtree
 * rollup (cai_alertcount, etc.). This handles the case where cai_direct* fields
 * aren't fully populated yet — the pipeline value is used as a minimum.
 */
export function computeAllRollups(
  summaries: Map<string, IManagerSummary>,
  childrenMap: Map<string, string[]>,
): Map<string, RollupCounts> {
  const rollups = new Map<string, RollupCounts>();
  const visited = new Set<string>();

  const visit = (managerId: string, visited: Set<string>): RollupCounts => {
    const cached = rollups.get(managerId);
    if (cached) return cached;

    // Cycle guard — use backtracking to avoid O(N²) Set copies
    if (visited.has(managerId)) return ZERO_ROLLUP;
    visited.add(managerId);

    const summary = summaries.get(managerId);
    if (!summary) {
      visited.delete(managerId);
      return ZERO_ROLLUP;
    }

    const directCounts = extractDirectCounts(summary);
    let accumulated = { ...directCounts };

    const kids = childrenMap.get(managerId) ?? [];
    for (const childId of kids) {
      const childRollup = visit(childId, visited);
      accumulated = addCounts(accumulated, childRollup);
    }

    // Floor with pipeline rollup: if pipeline has higher values (because
    // cai_direct* fields aren't fully populated), use those instead.
    const pipelineRollup = extractPipelineRollup(summary);
    accumulated = maxCounts(accumulated, pipelineRollup);

    const rollup: RollupCounts = { ...accumulated, directCounts };
    rollups.set(managerId, rollup);
    visited.delete(managerId);
    return rollup;
  };

  for (const managerId of summaries.keys()) {
    visit(managerId, visited);
  }

  return rollups;
}

/**
 * Compute the rollup for a single manager from the summary tree.
 * Useful when you only need one manager's rollup without computing all.
 */
export function computeTreeRollup(
  managerId: string,
  summaries: Map<string, IManagerSummary>,
  childrenMap: Map<string, string[]>,
): RollupCounts {
  const summary = summaries.get(managerId);
  if (!summary) return ZERO_ROLLUP;

  const directCounts = extractDirectCounts(summary);
  let accumulated = { ...directCounts };

  const visit = (id: string, visited: Set<string>): DirectCounts => {
    if (visited.has(id)) return ZERO_DIRECT;
    visited.add(id);

    const s = summaries.get(id);
    if (!s) return ZERO_DIRECT;

    let total = extractDirectCounts(s);
    for (const childId of childrenMap.get(id) ?? []) {
      total = addCounts(total, visit(childId, visited));
    }
    return total;
  };

  const visited = new Set([managerId]);
  for (const childId of childrenMap.get(managerId) ?? []) {
    accumulated = addCounts(accumulated, visit(childId, visited));
  }

  // Floor with pipeline rollup
  accumulated = maxCounts(accumulated, extractPipelineRollup(summary));

  return { ...accumulated, directCounts };
}

/** Get a rollup for a manager, returning zeros if not found. */
export function getRollup(
  rollups: Map<string, RollupCounts>,
  managerId: string | null | undefined,
): RollupCounts {
  if (!managerId) return ZERO_ROLLUP;
  return rollups.get(managerId) ?? ZERO_ROLLUP;
}
