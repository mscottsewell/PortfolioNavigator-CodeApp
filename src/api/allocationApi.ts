/* ── Allocation API ── */

import type { IAllocation } from '../types';
import { AllocationStatus } from '../types';
import { isXrmAvailable, getClientUrl, getCurrentUserId } from './identity';
import { retrieveMultiple, updateRecord, createRecord, retrieveMultipleChunked } from './powerAppsClient';
import { delay, extractErrorMessage, extractErrorStatus, getRetryDelayMs, isRetryableDataverseError, isRetryableDataverseResponse } from './retryPolicy';
import { mockApi } from './mockData';
import { assertGuid } from '../utils/guid';
import { trackDataverseCall, trackEvent, trackException } from '../utils/telemetry';
import { ACTIVE_RECORD_STATE, INACTIVE_RECORD_STATE } from './entityState';

const allocationSelect = [
  'cai_allocationid',
  'cai_name',
  'cai_allocationpercentage',
  '_cai_allocationperiodid_value',
  '_cai_resourceid_value',
  '_cai_serviceorinitiativeid_value',
  '_cai_manager_systemuserid_value',
  '_cai_managerreviewcompletedbyid_value',
  'cai_managerapprovalstatus',
  'cai_employeename',
  'cai_alias',
].join(',');
const allocationLifecycleSelect = `${allocationSelect},cai_managerreviewdate,modifiedon`;

const CLEAR_RETRY_COUNT = 3;

interface IAllocationLifecycleRecord extends IAllocation {
  modifiedon?: string;
}

function buildAllocationPayload(
  data: Omit<IAllocation, 'cai_allocationid'>,
  userId: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    cai_allocationpercentage: data.cai_allocationpercentage,
    cai_managerapprovalstatus: data.cai_managerapprovalstatus,
    cai_managerreviewdate: data.cai_managerreviewdate ?? null,
    cai_employeename: data.cai_employeename,
    cai_alias: data.cai_alias,
    cai_name: data.cai_name,
    'cai_Resourceid@odata.bind': `/cai_resources(${data._cai_resourceid_value})`,
    'cai_ServiceorInitiativeId@odata.bind': `/cai_serviceorinitiatives(${data._cai_serviceorinitiativeid_value})`,
    'cai_AllocationPeriodId@odata.bind': `/cai_allocationperiods(${data._cai_allocationperiodid_value})`,
    'cai_Manager_SystemUserId@odata.bind': `/systemusers(${userId})`,
  };

  if (data._cai_managerreviewcompletedbyid_value) {
    payload['cai_ManagerReviewCompletedById@odata.bind'] =
      `/systemusers(${data._cai_managerreviewcompletedbyid_value})`;
  }

  return payload;
}

async function findMostRecentInactiveAllocation(
  periodId: string,
  resourceId: string,
  serviceOrInitiativeId: string,
): Promise<IAllocationLifecycleRecord | null> {
  const matches = await retrieveMultiple<IAllocationLifecycleRecord>(
    'cai_allocation',
    `?$select=${allocationLifecycleSelect}&$filter=statecode eq 1 and _cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}' and _cai_resourceid_value eq '${assertGuid(resourceId, 'resourceId')}' and _cai_serviceorinitiativeid_value eq '${assertGuid(serviceOrInitiativeId, 'serviceOrInitiativeId')}'&$orderby=modifiedon desc&$top=1`,
  );

  return matches[0] ?? null;
}

export async function getAllocations(
  periodId?: string,
  resourceIds?: string[],
): Promise<IAllocation[]> {
  if (!isXrmAvailable()) {
    return mockApi.getAllocations(periodId, resourceIds);
  }

  const filters: string[] = ['statecode eq 0'];
  if (periodId) {
    filters.push(`_cai_allocationperiodid_value eq '${assertGuid(periodId, 'periodId')}'`);
  }
  if (resourceIds && resourceIds.length > 0) {
    return retrieveMultipleChunked<IAllocation>('cai_allocation', resourceIds, (chunk) => {
      const resourceFilter = chunk.map((id) => `_cai_resourceid_value eq '${assertGuid(id, 'resourceId')}'`).join(' or ');
      const chunkFilters = [...filters, `(${resourceFilter})`];
      return `?$select=${allocationSelect}&$filter=${chunkFilters.join(' and ')}`;
    });
  }

  const options = `?$select=${allocationSelect}&$filter=${filters.join(' and ')}`;
  return retrieveMultiple<IAllocation>('cai_allocation', options);
}

export async function updateAllocation(
  id: string,
  data: Partial<Pick<IAllocation,
    'cai_allocationpercentage'
    | '_cai_serviceorinitiativeid_value'
    | 'cai_managerapprovalstatus'
    | 'cai_managerreviewdate'
    | '_cai_managerreviewcompletedbyid_value'
  >>,
): Promise<void> {
  if (!isXrmAvailable()) {
    return mockApi.updateAllocation(id, data);
  }

  const payload: Record<string, unknown> = {};
  if (data.cai_allocationpercentage !== undefined) {
    payload.cai_allocationpercentage = data.cai_allocationpercentage;
  }
  if (data._cai_serviceorinitiativeid_value) {
    payload['cai_ServiceorInitiativeId@odata.bind'] =
      `/cai_serviceorinitiatives(${data._cai_serviceorinitiativeid_value})`;
  }
  if (data.cai_managerapprovalstatus !== undefined) {
    payload.cai_managerapprovalstatus = data.cai_managerapprovalstatus;
  }
  if ('cai_managerreviewdate' in data) {
    payload.cai_managerreviewdate = data.cai_managerreviewdate ?? null;
  }
  if (data._cai_managerreviewcompletedbyid_value) {
    payload['cai_ManagerReviewCompletedById@odata.bind'] =
      `/systemusers(${data._cai_managerreviewcompletedbyid_value})`;
  }

  await updateRecord('cai_allocation', id, payload);
}

export async function clearAllocationReviewCompletedBy(id: string): Promise<void> {
  if (!isXrmAvailable()) {
    return;
  }

  const clientUrl = getClientUrl();
  if (!clientUrl) {
    throw new Error('Dataverse client URL unavailable');
  }

  const url = `${clientUrl}/api/data/v9.0/cai_allocations(${assertGuid(id, 'allocationId')})/cai_ManagerReviewCompletedById/$ref`;
  const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const getElapsedMs = () => {
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
    return Math.max(0, Math.round(now - startedAt));
  };

  for (let attempt = 0; attempt <= CLEAR_RETRY_COUNT; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
        },
        credentials: 'same-origin',
      });

      if (response.ok || response.status === 404) {
        trackDataverseCall({
          operation: 'clearAllocationReviewCompletedBy',
          entityLogicalName: 'cai_allocation',
          target: clientUrl,
          success: true,
          responseCode: response.status,
          durationMs: getElapsedMs(),
          properties: {
            attemptCount: attempt + 1,
            reviewerAlreadyCleared: response.status === 404,
          },
          measurements: {
            attemptCount: attempt + 1,
          },
        });
        return;
      }

      const errorText = await response.text();
      if (attempt < CLEAR_RETRY_COUNT && isRetryableDataverseResponse(response.status, errorText)) {
        const waitMs = getRetryDelayMs(attempt);
        trackEvent('DataverseRetry', {
          properties: {
            operation: 'clearAllocationReviewCompletedBy',
            entityLogicalName: 'cai_allocation',
            attemptNumber: attempt + 1,
            maxRetries: CLEAR_RETRY_COUNT,
            responseCode: response.status,
            errorMessage: errorText,
          },
          measurements: {
            retryDelayMs: waitMs,
          },
        });
        console.warn(`[PortfolioNav] clearAllocationReviewCompletedBy retrying (${attempt + 1}/${CLEAR_RETRY_COUNT}) after ${waitMs}ms — ${response.status} ${errorText}`);
        await delay(waitMs);
        continue;
      }

      const error = new Error(`Failed to clear allocation reviewer: ${response.status} ${errorText}`);
      trackDataverseCall({
        operation: 'clearAllocationReviewCompletedBy',
        entityLogicalName: 'cai_allocation',
        target: clientUrl,
        success: false,
        responseCode: response.status,
        durationMs: getElapsedMs(),
        properties: {
          attemptCount: attempt + 1,
        },
        measurements: {
          attemptCount: attempt + 1,
        },
      });
      trackException(error, {
        area: 'allocationApi',
        operation: 'clearAllocationReviewCompletedBy',
        allocationId: id,
        responseCode: response.status,
      });
      throw error;
    } catch (err) {
      if (attempt < CLEAR_RETRY_COUNT && isRetryableDataverseError(err)) {
        const message = extractErrorMessage(err);
        const waitMs = getRetryDelayMs(attempt);
        trackEvent('DataverseRetry', {
          properties: {
            operation: 'clearAllocationReviewCompletedBy',
            entityLogicalName: 'cai_allocation',
            attemptNumber: attempt + 1,
            maxRetries: CLEAR_RETRY_COUNT,
            errorMessage: message,
          },
          measurements: {
            retryDelayMs: waitMs,
          },
        });
        console.warn(`[PortfolioNav] clearAllocationReviewCompletedBy retrying (${attempt + 1}/${CLEAR_RETRY_COUNT}) after ${waitMs}ms — ${message}`);
        await delay(waitMs);
        continue;
      }
      const responseCode = extractErrorStatus(err);
      trackDataverseCall({
        operation: 'clearAllocationReviewCompletedBy',
        entityLogicalName: 'cai_allocation',
        target: clientUrl,
        success: false,
        responseCode,
        durationMs: getElapsedMs(),
        properties: {
          attemptCount: attempt + 1,
        },
        measurements: {
          attemptCount: attempt + 1,
        },
      });
      trackException(err, {
        area: 'allocationApi',
        operation: 'clearAllocationReviewCompletedBy',
        allocationId: id,
        responseCode: responseCode ?? 'unknown',
      });
      throw err;
    }
  }
}

function formatLocalDateOnly(date: Date): string {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000));
  return localDate.toISOString().slice(0, 10);
}

export async function approveAllocations(allocationIds: string[]): Promise<{ succeeded: string[]; failed: number }> {
  if (!isXrmAvailable()) {
    await mockApi.approveAllocations(allocationIds);
    return { succeeded: allocationIds, failed: 0 };
  }

  const userId = getCurrentUserId();
  // cai_managerreviewdate is a Date-Only field (Format: date) — send local YYYY-MM-DD only
  const today = formatLocalDateOnly(new Date());

  const succeeded: string[] = [];
  let failed = 0;
  // Approve sequentially to avoid deadlocks from AllocationTotalCheckerPlugin
  for (const id of allocationIds) {
    try {
      await updateRecord('cai_allocation', id, {
        cai_managerapprovalstatus: AllocationStatus.ReviewComplete,
        cai_managerreviewdate: today,
        'cai_ManagerReviewCompletedById@odata.bind': `/systemusers(${userId})`,
      });
      succeeded.push(id);
    } catch (err) {
      failed++;
      console.error(`[PortfolioNav] approve failed for allocation ${id}:`, err);
      // Stop on first failure — remaining items not attempted
      return { succeeded, failed: allocationIds.length - succeeded.length };
    }
  }

  return { succeeded, failed };
}

export async function createAllocation(
  data: Omit<IAllocation, 'cai_allocationid'>,
): Promise<IAllocation> {
  if (!isXrmAvailable()) {
    return mockApi.createAllocation(data);
  }

  const userId = getCurrentUserId();
  const payload = buildAllocationPayload(data, userId);
  const inactiveMatch = await findMostRecentInactiveAllocation(
    data._cai_allocationperiodid_value,
    data._cai_resourceid_value,
    data._cai_serviceorinitiativeid_value,
  );

  if (inactiveMatch) {
    await updateRecord('cai_allocation', inactiveMatch.cai_allocationid, {
      ...payload,
      ...ACTIVE_RECORD_STATE,
    });

    if (!data._cai_managerreviewcompletedbyid_value) {
      await clearAllocationReviewCompletedBy(inactiveMatch.cai_allocationid);
    }

    return { ...data, cai_allocationid: inactiveMatch.cai_allocationid };
  }

  const id = await createRecord('cai_allocation', payload);
  return { ...data, cai_allocationid: id } as IAllocation;
}

export async function deleteAllocation(id: string): Promise<void> {
  if (!isXrmAvailable()) {
    return mockApi.deleteAllocation(id);
  }
  await updateRecord('cai_allocation', id, {
    cai_allocationpercentage: 0,
    ...INACTIVE_RECORD_STATE,
  });
}

