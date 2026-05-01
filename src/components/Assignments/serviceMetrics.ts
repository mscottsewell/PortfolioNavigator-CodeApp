import type {
  IAssignment,
  IResource,
  IServiceInitiativeSummary,
  IServiceOrInitiative,
} from '../../types';

export interface ServiceEmployeeChip {
  resourceId: string;
  name: string;
  percentage: number;
}

export interface EffectiveServiceMetrics {
  id: string;
  name: string;
  employeeCount: number;
  totalPercentage: number;
  fte: string;
  employees: ServiceEmployeeChip[];
}

export function buildEffectiveServiceMetrics(
  serviceInitiatives: IServiceOrInitiative[],
  assignments: IAssignment[],
  resources: IResource[],
  serviceSummaries?: Map<string, IServiceInitiativeSummary>,
): EffectiveServiceMetrics[] {
  const serviceMap = new Map<string, IServiceOrInitiative>();
  for (const service of serviceInitiatives) {
    serviceMap.set(service.cai_serviceorinitiativeid, service);
  }

  const resourceMap = new Map<string, IResource>();
  for (const resource of resources) {
    resourceMap.set(resource.cai_resourceid, resource);
  }

  const assignmentsByService = new Map<string, IAssignment[]>();
  for (const assignment of assignments) {
    const serviceAssignments = assignmentsByService.get(assignment._cai_serviceorinitiativeid_value) ?? [];
    serviceAssignments.push(assignment);
    assignmentsByService.set(assignment._cai_serviceorinitiativeid_value, serviceAssignments);
  }

  const activeServiceIds = new Set<string>([
    ...assignmentsByService.keys(),
    ...(serviceSummaries?.keys() ?? []),
  ]);

  return Array.from(activeServiceIds)
    .map((serviceId): EffectiveServiceMetrics | null => {
      const service = serviceMap.get(serviceId);
      const summary = serviceSummaries?.get(serviceId);
      const serviceAssignments = (assignmentsByService.get(serviceId) ?? [])
        .slice()
        .sort((left, right) => right.cai_allocationpercentage - left.cai_allocationpercentage);

      const employees = serviceAssignments.map((assignment) => ({
        resourceId: assignment._cai_resourceid_value,
        name: resourceMap.get(assignment._cai_resourceid_value)?.cai_displayname ?? 'Unknown',
        percentage: assignment.cai_allocationpercentage,
      }));

      const localTotalPercentage = serviceAssignments.reduce((sum, assignment) => sum + assignment.cai_allocationpercentage, 0);
      const totalPercentage = summary && summary.cai_totalpercentage > 0
        ? summary.cai_totalpercentage
        : localTotalPercentage;
      const employeeCount = summary && summary.cai_employeecount > 0
        ? summary.cai_employeecount
        : employees.length;
      const fteValue = summary && summary.cai_fte > 0
        ? summary.cai_fte
        : totalPercentage / 100;
      const name = service?.cai_name
        ?? summary?._cai_serviceorinitiativeid_value_formatted
        ?? summary?.cai_name
        ?? serviceId;

      if (!service && !summary && employees.length === 0) {
        return null;
      }

      return {
        id: serviceId,
        name,
        employeeCount,
        totalPercentage,
        fte: fteValue.toFixed(1),
        employees,
      };
    })
    .filter((service): service is EffectiveServiceMetrics => service !== null)
    .sort((left, right) => (
      right.employeeCount - left.employeeCount
      || right.totalPercentage - left.totalPercentage
      || left.name.localeCompare(right.name)
    ));
}
