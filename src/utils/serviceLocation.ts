/* ── Service location lookup (service → area / team) ── */

import type { ServiceHierarchyNode } from '../hooks';

export interface ServiceLocation {
  areaName: string;
  teamName: string;
}

/** Build a Map from serviceId → { areaName, teamName } using the hierarchy. */
export function buildServiceLocationMap(
  hierarchy: ServiceHierarchyNode[],
): Map<string, ServiceLocation> {
  const map = new Map<string, ServiceLocation>();
  for (const node of hierarchy) {
    for (const teamNode of node.teams) {
      for (const service of teamNode.services) {
        map.set(service.cai_serviceorinitiativeid, {
          areaName: node.areaName,
          teamName: teamNode.team.cai_areaname,
        });
      }
    }
  }
  return map;
}
