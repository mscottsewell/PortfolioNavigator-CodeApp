/* ── Employee List Panel ── */

import { useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Text,
  ToggleButton,
  Spinner,
} from '@fluentui/react-components';
import {
  SearchRegular,
  ArrowUpRegular,
  PeopleTeamRegular,
  CheckboxCheckedRegular,
  People20Regular,
  Briefcase20Regular,
  Warning20Regular,
} from '@fluentui/react-icons';
import type { IResource, IAssignment, RollupCounts } from '../../types';
import {
  sumPercentages,
  buildHierarchyAlertSummaries,
  formatCount,
  getHierarchyAlertSummary,
  isPlaceholderService,
  type HierarchyAlertSummary,
} from '../../utils';
import { getRollup } from '../../utils/summaryTreeUtils';
import { LoadingSpinner, ErrorBanner, EmptyState } from '../Shared';
import { EmployeeCard } from './EmployeeCard';


const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    width: '520px',
    minWidth: '400px',
    flexShrink: 0,
  },
  viewToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px 0',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 16px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  managerSection: {
    marginBottom: '4px',
  },
  managerHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px 4px',
  },
  managerNavButton: {
    minWidth: 'auto',
    height: '24px',
    paddingLeft: '2px',
    paddingRight: '6px',
    borderRadius: '999px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: 600,
    columnGap: '2px',
    '&:hover': {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },
  managerLabel: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorBrandForeground1,
  },
  reportsLabel: {
    padding: '12px 16px 4px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorNeutralForeground3,
  },
  indentLevel1: {
    paddingLeft: '12px',
  },
  loadingTeam: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
});

interface EmployeeListProps {
  managerResource: IResource | null;
  resources: IResource[];
  subReportsByManager: Map<string, IResource[]>;
  subManagerIds: Set<string>;
  assignments: IAssignment[];
  loading: boolean;
  error: ReactNode | null;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  viewMode: 'employees' | 'services';
  onViewModeChange: (mode: 'employees' | 'services') => void;
  issuesFilter: boolean;
  onIssuesFilterChange: (active: boolean) => void;
  loadManagerTeam?: (managerId: string) => Promise<void>;
  loadedManagerIds?: Set<string>;
  loadingManagerId?: string | null;
  selectedManagerId: string;
  onSelectedManagerChange?: (managerId: string) => void;
  assignRollups?: Map<string, RollupCounts>;
  onSearchClick?: () => void;
  placeholderServiceIds?: Set<string>;
}

export function EmployeeList({
  managerResource,
  resources,
  subReportsByManager,
  subManagerIds,
  assignments,
  loading,
  error,
  selectedIds,
  onSelectionChange,
  viewMode,
  onViewModeChange,
  issuesFilter,
  onIssuesFilterChange,
  loadManagerTeam,
  loadedManagerIds = new Set(),
  loadingManagerId = null,
  selectedManagerId,
  onSelectedManagerChange,
  assignRollups,
  onSearchClick,
  placeholderServiceIds = new Set(),
}: EmployeeListProps) {
  const styles = useStyles();
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const assignmentsByResource = useMemo(() => {
    const map = new Map<string, IAssignment[]>();
    for (const assignment of assignments) {
      const list = map.get(assignment._cai_resourceid_value) ?? [];
      list.push(assignment);
      map.set(assignment._cai_resourceid_value, list);
    }
    return map;
  }, [assignments]);

  // Compute which resources have invalid totals (not 100%)
  const invalidResourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [resourceId, resourceAssignments] of assignmentsByResource) {
      const total = sumPercentages(resourceAssignments);
      if (total !== 100) ids.add(resourceId);
      // Flag resources with the placeholder "No Service or Initiative Assigned"
      if (resourceAssignments.some((a) =>
        placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) ||
        isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted)
      )) {
        ids.add(resourceId);
      }
    }
    // Also flag resources with zero assignments
    for (const person of [...resources, ...(managerResource ? [managerResource] : [])]) {
      if (!assignmentsByResource.has(person.cai_resourceid)) {
        ids.add(person.cai_resourceid);
      }
    }
    return ids;
  }, [assignmentsByResource, resources, managerResource, placeholderServiceIds]);

  // Direct reports only (level 1 — not sub-reports)
  const directReports = useMemo(() => {
    return resources.filter((r) => r._cai_managerresourceid_value === managerResource?.cai_resourceid);
  }, [resources, managerResource]);

  // All people for assignment validation (manager + all resources)
  const allPeople = useMemo(() => {
    const list = managerResource ? [managerResource, ...resources] : [...resources];
    const seen = new Set<string>();
    return list.filter((resource) => {
      if (seen.has(resource.cai_resourceid)) return false;
      seen.add(resource.cai_resourceid);
      return true;
    });
  }, [managerResource, resources]);

  const scopedPeople = useMemo(() => {
    let list: IResource[];

    if (selectedManagerId === '__direct_team__') {
      list = managerResource ? [managerResource, ...directReports] : [...directReports];
    } else if (subReportsByManager.has(selectedManagerId)) {
      const subManager = resources.find((resource) => resource.cai_resourceid === selectedManagerId);
      const subReports = subReportsByManager.get(selectedManagerId) ?? [];
      list = subManager ? [subManager, ...subReports] : [...subReports];
    } else {
      list = managerResource ? [managerResource, ...directReports] : [...directReports];
    }

    const seen = new Set<string>();
    return list.filter((resource) => {
      if (seen.has(resource.cai_resourceid)) return false;
      seen.add(resource.cai_resourceid);
      return true;
    });
  }, [directReports, managerResource, resources, selectedManagerId, subReportsByManager]);

  const scopedManager = useMemo(() => {
    if (selectedManagerId !== '__direct_team__') {
      return resources.find((resource) => resource.cai_resourceid === selectedManagerId) ?? null;
    }
    return managerResource;
  }, [managerResource, resources, selectedManagerId]);

  const scopedDirectReports = useMemo(() => {
    if (selectedManagerId !== '__direct_team__') {
      return subReportsByManager.get(selectedManagerId) ?? [];
    }
    return directReports;
  }, [directReports, selectedManagerId, subReportsByManager]);

  const parentManagerTarget = useMemo(() => {
    if (selectedManagerId === '__direct_team__') {
      return null;
    }

    const currentManager = resources.find((resource) => resource.cai_resourceid === selectedManagerId);
    const parentId = currentManager?._cai_managerresourceid_value;
    if (!parentId) {
      return '__direct_team__';
    }

    return parentId === managerResource?.cai_resourceid ? '__direct_team__' : parentId;
  }, [managerResource, resources, selectedManagerId]);

  const sortAlpha = (list: IResource[]) => {
    return [...list].sort((a, b) => a.cai_displayname.localeCompare(b.cai_displayname));
  };

  const totalCount = scopedPeople.length;

  const alertSummariesByResource = useMemo(
    () => buildHierarchyAlertSummaries(allPeople, subReportsByManager, invalidResourceIds),
    [allPeople, subReportsByManager, invalidResourceIds],
  );

  const getEffectiveAlertSummary = useCallback((resourceId: string): HierarchyAlertSummary => {
    const clientSummary = getHierarchyAlertSummary(alertSummariesByResource, resourceId);
    const rollup = assignRollups ? getRollup(assignRollups, resourceId) : null;
    if (rollup && (rollup.alertCount > 0 || rollup.totalEmployees > 0)) {
      return {
        self: clientSummary.self,
        descendant: Math.max(rollup.alertCount - clientSummary.self, 0),
        total: Math.max(rollup.alertCount, clientSummary.total),
      };
    }
    return clientSummary;
  }, [alertSummariesByResource, assignRollups]);

  const scopedAlertCount = useMemo(() => {
    const clientCount = scopedManager
      ? getEffectiveAlertSummary(scopedManager.cai_resourceid).total
      : scopedPeople.filter((resource) => invalidResourceIds.has(resource.cai_resourceid)).length;
    return clientCount;
  }, [getEffectiveAlertSummary, invalidResourceIds, scopedManager, scopedPeople]);

  const scopedAlertBranchIds = useMemo(() => {
    return new Set(
      scopedPeople
        .filter((resource) => getEffectiveAlertSummary(resource.cai_resourceid).total > 0)
        .map((resource) => resource.cai_resourceid),
    );
  }, [getEffectiveAlertSummary, scopedPeople]);

  /** Navigate to a manager's team view, loading on demand if needed */
  const handleNavigateToManager = useCallback(async (managerId: string) => {
    if (managerId === '__direct_team__') {
      onSelectedManagerChange?.(managerId);
      onSelectionChange(new Set());
      return;
    }
    if (loadManagerTeam && !loadedManagerIds.has(managerId)) {
      await loadManagerTeam(managerId);
    }
    onSelectedManagerChange?.(managerId);
    onSelectionChange(new Set());
  }, [loadManagerTeam, loadedManagerIds, onSelectedManagerChange, onSelectionChange]);

  const handleCardClick = (resourceId: string, allowNavigation = true) => {
    // If it's a manager and navigation is allowed and we're not in multi-select mode, navigate
    if (allowNavigation && !multiSelectMode && subManagerIds.has(resourceId)) {
      void handleNavigateToManager(resourceId);
      return;
    }
    if (multiSelectMode) {
      const next = new Set(selectedIds);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      onSelectionChange(next);
    } else {
      onSelectionChange(new Set([resourceId]));
    }
  };

  const handleCheckbox = (resourceId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(resourceId);
    } else {
      next.delete(resourceId);
    }
    onSelectionChange(next);
  };

  const toggleMultiSelect = () => {
    if (multiSelectMode) {
      const first = selectedIds.values().next().value;
      onSelectionChange(first ? new Set([first]) : new Set());
    }
    setMultiSelectMode(!multiSelectMode);
  };

  const renderCard = (
    resource: IResource,
    indent?: string,
    allowNavigation = true,
    hideAlertSummary = false,
  ) => (
    <div key={resource.cai_resourceid} className={indent}>
      <EmployeeCard
        resource={resource}
        assignments={assignmentsByResource.get(resource.cai_resourceid) ?? []}
        selected={selectedIds.has(resource.cai_resourceid)}
        multiSelectMode={multiSelectMode}
        isManager={subManagerIds.has(resource.cai_resourceid)}
        alertSummary={getEffectiveAlertSummary(resource.cai_resourceid)}
        hideAlertSummary={hideAlertSummary}
        onClick={() => handleCardClick(resource.cai_resourceid, allowNavigation)}
        onCheckboxChange={(checked) => handleCheckbox(resource.cai_resourceid, checked)}
      />
    </div>
  );

  if (loading) return <div className={styles.panel}><LoadingSpinner label="Loading team..." /></div>;
  if (error) return <div className={styles.panel}><ErrorBanner message={error} /></div>;
  if (!managerResource && resources.length === 0) return (
    <div className={styles.panel}>
      <EmptyState
        message="No direct reports found"
        description="No resources are assigned to you as their manager. Verify that resource records have the correct Manager lookup set."
      />
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.viewToggle}>
        <ToggleButton
          size="small"
          appearance={viewMode === 'employees' && !issuesFilter ? 'primary' : 'subtle'}
          icon={<People20Regular />}
          checked={viewMode === 'employees' && !issuesFilter}
          onClick={() => { onIssuesFilterChange(false); onViewModeChange('employees'); }}
        >
          Employees
        </ToggleButton>
        <ToggleButton
          size="small"
          appearance={viewMode === 'services' ? 'primary' : 'subtle'}
          icon={<Briefcase20Regular />}
          checked={viewMode === 'services'}
          onClick={() => { onIssuesFilterChange(false); onViewModeChange('services'); }}
        >
          Services & Initiatives
        </ToggleButton>
        {(issuesFilter || scopedAlertCount > 0) && (
          <ToggleButton
            size="small"
            appearance={issuesFilter ? 'primary' : 'subtle'}
            icon={<Warning20Regular />}
            checked={issuesFilter}
            onClick={() => {
              if (!issuesFilter) {
                onViewModeChange('employees');
              }
              onIssuesFilterChange(!issuesFilter);
            }}
            style={{
              color: issuesFilter ? undefined : tokens.colorPaletteRedForeground1,
              borderColor: issuesFilter ? undefined : tokens.colorPaletteRedBorder1,
              whiteSpace: 'nowrap',
            }}
          >
            ⚠️ Issues ({formatCount(scopedAlertCount)})
          </ToggleButton>
        )}
      </div>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text size={400} weight="semibold">
              <PeopleTeamRegular style={{ marginRight: 8 }} />
              {issuesFilter ? `Assignment Issues (${formatCount(scopedAlertCount)})` : `Team (${formatCount(totalCount)})`}
            </Text>
          </div>
          <ToggleButton
            size="small"
            appearance="subtle"
            checked={multiSelectMode}
            icon={<CheckboxCheckedRegular />}
            onClick={toggleMultiSelect}
          >
            Multi-select
          </ToggleButton>
          {onSearchClick && (
            <Button
              size="small"
              appearance="subtle"
              icon={<SearchRegular />}
              onClick={onSearchClick}
            >
              Find
            </Button>
          )}
        </div>
        {scopedAlertCount > 0 && (
          <div className={styles.alertSummary}>
            <Text size={200} weight="semibold" style={{ color: tokens.colorPaletteRedForeground1 }}>
              {formatCount(scopedAlertCount)} alert{scopedAlertCount === 1 ? '' : 's'} in this team
            </Text>
          </div>
        )}
      </div>
      <div className={styles.list}>
        {loadingManagerId && (
          <div className={styles.loadingTeam}>
            <Spinner size="small" label="Loading team..." />
          </div>
        )}
        {/* Hierarchy mode (normal or issues-filtered) */}
        <>
          {/* Manager (outdented at top — clicking selects, not navigates) */}
          {scopedManager && (!issuesFilter || scopedAlertCount > 0) && (
                <div className={styles.managerSection}>
                <div className={styles.managerHeaderRow}>
                  {parentManagerTarget && (
                    <Button
                      className={styles.managerNavButton}
                      size="small"
                      appearance="transparent"
                      icon={<ArrowUpRegular />}
                      onClick={() => void handleNavigateToManager(parentManagerTarget)}
                    >
                      Up
                    </Button>
                  )}
                  <div className={styles.managerLabel}>Manager</div>
                </div>
                {renderCard(scopedManager, undefined, false, true)}
              </div>
            )}

            {/* Direct reports */}
            {scopedDirectReports.length > 0 && (() => {
              const visibleDirectReports = issuesFilter
                ? sortAlpha(scopedDirectReports).filter((resource) =>
                    scopedAlertBranchIds.has(resource.cai_resourceid))
                : sortAlpha(scopedDirectReports);

              return visibleDirectReports.length > 0 && (
                <>
                  <div className={styles.reportsLabel}>
                    Direct Reports ({visibleDirectReports.length})
                  </div>
                  {visibleDirectReports.map((resource) => (
                    <div key={resource.cai_resourceid} className={styles.indentLevel1}>
                      {renderCard(resource)}
                    </div>
                  ))}
                </>
              );
            })()}
          </>
        </div>
    </div>
  );
}
