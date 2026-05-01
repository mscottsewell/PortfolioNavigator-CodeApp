/* ── Assignments Dashboard ── */

import { useMemo } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  makeStyles,
  tokens,
  Text,
  Badge,
  Link,
} from '@fluentui/react-components';
import {
  DataBarVertical20Regular,
} from '@fluentui/react-icons';
import type { IAssignment, IServiceOrInitiative, IResource, IServiceInitiativeSummary } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { formatCount } from '../../utils';
import { buildEffectiveServiceMetrics, type EffectiveServiceMetrics } from './serviceMetrics';

const MAX_CHIPS = 5;

function formatEmployeeChipLabel(name: string, percentage: number, abbreviated: boolean): string {
  if (!abbreviated) {
    return `${name} · ${percentage}%`;
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return `${percentage}%`;
  }

  const firstName = parts[0] ?? '';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  const shortName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
  return `${shortName} · ${percentage}%`;
}

const useStyles = makeStyles({
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  areaGroup: {
    marginTop: '4px',
  },
  areaTeamRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    padding: '8px 16px 0',
  },
  areaLabel: {
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    color: tokens.colorNeutralForeground1,
  },
  teamLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  row: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 16px 4px 40px',
    borderRadius: '6px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  rowBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.colorBrandBackground2,
    transition: 'width 0.4s ease',
    pointerEvents: 'none',
    zIndex: 0,
  },
  rowName: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    minWidth: 0,
  },
  rowStats: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  employeeChips: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '4px',
    marginTop: '4px',
    marginLeft: '12px',
    overflow: 'hidden',
    alignItems: 'center',
  },
  chipLink: {
    cursor: 'pointer',
    textDecorationLine: 'none',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    '&:hover > *': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorBrandStroke1,
    },
  },
  serviceNameLink: {
    cursor: 'pointer',
    textDecorationLine: 'none',
    fontWeight: 600,
    '&:hover': {
      textDecorationLine: 'underline',
      color: tokens.colorBrandForeground1,
    },
  },
});

interface AssignmentsDashboardProps {
  assignments: IAssignment[];
  resources: IResource[];
  serviceInitiatives: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  onSelectEmployee?: (resourceId: string) => void;
  onSelectService?: (serviceId: string) => void;
  serviceSummaries?: Map<string, IServiceInitiativeSummary>;
}

export function AssignmentsDashboard({
  assignments,
  resources,
  serviceInitiatives,
  hierarchy,
  onSelectEmployee,
  onSelectService,
  serviceSummaries,
}: AssignmentsDashboardProps) {
  const styles = useStyles();

  const chipLimit = MAX_CHIPS;
  const abbreviateChipLabels = false;

  const summaries = useMemo(
    () => buildEffectiveServiceMetrics(serviceInitiatives, assignments, resources, serviceSummaries),
    [serviceInitiatives, assignments, resources, serviceSummaries],
  );

  const groupedBreakdown = useMemo(() => {
    const summaryMap = new Map<string, EffectiveServiceMetrics>();
    for (const s of summaries) summaryMap.set(s.id, s);

    return hierarchy
      .map((areaNode) => ({
        areaName: areaNode.areaName,
        teams: areaNode.teams
          .map((teamNode) => ({
            teamName: teamNode.team.cai_areaname,
            services: teamNode.services
              .map((svc) => summaryMap.get(svc.cai_serviceorinitiativeid))
              .filter((s): s is EffectiveServiceMetrics => s !== undefined)
              .sort((a, b) => b.employeeCount - a.employeeCount || b.totalPercentage - a.totalPercentage),
          }))
          .filter((t) => t.services.length > 0),
      }))
      .filter((a) => a.teams.length > 0);
  }, [summaries, hierarchy]);

  const defaultOpenAreaItems = useMemo(
    () => groupedBreakdown.map((areaGroup) => `area-${areaGroup.areaName}`),
    [groupedBreakdown],
  );

  const maxPct = useMemo(
    () => Math.max(...summaries.map((s) => s.totalPercentage), 0),
    [summaries],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <DataBarVertical20Regular />
        <Text size={500} weight="semibold">
          Team Assignment Overview
        </Text>
      </div>

      <Text size={400} weight="semibold">Breakdown by Service</Text>
      <div className={styles.grid}>
        <Accordion multiple collapsible defaultOpenItems={defaultOpenAreaItems}>
          {groupedBreakdown.map((areaGroup) => (
            <AccordionItem key={areaGroup.areaName} value={`area-${areaGroup.areaName}`} className={styles.areaGroup}>
              <AccordionHeader size="large">
                <span className={styles.areaLabel}>{areaGroup.areaName}</span>
              </AccordionHeader>
              <AccordionPanel>
                <Accordion
                  multiple
                  collapsible
                  defaultOpenItems={areaGroup.teams.map((teamGroup) => `team-${areaGroup.areaName}-${teamGroup.teamName}`)}
                >
                  {areaGroup.teams.map((teamGroup) => (
                    <AccordionItem key={teamGroup.teamName} value={`team-${areaGroup.areaName}-${teamGroup.teamName}`}>
                      <AccordionHeader size="medium">
                        <span className={styles.teamLabel}>{teamGroup.teamName}</span>
                      </AccordionHeader>
                      <AccordionPanel>
                        {teamGroup.services.map((service) => {
                          const visibleEmployees = service.employees.slice(0, chipLimit);
                          const hiddenEmployees = service.employees.slice(chipLimit);
                          const hiddenFte = hiddenEmployees.reduce((sum, e) => sum + e.percentage, 0) / 100;
                          const hiddenFteLabel = hiddenFte % 1 === 0 ? hiddenFte.toFixed(0) : hiddenFte.toFixed(1);
                          return (
                            <div key={service.id} className={styles.row}>
                              <div
                                className={styles.rowBar}
                                style={{ width: `${maxPct > 0 ? (service.totalPercentage / maxPct) * 50 : 0}%` }}
                                aria-hidden="true"
                              />
                              <div className={styles.rowName}>
                                <Link
                                  className={styles.serviceNameLink}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onSelectService?.(service.id);
                                  }}
                                >
                                  {service.name}
                                </Link>
                                <div className={styles.employeeChips}>
                                  {visibleEmployees.map((emp) => (
                                    <Link
                                      key={`${service.id}-${emp.resourceId}`}
                                      className={styles.chipLink}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        onSelectEmployee?.(emp.resourceId);
                                      }}
                                    >
                                      <Badge appearance="tint" size="small" color="informative">
                                        {formatEmployeeChipLabel(emp.name, emp.percentage, abbreviateChipLabels)}
                                      </Badge>
                                    </Link>
                                  ))}
                                  {hiddenEmployees.length > 0 && (
                                    <Badge appearance="tint" size="small" color="subtle" style={{ flexShrink: 0 }}>
                                      +{hiddenFteLabel} more FTEs
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className={styles.rowStats}>
                                <Text size={200} style={{ color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' }}>
                                  {formatCount(service.employeeCount)} employee{service.employeeCount !== 1 ? 's' : ''} · {service.fte} FTEs
                                </Text>
                              </div>
                            </div>
                          );
                        })}
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
