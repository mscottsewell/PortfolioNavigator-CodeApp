/* -- Service Detail Panel -- shows team-scoped assignments for a service.
 * Summary-first: uses pre-calculated IServiceInitiativeSummary records for accurate totals and
 * manager-group breakdown in large orgs. Shows individual rows only when the loaded assignment
 * count exactly matches the pre-calculated total (small / fully-loaded teams).
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Divider,
  Link,
  Caption1,
  Button,
  Spinner,
} from '@fluentui/react-components';
import { ChevronRight16Regular, ChevronDown16Regular, ArrowRight16Regular, ChevronLeft16Regular } from '@fluentui/react-icons';
import type { IAssignment, IResource, IServiceInitiativeSummary, IServiceOrInitiative } from '../../types';
import { EmptyState, PercentageBar } from '../Shared';
import { getInitials, formatPercentage, formatCount } from '../../utils';

const EXPAND_ALL_THRESHOLD = 25;

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px 24px 16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontWeight: 700,
    fontSize: '18px',
    flexShrink: 0,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  ownerDri: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '1px',
    flexShrink: 0,
    paddingTop: '4px',
  },
  leadership: {
    padding: '0 24px 12px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 16px',
  },
  leadershipItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  description: {
    padding: '0 24px 12px',
    fontSize: '13px',
    lineHeight: '20px',
    color: tokens.colorNeutralForeground2,
  },
  summaryBar: {
    padding: '0 24px 16px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  sectionHeader: {
    padding: '16px 24px 8px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  sectionHeaderText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  groupList: {
    padding: '0 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  managerGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  managerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
  },
  managerChevron: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  managerMeta: {
    flex: 1,
    minWidth: 0,
  },
  managerStats: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  employeeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingLeft: '32px',
    paddingTop: '2px',
    paddingBottom: '8px',
  },
  summaryManagerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 12px',
    borderRadius: '8px',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  summaryManagerMeta: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  rowInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  rowBar: {
    width: '100%',
    maxWidth: '120px',
    flexShrink: 0,
  },
  pctBadge: {
    flexShrink: 0,
    minWidth: '45px',
    textAlign: 'right' as const,
  },
  nameLink: {
    cursor: 'pointer',
    textDecorationLine: 'none',
    fontWeight: 600,
    fontSize: tokens.fontSizeBase300,
    '&:hover': {
      textDecorationLine: 'underline',
    },
  },
  emptyState: {
    padding: '16px 24px 24px',
  },
  loadingState: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  subSectionLabel: {
    padding: '8px 24px 4px',
  },
});

interface ServiceDetailPanelProps {
  serviceInitiative: IServiceOrInitiative;
  /** Pre-calculated summary total for this service in the scoped manager's hierarchy. */
  scopedSummary?: IServiceInitiativeSummary;
  /** Per-direct-sub-manager service summaries for the selected service. */
  managerSummariesForService: Map<string, IServiceInitiativeSummary>;
  /** Whether manager summaries are still loading. */
  managerSummariesLoading?: boolean;
  /**
   * True once the scoped manager's service-summary query has completed (even if no record
   * was found). Prevents briefly showing individual mode while the summary is in-flight.
   */
  scopedSummaryLoaded?: boolean;
  /** Already-loaded assignments for the scoped team (may be partial for large orgs). */
  assignments: IAssignment[];
  /** Already-loaded resources for the scoped team (may be partial for large orgs). */
  resources: IResource[];
  /** Resource ID of the currently-scoped manager (used to identify direct IC reports). */
  scopedManagerId?: string;
  /** Display name of the currently-scoped manager, shown in the section header. */
  scopedManagerName?: string;
  /** Navigate to a sub-manager's scope (shown as "View team" in summary-mode rows). */
  onSelectManager?: (managerId: string) => void;
  onSelectEmployee?: (resourceId: string) => void;
  /** Label for the "back" navigation button (e.g. "Jay's team"). Only shown when provided. */
  backLabel?: string;
  /** Navigate to the parent manager's scope. */
  onGoBack?: () => void;
}

interface ManagerGroup {
  managerId: string;
  managerName: string;
  assignments: IAssignment[];
  totalPct: number;
}

const NO_MANAGER_ID = '__no_manager__';

export function ServiceDetailPanel({
  serviceInitiative,
  scopedSummary,
  managerSummariesForService,
  managerSummariesLoading = false,
  scopedSummaryLoaded = false,
  assignments,
  resources,
  scopedManagerId,
  scopedManagerName,
  onSelectManager,
  onSelectEmployee,
  backLabel,
  onGoBack,
}: ServiceDetailPanelProps) {
  const styles = useStyles();
  const [expandedManagerIds, setExpandedManagerIds] = useState<Set<string>>(new Set());
  const initializedServiceRef = useRef<string | null>(null);

  const resourcesById = useMemo(() => {
    const map = new Map<string, IResource>();
    for (const r of resources) {
      map.set(r.cai_resourceid, r);
    }
    return map;
  }, [resources]);

  const serviceAssignments = useMemo(
    () =>
      assignments
        .filter((a) => a._cai_serviceorinitiativeid_value === serviceInitiative.cai_serviceorinitiativeid)
        .sort((a, b) => b.cai_allocationpercentage - a.cai_allocationpercentage),
    [assignments, serviceInitiative.cai_serviceorinitiativeid],
  );

  // Distinct employee count guards against duplicate assignment rows
  const distinctLoadedCount = useMemo(
    () => new Set(serviceAssignments.map((a) => a._cai_resourceid_value)).size,
    [serviceAssignments],
  );

  // Individual mode is safe only once the summary has loaded AND the loaded distinct count
  // exactly matches the pre-calculated total. In all other cases use summary mode.
  const showIndividualMode =
    scopedSummaryLoaded &&
    (scopedSummary == null || distinctLoadedCount === scopedSummary.cai_employeecount);

  // -- Individual mode: groups by immediate manager -------------------------
  const groups = useMemo((): ManagerGroup[] => {
    if (!showIndividualMode) return [];
    const groupMap = new Map<string, ManagerGroup>();
    for (const assignment of serviceAssignments) {
      const resource = resourcesById.get(assignment._cai_resourceid_value);
      const managerId = resource?._cai_managerresourceid_value ?? NO_MANAGER_ID;
      const managerName = resource?._cai_managerresourceid_value_formatted ?? '\u2014';
      if (!groupMap.has(managerId)) {
        groupMap.set(managerId, { managerId, managerName, assignments: [], totalPct: 0 });
      }
      const group = groupMap.get(managerId)!;
      group.assignments.push(assignment);
      group.totalPct += assignment.cai_allocationpercentage;
    }
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.managerId === NO_MANAGER_ID) return 1;
      if (b.managerId === NO_MANAGER_ID) return -1;
      return a.managerName.localeCompare(b.managerName);
    });
  }, [showIndividualMode, serviceAssignments, resourcesById]);

  useEffect(() => {
    if (!showIndividualMode) return;
    const sid = serviceInitiative.cai_serviceorinitiativeid;
    if (initializedServiceRef.current === sid) return;
    initializedServiceRef.current = sid;
    if (serviceAssignments.length <= EXPAND_ALL_THRESHOLD) {
      setExpandedManagerIds(new Set(groups.map((g) => g.managerId)));
    } else {
      setExpandedManagerIds(new Set());
    }
  }, [showIndividualMode, serviceInitiative.cai_serviceorinitiativeid, serviceAssignments.length, groups]);

  const toggleManager = (managerId: string) => {
    setExpandedManagerIds((prev) => {
      const next = new Set(prev);
      if (next.has(managerId)) next.delete(managerId);
      else next.add(managerId);
      return next;
    });
  };

  // -- Summary mode: sub-manager rows + direct IC rows ----------------------
  const summaryGroups = useMemo(
    () =>
      Array.from(managerSummariesForService.entries())
        .map(([managerId, summary]) => ({
          managerId,
          managerName: summary._cai_managerresourceid_value_formatted ?? 'Unknown Manager',
          employeeCount: summary.cai_employeecount,
          fte: summary.cai_fte.toFixed(1),
        }))
        .sort((a, b) => a.managerName.localeCompare(b.managerName)),
    [managerSummariesForService],
  );

  // Direct IC assignments: employees who report immediately to the scoped manager.
  // Level-1 reports are always loaded, so these rows are always accurate.
  const directIcAssignments = useMemo(() => {
    if (showIndividualMode) return [];
    return serviceAssignments.filter((a) => {
      const resource = resourcesById.get(a._cai_resourceid_value);
      return resource?._cai_managerresourceid_value === scopedManagerId;
    });
  }, [showIndividualMode, serviceAssignments, resourcesById, scopedManagerId]);

  // -- Totals (header) -------------------------------------------------------
  const totalLoadedPct = useMemo(
    () => serviceAssignments.reduce((sum, a) => sum + a.cai_allocationpercentage, 0),
    [serviceAssignments],
  );

  const scopedEmployeeCount = scopedSummary?.cai_employeecount ?? serviceAssignments.length;
  const scopedFte =
    scopedSummary != null ? scopedSummary.cai_fte.toFixed(1) : (totalLoadedPct / 100).toFixed(1);

  // Percentage bar: always shows loaded assignments proportionally
  const barSegments = useMemo(
    () =>
      serviceAssignments.map((a) => ({
        percentage: a.cai_allocationpercentage,
        label:
          resourcesById.get(a._cai_resourceid_value)?.cai_displayname ??
          a._cai_resourceid_value_formatted ??
          'Unknown',
      })),
    [serviceAssignments, resourcesById],
  );

  // -- Service header info ---------------------------------------------------
  const abbr = serviceInitiative.cai_name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ownerDri = serviceInitiative._ownerid_value_formatted;
  const hierarchyLabel = serviceInitiative._cai_area_value_formatted ?? null;

  const leadershipGrid = useMemo(() => {
    const cells: Array<{ label: string; name?: string }> = [
      { label: 'Eng Lead', name: serviceInitiative._cai_engleadid_value_formatted },
      { label: 'PM Lead', name: serviceInitiative._cai_pmleadid_value_formatted },
      { label: 'Eng Business Mgr', name: serviceInitiative._cai_engbusinessmanagerid_value_formatted },
      { label: 'PM Business Mgr', name: serviceInitiative._cai_pmbusinessmanagerid_value_formatted },
    ];
    return cells.some((c) => c.name) ? cells : [];
  }, [serviceInitiative]);

  const hasBreakdownData = summaryGroups.length > 0 || directIcAssignments.length > 0;

  return (
    <div className={styles.container}>
      {/* -- Service header -- */}
      <div className={styles.header}>
        <div className={styles.icon}>{abbr}</div>
        <div className={styles.headerInfo}>
          <Text size={500} weight="semibold">
            {serviceInitiative.cai_name}
          </Text>
          {hierarchyLabel && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {hierarchyLabel}
            </Text>
          )}
        </div>
        {ownerDri && (
          <div className={styles.ownerDri}>
            <Text
              size={100}
              style={{ color: tokens.colorNeutralForeground3, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Owner / DRI
            </Text>
            <Text size={200} weight="semibold">
              {ownerDri}
            </Text>
          </div>
        )}
      </div>

      {leadershipGrid.length > 0 && (
        <div className={styles.leadership}>
          {leadershipGrid.map((cell) => (
            <div key={cell.label} className={styles.leadershipItem}>
              <Text
                size={100}
                style={{ color: tokens.colorNeutralForeground3, textTransform: 'uppercase', letterSpacing: '0.5px' }}
              >
                {cell.label}
              </Text>
              <Text
                size={200}
                weight="semibold"
                style={{ visibility: cell.name ? 'visible' : 'hidden' }}
              >
                {cell.name ?? '\u2014'}
              </Text>
            </div>
          ))}
        </div>
      )}

      {serviceInitiative.cai_description && (
        <div className={styles.description}>{serviceInitiative.cai_description}</div>
      )}

      {/* -- Summary bar (totals) -- */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryRow}>
          <Text size={300} weight="semibold">
            {`${formatCount(scopedEmployeeCount)} employee${scopedEmployeeCount !== 1 ? 's' : ''} \xb7 ${scopedFte} FTEs`}
          </Text>
        </div>
        <PercentageBar segments={barSegments} />
      </div>

      <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

      {/* -- People section -- */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderText}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <Text size={400} weight="semibold">People assigned</Text>
            {scopedManagerName && (
              <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
                {`\u2014 ${scopedManagerName}\u2019s Team`}
              </Text>
            )}
          </div>
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
            {showIndividualMode
              ? `${formatCount(groups.length)} manager group${groups.length !== 1 ? 's' : ''} \xb7 within current team scope`
              : 'Within current team scope \xb7 by direct manager group'}
          </Caption1>
        </div>
        {onGoBack && (
          <Button
            appearance="subtle"
            icon={<ChevronLeft16Regular />}
            onClick={onGoBack}
            size="small"
            style={{ flexShrink: 0, marginTop: '-4px' }}
          >
            {backLabel ?? 'Back'}
          </Button>
        )}
      </div>

      {/* == Individual mode == */}
      {showIndividualMode && (
        groups.length === 0 ? (
          <div className={styles.emptyState}>
            <EmptyState
              message="No one in this team is assigned to this service"
              description="Switch to the Employees view to assign someone."
            />
          </div>
        ) : (
          <div className={styles.groupList}>
            {groups.map((group) => {
              const isExpanded = expandedManagerIds.has(group.managerId);
              const groupFte = (group.totalPct / 100).toFixed(1);
              const groupCount = group.assignments.length;
              return (
                <div key={group.managerId} className={styles.managerGroup}>
                  <button
                    className={styles.managerHeader}
                    onClick={() => toggleManager(group.managerId)}
                  >
                    <span className={styles.managerChevron}>
                      {isExpanded ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
                    </span>
                    <div className={styles.managerMeta}>
                      <Text weight="semibold" truncate>
                        {group.managerId === NO_MANAGER_ID ? 'No Manager' : group.managerName}
                      </Text>
                    </div>
                    <Caption1 className={styles.managerStats}>
                      {`${formatCount(groupCount)} employee${groupCount !== 1 ? 's' : ''} \xb7 ${groupFte} FTEs`}
                    </Caption1>
                  </button>
                  {isExpanded && (
                    <div className={styles.employeeGroup}>
                      {group.assignments.map((assignment) => {
                        const resource = resourcesById.get(assignment._cai_resourceid_value);
                        const name =
                          resource?.cai_displayname ??
                          assignment._cai_resourceid_value_formatted ??
                          'Unknown';
                        const pct = assignment.cai_allocationpercentage;
                        return (
                          <div key={assignment.cai_assignmentid} className={styles.row}>
                            <Avatar name={name} initials={getInitials(name)} size={28} color="colorful" />
                            <div className={styles.rowInfo}>
                              <Link
                                className={styles.nameLink}
                                onClick={(e) => { e.preventDefault(); onSelectEmployee?.(assignment._cai_resourceid_value); }}
                              >
                                {name}
                              </Link>
                            </div>
                            <div className={styles.rowBar}>
                              <div style={{ height: 6, borderRadius: 3, backgroundColor: tokens.colorNeutralStroke2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 3, backgroundColor: tokens.colorBrandBackground }} />
                              </div>
                            </div>
                            <div className={styles.pctBadge}>
                              <Text size={300} weight="semibold">{formatPercentage(pct)}</Text>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* == Summary mode == */}
      {!showIndividualMode && (
        managerSummariesLoading && !hasBreakdownData ? (
          <div className={styles.loadingState}>
            <Spinner size="small" label="Loading breakdown..." />
          </div>
        ) : !hasBreakdownData ? (
          <div className={styles.emptyState}>
            {scopedEmployeeCount > 0 ? (
              <EmptyState
                message={`${formatCount(scopedEmployeeCount)} employee${scopedEmployeeCount !== 1 ? 's' : ''} assigned`}
                description="Navigate into a sub-manager's team to see individual assignments."
              />
            ) : (
              <EmptyState
                message="No one in this team is assigned to this service"
                description="Switch to the Employees view to assign someone."
              />
            )}
          </div>
        ) : (
          <>
            {summaryGroups.length > 0 && (
              <div className={styles.groupList}>
                {summaryGroups.map((group) => (
                  <div key={group.managerId} className={styles.summaryManagerRow}>
                    <div className={styles.summaryManagerMeta}>
                      <Text weight="semibold" truncate block>{group.managerName}</Text>
                      <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                        {`${formatCount(group.employeeCount)} employee${group.employeeCount !== 1 ? 's' : ''} \xb7 ${group.fte} FTEs`}
                      </Caption1>
                    </div>
                    {onSelectManager && (
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<ArrowRight16Regular />}
                        iconPosition="after"
                        onClick={() => onSelectManager(group.managerId)}
                      >
                        View team
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {directIcAssignments.length > 0 && (
              <>
                {summaryGroups.length > 0 && (
                  <div className={styles.subSectionLabel}>
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Direct reports</Caption1>
                  </div>
                )}
                <div className={styles.groupList} style={summaryGroups.length > 0 ? { paddingTop: 0 } : undefined}>
                  {directIcAssignments.map((assignment) => {
                    const resource = resourcesById.get(assignment._cai_resourceid_value);
                    const name =
                      resource?.cai_displayname ??
                      assignment._cai_resourceid_value_formatted ??
                      'Unknown';
                    const pct = assignment.cai_allocationpercentage;
                    return (
                      <div key={assignment.cai_assignmentid} className={styles.row}>
                        <Avatar name={name} initials={getInitials(name)} size={28} color="colorful" />
                        <div className={styles.rowInfo}>
                          <Link
                            className={styles.nameLink}
                            onClick={(e) => { e.preventDefault(); onSelectEmployee?.(assignment._cai_resourceid_value); }}
                          >
                            {name}
                          </Link>
                        </div>
                        <div className={styles.rowBar}>
                          <div style={{ height: 6, borderRadius: 3, backgroundColor: tokens.colorNeutralStroke2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 3, backgroundColor: tokens.colorBrandBackground }} />
                          </div>
                        </div>
                        <div className={styles.pctBadge}>
                          <Text size={300} weight="semibold">{formatPercentage(pct)}</Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
