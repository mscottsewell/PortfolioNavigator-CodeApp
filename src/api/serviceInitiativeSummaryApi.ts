/* ── Service/Initiative Summary read API for pre-calculated per-service counts ── */

import { retrieveMultiple, retrieveMultipleChunked } from './powerAppsClient';
import { isXrmAvailable } from './identity';
import { assertGuid } from '../utils/guid';
import type { IServiceInitiativeSummary } from '../types';
import { ManagerSummaryType } from '../types';

const ENTITY_NAME = 'cai_serviceinitiativesummary';

const summarySelect = [
  'cai_serviceinitiativesummaryid',
  'cai_name',
  'cai_summarytype',
  '_cai_managerresourceid_value',
  '_cai_serviceorinitiativeid_value',
  '_cai_allocationperiodid_value',
  'cai_employeecount',
  'cai_totalpercentage',
  'cai_fte',
  'cai_lastcalculatedon',
].join(',');

/**
 * Fetch all SI summary rows for a manager (active only).
 */
export async function getServiceSummaries(
  managerResourceId: string,
  summaryType: number,
  periodId?: string | null,
): Promise<IServiceInitiativeSummary[]> {
  if (!isXrmAvailable()) return [];

  let filter = `statecode eq 0 and cai_summarytype eq ${summaryType} and _cai_managerresourceid_value eq '${assertGuid(managerResourceId, 'managerResourceId')}'`;
  if (periodId && summaryType === ManagerSummaryType.Allocation) {
    filter += ` and _cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}'`;
  }

  return retrieveMultiple<IServiceInitiativeSummary>(
    ENTITY_NAME,
    `?$select=${summarySelect}&$filter=${filter}`,
  );
}

export async function getServiceSummariesForManagers(
  managerResourceIds: string[],
  summaryType: number,
  periodId?: string | null,
  serviceId?: string,
): Promise<IServiceInitiativeSummary[]> {
  if (!isXrmAvailable() || managerResourceIds.length === 0) return [];

  const uniqueManagerIds = Array.from(new Set(managerResourceIds));

  let periodFilter = '';
  if (periodId && summaryType === ManagerSummaryType.Allocation) {
    periodFilter = ` and _cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}'`;
  }
  const serviceFilter = serviceId
    ? ` and _cai_serviceorinitiativeid_value eq '${assertGuid(serviceId, 'serviceId')}'`
    : '';

  return retrieveMultipleChunked<IServiceInitiativeSummary>(ENTITY_NAME, uniqueManagerIds, (chunk) => {
    const managerFilter = chunk
      .map((managerResourceId) => `_cai_managerresourceid_value eq '${assertGuid(managerResourceId, 'managerResourceId')}'`)
      .join(' or ');
    return `?$select=${summarySelect}&$filter=statecode eq 0 and cai_summarytype eq ${summaryType} and (${managerFilter})${periodFilter}${serviceFilter}`;
  });
}

/**
 * Fetch org-wide SI summary rows (no manager) — one per service for the given
 * summary type and period. Returns an empty array for Allocation queries when
 * no periodId is provided, since cross-period results are not meaningful.
 */
export async function getOrgWideServiceSummaries(
  summaryType: number,
  periodId?: string | null,
): Promise<IServiceInitiativeSummary[]> {
  if (!isXrmAvailable()) return [];
  if (summaryType === ManagerSummaryType.Allocation && !periodId) return [];

  let filter = `statecode eq 0 and cai_summarytype eq ${summaryType} and _cai_managerresourceid_value eq null`;
  if (periodId && summaryType === ManagerSummaryType.Allocation) {
    filter += ` and _cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}'`;
  }

  return retrieveMultiple<IServiceInitiativeSummary>(
    ENTITY_NAME,
    `?$select=${summarySelect}&$filter=${filter}`,
  );
}

