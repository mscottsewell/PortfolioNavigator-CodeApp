/* ── Shared data context — services and periods loaded once, shared across tabs ── */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { IAllocationPeriod, IFunctionalTeam, IServiceOrInitiative } from '../types';
import { getAllocationPeriods, getFunctionalTeams, getServiceInitiatives } from '../api';
import { findCurrentPeriod, isPlaceholderService } from '../utils';
import type { ServiceHierarchyNode } from '../hooks/useServiceHierarchy';

export interface SharedDataContextValue {
  // Service hierarchy
  teams: IFunctionalTeam[];
  services: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  servicesLoading: boolean;
  servicesError: string | null;
  getTeamForService: (serviceId: string) => IFunctionalTeam | undefined;
  getAreaNameForService: (serviceId: string) => string | undefined;
  getAreaNameForTeam: (teamId: string) => string | undefined;
  /** IDs of the placeholder "No Service or Initiative Assigned" service(s) */
  placeholderServiceIds: Set<string>;

  // Allocation periods
  periods: IAllocationPeriod[];
  periodsLoading: boolean;
  periodsError: string | null;
  currentPeriodId: string | null;
}

const SharedDataContext = createContext<SharedDataContextValue | null>(null);

export function useSharedData(): SharedDataContextValue {
  const ctx = useContext(SharedDataContext);
  if (!ctx) throw new Error('useSharedData must be used within a SharedDataProvider');
  return ctx;
}

function buildHierarchy(teams: IFunctionalTeam[], services: IServiceOrInitiative[]): ServiceHierarchyNode[] {
  const servicesByTeam = new Map<string, IServiceOrInitiative[]>();
  for (const service of services) {
    const list = servicesByTeam.get(service._cai_area_value) ?? [];
    list.push(service);
    servicesByTeam.set(service._cai_area_value, list);
  }

  const grouped = new Map<string, ServiceHierarchyNode>();
  for (const team of teams) {
    const areaName = team.cai_missionsubcategory || 'Unassigned';
    const node = grouped.get(areaName) ?? { areaName, teams: [] };
    node.teams.push({
      team,
      services: [...(servicesByTeam.get(team.cai_areaid) ?? [])].sort((a, b) => a.cai_name.localeCompare(b.cai_name)),
    });
    grouped.set(areaName, node);
  }

  return Array.from(grouped.values())
    .map((node) => ({
      ...node,
      teams: node.teams.sort((left, right) => left.team.cai_areaname.localeCompare(right.team.cai_areaname)),
    }))
    .sort((left, right) => left.areaName.localeCompare(right.areaName));
}

export function SharedDataProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<IFunctionalTeam[]>([]);
  const [services, setServices] = useState<IServiceOrInitiative[]>([]);
  const [placeholderServiceIds, setPlaceholderServiceIds] = useState<Set<string>>(new Set());
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [periods, setPeriods] = useState<IAllocationPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState<string | null>(null);

  // Load services + teams once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedTeams, loadedServices] = await Promise.all([
          getFunctionalTeams(),
          getServiceInitiatives(),
        ]);
        if (!cancelled) {
          setTeams(loadedTeams);
          // Identify placeholder service IDs, then exclude from selectable list
          const phIds = new Set(
            loadedServices
              .filter((s) => isPlaceholderService(s.cai_name))
              .map((s) => s.cai_serviceorinitiativeid),
          );
          setPlaceholderServiceIds(phIds);
          setServices(loadedServices.filter((s) => !phIds.has(s.cai_serviceorinitiativeid)));
        }
      } catch (err) {
        if (!cancelled) setServicesError(err instanceof Error ? err.message : 'Failed to load services');
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load periods once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllocationPeriods();
        if (!cancelled) setPeriods(data);
      } catch (err) {
        if (!cancelled) setPeriodsError(err instanceof Error ? err.message : 'Failed to load periods');
      } finally {
        if (!cancelled) setPeriodsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hierarchy = useMemo(() => buildHierarchy(teams, services), [teams, services]);

  const teamMap = useMemo(() => {
    const map = new Map<string, IFunctionalTeam>();
    for (const team of teams) map.set(team.cai_areaid, team);
    return map;
  }, [teams]);

  const serviceToTeamMap = useMemo(() => {
    const map = new Map<string, IFunctionalTeam>();
    for (const service of services) {
      const team = teamMap.get(service._cai_area_value);
      if (team) map.set(service.cai_serviceorinitiativeid, team);
    }
    return map;
  }, [services, teamMap]);

  const getTeamForService = useCallback(
    (serviceId: string) => serviceToTeamMap.get(serviceId),
    [serviceToTeamMap],
  );

  const getAreaNameForTeam = useCallback(
    (teamId: string) => teamMap.get(teamId)?.cai_missionsubcategory,
    [teamMap],
  );

  const getAreaNameForService = useCallback(
    (serviceId: string) => getTeamForService(serviceId)?.cai_missionsubcategory,
    [getTeamForService],
  );

  const currentPeriodId = useMemo(
    () => findCurrentPeriod(periods)?.cai_allocationperiodid ?? null,
    [periods],
  );

  const value = useMemo<SharedDataContextValue>(
    () => ({
      teams,
      services,
      hierarchy,
      servicesLoading,
      servicesError,
      getTeamForService,
      getAreaNameForService,
      getAreaNameForTeam,
      placeholderServiceIds,
      periods,
      periodsLoading,
      periodsError,
      currentPeriodId,
    }),
    [
      teams, services, hierarchy, servicesLoading, servicesError,
      getTeamForService, getAreaNameForService, getAreaNameForTeam,
      placeholderServiceIds,
      periods, periodsLoading, periodsError, currentPeriodId,
    ],
  );

  return <SharedDataContext.Provider value={value}>{children}</SharedDataContext.Provider>;
}
