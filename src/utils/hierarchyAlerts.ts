import type { IResource } from '../types';
import { dedupeResourcesById } from './resourceList';

export interface HierarchyAlertSummary {
  self: number;
  descendant: number;
  total: number;
}

const ZERO_ALERT_SUMMARY: HierarchyAlertSummary = {
  self: 0,
  descendant: 0,
  total: 0,
};

export function buildHierarchyAlertSummaries(
  resources: IResource[],
  subReportsByManager: Map<string, IResource[]>,
  invalidResourceIds: Set<string>,
): Map<string, HierarchyAlertSummary> {
  const summaries = new Map<string, HierarchyAlertSummary>();
  const uniqueResources = dedupeResourcesById(resources);
  const visited = new Set<string>();

  const visit = (resourceId: string): HierarchyAlertSummary => {
    const cached = summaries.get(resourceId);
    if (cached) {
      return cached;
    }

    const self = invalidResourceIds.has(resourceId) ? 1 : 0;
    if (visited.has(resourceId)) {
      const cycleSafeSummary = { self, descendant: 0, total: self };
      summaries.set(resourceId, cycleSafeSummary);
      return cycleSafeSummary;
    }

    visited.add(resourceId);

    let descendant = 0;
    const directReports = dedupeResourcesById(subReportsByManager.get(resourceId) ?? []);
    for (const report of directReports) {
      descendant += visit(report.cai_resourceid).total;
    }

    const summary = { self, descendant, total: self + descendant };
    summaries.set(resourceId, summary);
    visited.delete(resourceId);
    return summary;
  };

  for (const resource of uniqueResources) {
    visit(resource.cai_resourceid);
  }

  return summaries;
}

export function getHierarchyAlertSummary(
  summaries: Map<string, HierarchyAlertSummary>,
  resourceId: string | null | undefined,
): HierarchyAlertSummary {
  if (!resourceId) {
    return ZERO_ALERT_SUMMARY;
  }

  return summaries.get(resourceId) ?? ZERO_ALERT_SUMMARY;
}
