/* ── Service hierarchy hook — reads from SharedDataContext ── */

import type { IFunctionalTeam, IServiceOrInitiative } from '../types';
import { useSharedData } from '../contexts';

export interface ServiceHierarchyNode {
  areaName: string;
  teams: {
    team: IFunctionalTeam;
    services: IServiceOrInitiative[];
  }[];
}

export interface UseServiceHierarchyResult {
  teams: IFunctionalTeam[];
  services: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  loading: boolean;
  error: string | null;
  getTeamForService: (serviceId: string) => IFunctionalTeam | undefined;
  getAreaNameForService: (serviceId: string) => string | undefined;
  getAreaNameForTeam: (teamId: string) => string | undefined;
  placeholderServiceIds: Set<string>;
}

export function useServiceHierarchy(): UseServiceHierarchyResult {
  const shared = useSharedData();
  return {
    teams: shared.teams,
    services: shared.services,
    hierarchy: shared.hierarchy,
    loading: shared.servicesLoading,
    error: shared.servicesError,
    getTeamForService: shared.getTeamForService,
    getAreaNameForService: shared.getAreaNameForService,
    getAreaNameForTeam: shared.getAreaNameForTeam,
    placeholderServiceIds: shared.placeholderServiceIds,
  };
}
