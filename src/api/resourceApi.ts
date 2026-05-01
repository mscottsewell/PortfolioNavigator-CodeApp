/* ── Resource API ── */

import type { IResource } from '../types';
import { isXrmAvailable } from './identity';
import { retrieveMultiple, retrieveMultipleChunked } from './powerAppsClient';
import { mockApi } from './mockData';
import { assertGuid } from '../utils/guid';

const resourceSelect = [
  'cai_resourceid',
  'cai_displayname',
  'cai_alias',
  '_cai_managerresourceid_value',
  '_cai_manageruserid_value',
  '_cai_userid_value',
].join(',');

export async function getCurrentResourceByUserId(userId: string): Promise<IResource | null> {
  if (!isXrmAvailable()) {
    return mockApi.getCurrentResourceByUserId(userId);
  }

  const resources = await retrieveMultiple<IResource>(
    'cai_resource',
    `?$select=${resourceSelect}&$filter=statecode eq 0 and _cai_userid_value eq '${assertGuid(userId, 'userId')}'&$top=1`,
  );

  return resources[0] ?? null;
}

export async function getDirectReports(managerResourceId: string): Promise<IResource[]> {
  if (!isXrmAvailable()) {
    return mockApi.getDirectReports(managerResourceId);
  }

  return retrieveMultiple<IResource>(
    'cai_resource',
    `?$select=${resourceSelect}&$filter=statecode eq 0 and _cai_managerresourceid_value eq '${assertGuid(managerResourceId, 'managerResourceId')}'&$orderby=cai_displayname asc`,
  );
}

export async function getHasDirectReports(managerResourceId: string): Promise<boolean> {
  if (!isXrmAvailable()) {
    const reports = await mockApi.getDirectReports(managerResourceId);
    return reports.length > 0;
  }

  const results = await retrieveMultiple<IResource>(
    'cai_resource',
    `?$select=cai_resourceid&$filter=statecode eq 0 and _cai_managerresourceid_value eq '${assertGuid(managerResourceId, 'managerResourceId')}'&$top=1`,
  );

  return results.length > 0;
}

/** Fetch direct reports for multiple managers in a single call (2nd-level reports). */
export async function getSubReports(managerResourceIds: string[]): Promise<IResource[]> {
  if (managerResourceIds.length === 0) return [];

  if (!isXrmAvailable()) {
    const results: IResource[] = [];
    for (const id of managerResourceIds) {
      const subs = await mockApi.getDirectReports(id);
      results.push(...subs);
    }
    return results;
  }

  return retrieveMultipleChunked<IResource>('cai_resource', managerResourceIds, (chunk) => {
    const orClauses = chunk
      .map((id) => `_cai_managerresourceid_value eq '${assertGuid(id, 'managerResourceId')}'`)
      .join(' or ');
    return `?$select=${resourceSelect}&$filter=statecode eq 0 and (${orClauses})&$orderby=cai_displayname asc`;
  });
}

/**
 * Search active resources by display name or alias.
 * If the term starts with '*', uses `contains`; otherwise uses `startswith`.
 * Returns up to `limit` matches, ordered by display name.
 */
export async function searchResources(term: string, limit: number = 30): Promise<IResource[]> {
  const trimmed = term.trim();
  if (trimmed.length === 0) return [];

  if (!isXrmAvailable()) {
    return mockApi.searchResources(trimmed);
  }

  // Escape single quotes in OData string
  const safe = trimmed.replace(/'/g, "''");
  const nameFilter = `contains(cai_displayname, '${safe}')`;
  const aliasFilter = `contains(cai_alias, '${safe}')`;

  return retrieveMultiple<IResource>(
    'cai_resource',
    `?$select=${resourceSelect}&$filter=statecode eq 0 and (${nameFilter} or ${aliasFilter})&$orderby=cai_displayname asc&$top=${limit}`,
  );
}

export async function getResourceById(resourceId: string): Promise<IResource | null> {
  if (!isXrmAvailable()) {
    return mockApi.getResourceById(resourceId);
  }

  const results = await retrieveMultiple<IResource>(
    'cai_resource',
    `?$select=${resourceSelect}&$filter=statecode eq 0 and cai_resourceid eq '${assertGuid(resourceId, 'resourceId')}'&$top=1`,
  );

  return results[0] ?? null;
}

export async function getResourcesByIds(resourceIds: string[]): Promise<IResource[]> {
  if (resourceIds.length === 0) return [];

  if (!isXrmAvailable()) {
    return mockApi.getResourcesByIds(resourceIds);
  }

  return retrieveMultipleChunked<IResource>('cai_resource', resourceIds, (chunk) => {
    const conditions = chunk.map((id) => `cai_resourceid eq '${assertGuid(id, 'resourceId')}'`).join(' or ');
    return `?$select=${resourceSelect}&$filter=statecode eq 0 and (${conditions})`;
  });
}

