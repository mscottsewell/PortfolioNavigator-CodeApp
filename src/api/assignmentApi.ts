/* ── Assignment API ── */

import type { IAssignment } from '../types';
import { isXrmAvailable } from './identity';
import { retrieveMultiple, createRecord, updateRecord, retrieveMultipleChunked } from './powerAppsClient';
import { mockApi } from './mockData';
import { assertGuid } from '../utils/guid';
import { ACTIVE_RECORD_STATE, INACTIVE_RECORD_STATE } from './entityState';

const assignmentSelect = [
  'cai_assignmentid',
  'cai_assignmentname',
  'cai_allocationpercentage',
  '_cai_resourceid_value',
  '_cai_serviceorinitiativeid_value',
  'cai_totalallocatedperuserperperiod',
].join(',');
const assignmentLifecycleSelect = `${assignmentSelect},modifiedon`;

interface IAssignmentLifecycleRecord extends IAssignment {
  modifiedon?: string;
}

function buildAssignmentPayload(
  data: Omit<IAssignment, 'cai_assignmentid'>,
): Record<string, unknown> {
  return {
    'cai_Resourceid@odata.bind': `/cai_resources(${data._cai_resourceid_value})`,
    'cai_ServiceorInitiativeId@odata.bind': `/cai_serviceorinitiatives(${data._cai_serviceorinitiativeid_value})`,
    cai_assignmentname: data.cai_assignmentname,
    cai_allocationpercentage: data.cai_allocationpercentage,
    cai_totalallocatedperuserperperiod: data.cai_totalallocatedperuserperperiod,
  };
}

async function findMostRecentInactiveAssignment(
  resourceId: string,
  serviceOrInitiativeId: string,
): Promise<IAssignmentLifecycleRecord | null> {
  const matches = await retrieveMultiple<IAssignmentLifecycleRecord>(
    'cai_assignment',
    `?$select=${assignmentLifecycleSelect}&$filter=statecode eq 1 and _cai_resourceid_value eq '${assertGuid(resourceId, 'resourceId')}' and _cai_serviceorinitiativeid_value eq '${assertGuid(serviceOrInitiativeId, 'serviceOrInitiativeId')}'&$orderby=modifiedon desc&$top=1`,
  );

  return matches[0] ?? null;
}

export async function getAssignments(resourceIds?: string[]): Promise<IAssignment[]> {
  if (!isXrmAvailable()) {
    return mockApi.getAssignments(resourceIds);
  }

  const filters: string[] = ['statecode eq 0'];
  if (resourceIds && resourceIds.length > 0) {
    return retrieveMultipleChunked<IAssignment>('cai_assignment', resourceIds, (chunk) => {
      const conditions = chunk.map((id) => `_cai_resourceid_value eq '${assertGuid(id, 'resourceId')}'`).join(' or ');
      const chunkFilters = [...filters, `(${conditions})`];
      return `?$select=${assignmentSelect}&$filter=${chunkFilters.join(' and ')}&$orderby=cai_assignmentname asc`;
    });
  }

  const query = `?$select=${assignmentSelect}&$filter=${filters.join(' and ')}&$orderby=cai_assignmentname asc`;
  return retrieveMultiple<IAssignment>('cai_assignment', query);
}

export async function createAssignment(
  data: Omit<IAssignment, 'cai_assignmentid'>,
): Promise<IAssignment> {
  if (!isXrmAvailable()) {
    return mockApi.createAssignment(data);
  }

  const payload = buildAssignmentPayload(data);
  const inactiveMatch = await findMostRecentInactiveAssignment(
    data._cai_resourceid_value,
    data._cai_serviceorinitiativeid_value,
  );

  if (inactiveMatch) {
    await updateRecord('cai_assignment', inactiveMatch.cai_assignmentid, {
      ...payload,
      ...ACTIVE_RECORD_STATE,
    });

    return { ...data, cai_assignmentid: inactiveMatch.cai_assignmentid };
  }

  const id = await createRecord('cai_assignment', payload);

  return { ...data, cai_assignmentid: id };
}

export async function updateAssignment(
  id: string,
  data: Partial<Pick<IAssignment, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value' | 'cai_totalallocatedperuserperperiod'>>,
): Promise<void> {
  if (!isXrmAvailable()) {
    return mockApi.updateAssignment(id, data);
  }

  const payload: Record<string, unknown> = {};
  if (data.cai_allocationpercentage !== undefined) {
    payload.cai_allocationpercentage = data.cai_allocationpercentage;
  }
  if (data._cai_serviceorinitiativeid_value) {
    payload['cai_ServiceorInitiativeId@odata.bind'] =
      `/cai_serviceorinitiatives(${data._cai_serviceorinitiativeid_value})`;
  }
  if (data.cai_totalallocatedperuserperperiod !== undefined) {
    payload.cai_totalallocatedperuserperperiod = data.cai_totalallocatedperuserperperiod;
  }

  await updateRecord('cai_assignment', id, payload);
}

export async function getAssignmentsByServiceId(serviceId: string): Promise<IAssignment[]> {
  if (!isXrmAvailable()) {
    const all = await mockApi.getAssignments();
    return all
      .filter((a) => a._cai_serviceorinitiativeid_value === serviceId)
      .sort((a, b) => b.cai_allocationpercentage - a.cai_allocationpercentage);
  }

  return retrieveMultiple<IAssignment>(
    'cai_assignment',
    `?$select=${assignmentSelect}&$filter=statecode eq 0 and _cai_serviceorinitiativeid_value eq '${assertGuid(serviceId, 'serviceId')}'&$orderby=cai_allocationpercentage desc`,
  );
}

export async function deleteAssignment(id: string): Promise<void> {
  if (!isXrmAvailable()) {
    return mockApi.deleteAssignment(id);
  }
  await updateRecord('cai_assignment', id, {
    cai_allocationpercentage: 0,
    cai_totalallocatedperuserperperiod: 0,
    ...INACTIVE_RECORD_STATE,
  });
}

