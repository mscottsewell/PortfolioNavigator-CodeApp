/* ── Service or Initiative API ── */

import type { IServiceOrInitiative } from '../types';
import { isXrmAvailable } from './identity';
import { retrieveMultiple } from './powerAppsClient';
import { mockApi } from './mockData';

const serviceSelect = [
  'cai_serviceorinitiativeid',
  'cai_name',
  'cai_description',
  '_cai_area_value',
  '_cai_parentserviceorinitiativeid_value',
  '_ownerid_value',
  '_cai_pmleadid_value',
  '_cai_pmbusinessmanagerid_value',
  '_cai_engleadid_value',
  '_cai_engbusinessmanagerid_value',
].join(',');

export async function getServiceInitiatives(): Promise<IServiceOrInitiative[]> {
  if (!isXrmAvailable()) {
    return mockApi.getServiceInitiatives();
  }

  return retrieveMultiple<IServiceOrInitiative>(
    'cai_serviceorinitiative',
    `?$select=${serviceSelect}&$filter=statecode eq 0&$orderby=cai_name asc`,
  );
}

