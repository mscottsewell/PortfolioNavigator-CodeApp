/* ── Group resources by their manager ── */

import type { IResource } from '../types';

const TEAM_MANAGER_KEY = '__team_manager__';

export interface ManagerGroup {
  managerId: string | null;
  managerName: string;
  isTeamManager: boolean;
  resources: IResource[];
}

/**
 * Groups resources by their manager, sorts alphabetically within groups,
 * and puts the "Team Manager" group (the current user / filtered manager) first.
 */
export function groupByManager(resources: IResource[]): ManagerGroup[] {
  const groups = new Map<string, ManagerGroup>();

  for (const person of resources) {
    const mgrId = person._cai_managerresourceid_value ?? TEAM_MANAGER_KEY;
    const mgrName = person._cai_managerresourceid_value_formatted ?? 'Team Manager';
    if (!groups.has(mgrId)) {
      groups.set(mgrId, {
        managerId: mgrId === TEAM_MANAGER_KEY ? null : mgrId,
        managerName: mgrId === TEAM_MANAGER_KEY ? 'Team Manager' : mgrName,
        isTeamManager: mgrId === TEAM_MANAGER_KEY,
        resources: [],
      });
    }
    groups.get(mgrId)!.resources.push(person);
  }

  for (const group of groups.values()) {
    group.resources.sort((a, b) => a.cai_displayname.localeCompare(b.cai_displayname));
  }

  // Team Manager group first, then alphabetical by manager name
  return [...groups.values()].sort((a, b) => {
    if (a.isTeamManager) return -1;
    if (b.isTeamManager) return 1;
    return a.managerName.localeCompare(b.managerName);
  });
}
