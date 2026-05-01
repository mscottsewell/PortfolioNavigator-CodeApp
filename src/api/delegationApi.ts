/* ── Delegation API ── */

import type { IDelegation } from '../types';
import { isXrmAvailable, getCurrentUserId } from './identity';
import { retrieveMultiple } from './powerAppsClient';
import { mockApi } from './mockData';
import { assertGuid } from '../utils/guid';

const delegationSelect = [
  'cai_delegationid',
  'cai_name',
  'cai_scopetype',
  '_cai_delegatorresourceid_value',
  '_ownerid_value',
].join(',');

/** Fetch active delegations where the given user is the owner. */
export async function getDelegationsForUser(userId: string): Promise<IDelegation[]> {
  if (!isXrmAvailable()) {
    return mockApi.getDelegationsForUser(userId);
  }

  return retrieveMultiple<IDelegation>(
    'cai_delegation',
    `?$select=${delegationSelect}&$filter=statecode eq 0 and _ownerid_value eq '${assertGuid(userId, 'userId')}'`,
  );
}

/** Fetch active delegations for the current logged-in user. */
export async function getDelegationsForCurrentUser(): Promise<IDelegation[]> {
  const userId = getCurrentUserId();
  return getDelegationsForUser(userId);
}

