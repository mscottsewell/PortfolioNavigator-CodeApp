/* ── Allocation Period API ── */

import type { IAllocationPeriod } from '../types';
import { isXrmAvailable } from './identity';
import { retrieveMultiple } from './powerAppsClient';
import { mockApi } from './mockData';

/**
 * Returns only the current period (last calendar month) and the 2 periods before it.
 * All records filtered to statecode eq 0 (active).
 */
export async function getAllocationPeriods(): Promise<IAllocationPeriod[]> {
  if (!isXrmAvailable()) {
    return mockApi.getAllocationPeriods();
  }

  // Show only the 2 most recently completed periods (start date before current month).
  // e.g. on May 1 this returns April and March.
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const currentMonthStartIso = currentMonthStart.toISOString().split('T')[0];

  return retrieveMultiple<IAllocationPeriod>(
    'cai_allocationperiod',
    `?$select=cai_allocationperiodid,cai_periodname,cai_allocationperiod_start,cai_allocationperiod_end,cai_iscurrentperiod,cai_fiscalyear&$filter=statecode eq 0 and cai_allocationperiod_start lt ${currentMonthStartIso}&$orderby=cai_allocationperiod_start desc&$top=2`,
  );
}

