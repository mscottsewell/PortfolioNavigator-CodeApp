/* ── Manager Summary read API for pre-calculated hierarchy counts ── */

import { retrieveMultiple } from './powerAppsClient';
import { isXrmAvailable } from './identity';
import { mockApi } from './mockData';
import { assertGuid } from '../utils/guid';
import type { IManagerSummary } from '../types';
import { ManagerSummaryType } from '../types';

const summarySelect = [
  'cai_managersummaryid',
  'cai_name',
  'cai_summarytype',
  '_cai_managerresourceid_value',
  '_cai_allocationperiodid_value',
  // Pipeline rollup fields
  'cai_totalemployees',
  'cai_alertcount',
  'cai_pendingcount',
  'cai_nottotalingcount',
  'cai_norecordscount',
  'cai_inactiveserviceemployeecount',
  'cai_inactiveservicerecordcount',
  // Direct-only count fields
  'cai_directtotalemployees',
  'cai_directalertcount',
  'cai_directpendingcount',
  'cai_directnottotalingcount',
  'cai_directnorecordscount',
  'cai_directinactiveserviceemployeecount',
  'cai_directinactiveservicerecordcount',
  // Parent-child tree link
  '_cai_parentsummaryid_value',
  'cai_lastcalculatedon',
].join(',');

/**
 * Fetch ALL active summary rows for a given type + period.
 * Used by the parent-child tree architecture to load the full summary tree.
 */
export async function getAllManagerSummaries(
  summaryType: number,
  periodId?: string | null,
): Promise<IManagerSummary[]> {
  if (!isXrmAvailable()) {
    return mockApi.getAllManagerSummaries?.(summaryType, periodId) ?? [];
  }

  let filter = `statecode eq 0 and cai_summarytype eq ${summaryType}`;
  if (periodId && summaryType === ManagerSummaryType.Allocation) {
    filter += ` and _cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}'`;
  }

  return retrieveMultiple<IManagerSummary>(
    'cai_managersummary',
    `?$select=${summarySelect}&$filter=${filter}`,
  );
}

