/* ── Aggregate Dataverse queries for badge counts ── */

import { retrieveMultipleChunked } from './powerAppsClient';
import { isXrmAvailable } from './identity';
import { mockApi } from './mockData';
import { AllocationStatus } from '../types';
import { assertGuid } from '../utils/guid';
import { sumPercentages } from '../utils';

/**
 * Returns the number of distinct resources with at least one allocation
 * in "Pending Review" status for the given period.
 *
 * Fetches matching records with $filter/$select and counts distinct
 * resources client-side (Dataverse $apply doesn't reliably support
 * lookup virtual properties like `_cai_resourceid_value`).
 */
export async function getPendingAllocationResourceCount(
  periodId: string,
  resourceIds: string[],
): Promise<number> {
  if (resourceIds.length === 0) return 0;

  if (!isXrmAvailable()) {
    const allocations = await mockApi.getAllocations(periodId, resourceIds);
    const pending = new Set(
      allocations
        .filter((a) => a.cai_managerapprovalstatus === AllocationStatus.PendingReview)
        .map((a) => a._cai_resourceid_value),
    );
    return pending.size;
  }

  const results = await retrieveMultipleChunked<{ _cai_resourceid_value: string }>(
    'cai_allocation',
    resourceIds,
    (chunk) => {
      const resourceFilter = chunk
        .map((id) => `_cai_resourceid_value eq '${assertGuid(id, 'resourceId')}'`)
        .join(' or ');
      return `?$select=_cai_resourceid_value&$filter=statecode eq 0 and _cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}' and cai_managerapprovalstatus eq ${AllocationStatus.PendingReview} and (${resourceFilter})`;
    },
  );

  return new Set(results.map((r) => r._cai_resourceid_value)).size;
}

/**
 * Returns the number of resources whose assignment percentages don't sum to 100%.
 *
 * Fetches matching records with $filter/$select and aggregates
 * client-side (Dataverse $apply doesn't reliably support
 * lookup virtual properties like `_cai_resourceid_value`).
 */
export async function getAssignmentIssueResourceCount(
  resourceIds: string[],
): Promise<number> {
  if (resourceIds.length === 0) return 0;

  if (!isXrmAvailable()) {
    const assignments = await mockApi.getAssignments(resourceIds);
    const byResource = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const list = byResource.get(a._cai_resourceid_value) ?? [];
      list.push(a);
      byResource.set(a._cai_resourceid_value, list);
    }
    let issues = 0;
    for (const id of resourceIds) {
      const resourceAssignments = byResource.get(id);
      if (!resourceAssignments || sumPercentages(resourceAssignments) !== 100) {
        issues++;
      }
    }
    return issues;
  }

  const results = await retrieveMultipleChunked<{ _cai_resourceid_value: string; cai_allocationpercentage: number }>(
    'cai_assignment',
    resourceIds,
    (chunk) => {
      const resourceFilter = chunk
        .map((id) => `_cai_resourceid_value eq '${assertGuid(id, 'resourceId')}'`)
        .join(' or ');
      return `?$select=_cai_resourceid_value,cai_allocationpercentage&$filter=statecode eq 0 and (${resourceFilter})`;
    },
  );

  // Group by resource and sum percentages client-side
  const totals = new Map<string, number>();
  for (const r of results) {
    totals.set(r._cai_resourceid_value, (totals.get(r._cai_resourceid_value) ?? 0) + (r.cai_allocationpercentage ?? 0));
  }

  let issues = 0;
  for (const id of resourceIds) {
    const total = totals.get(id);
    if (total === undefined || total !== 100) issues++;
  }

  return issues;
}

