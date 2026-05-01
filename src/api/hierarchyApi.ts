/* ── Hierarchy API (Allocation Area string + Feature Teams) ── */

import type { IFunctionalTeam } from '../types';
import { isXrmAvailable } from './identity';
import { retrieveMultiple } from './powerAppsClient';
import { mockApi } from './mockData';

export async function getFunctionalTeams(): Promise<IFunctionalTeam[]> {
  if (!isXrmAvailable()) {
    return mockApi.getFunctionalTeams();
  }

  return retrieveMultiple<IFunctionalTeam>(
    'cai_area',
    '?$select=cai_areaid,cai_areaname,cai_missionsubcategory,cai_description,cai_mission,cai_mode&$filter=statecode eq 0&$orderby=cai_missionsubcategory asc,cai_areaname asc',
  );
}

