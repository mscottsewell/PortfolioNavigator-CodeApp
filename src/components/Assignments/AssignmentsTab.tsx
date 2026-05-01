/* ── Assignments Tab (container) ── */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { makeStyles, Spinner, tokens } from '@fluentui/react-components';
import type { IResource, IAssignment, RollupCounts } from '../../types';
import { useAssignments, useServiceHierarchy } from '../../hooks';
import {
  dedupeResourcesById,
  sumPercentages,
  buildHierarchyAlertSummaries,
  getHierarchyAlertSummary,
} from '../../utils';
import { getRollup } from '../../utils/summaryTreeUtils';
import {
  useServiceSummaryMap,
  useServiceSummariesByManager,
} from '../../hooks/useServiceSummaries';
import { ManagerSummaryType } from '../../types';
import { EmployeeList } from './EmployeeList';
import { AssignmentEditor, type AssignmentChange } from './AssignmentEditor';
import { BulkEditPanel } from './BulkEditPanel';
import { ServiceInitiativeList } from './ServiceInitiativeList';
import { ServiceDetailPanel } from './ServiceDetailPanel';
import { AssignmentsDashboard } from './AssignmentsDashboard';
import { EmployeeOverview } from './EmployeeOverview';
import type { ManagerAlertStatus } from './ManagerAlertChips';
import * as api from '../../api';
import { useToast } from '../Shared/Toast';
import { EmployeeSearchDialog } from '../Shared';
import type { EmployeeSearchResult } from '../Shared';

type ListViewMode = 'employees' | 'services';

const useStyles = makeStyles({
  outerContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  rightPanelLoading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface AssignmentsTabProps {
  managerResource: IResource | null;
  resources: IResource[];
  subReportsByManager: Map<string, IResource[]>;
  subManagerIds: Set<string>;
  resourcesLoading: boolean;
  resourcesError: ReactNode | null;
  onAssignmentChange?: () => void;
  loadManagerTeam?: (managerId: string) => Promise<void>;
  loadedManagerIds?: Set<string>;
  loadingManagerId?: string | null;
  selectedManagerId?: string;
  onSelectedManagerChange?: (managerId: string) => void;
  onManagerAlertStatusesChange?: (statuses: ManagerAlertStatus[]) => void;
  assignRollups?: Map<string, RollupCounts>;
  /** Initial list-view mode (from URL hash). Defaults to 'employees'. */
  initialViewMode?: ListViewMode;
  /** Initial selected service/initiative ID (from URL hash). Only applied when initialViewMode='services'. */
  initialServiceId?: string;
  /** Called when viewMode or selectedSIId changes, so the caller can sync the URL hash. */
  onViewChange?: (viewMode: ListViewMode, serviceId: string | null) => void;
}

export function AssignmentsTab({
  managerResource,
  resources,
  subReportsByManager,
  subManagerIds,
  resourcesLoading,
  resourcesError,
  onAssignmentChange,
  loadManagerTeam,
  loadedManagerIds,
  loadingManagerId,
  selectedManagerId = '__direct_team__',
  onSelectedManagerChange,
  onManagerAlertStatusesChange,
  assignRollups,
  initialViewMode,
  initialServiceId,
  onViewChange,
}: AssignmentsTabProps) {
  const styles = useStyles();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ListViewMode>(() => initialViewMode ?? 'employees');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [selectedSIId, setSelectedSIId] = useState<string | null>(() => (initialViewMode === 'services' ? (initialServiceId ?? null) : null));
  const [issuesFilter, setIssuesFilter] = useState(false);
  const [rightPanelReady, setRightPanelReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Remove eager loading from this file — useEffect deleted.
  // (Eager-loading sub-manager teams is infeasible for large orgs; use summary-first instead.)

  const allPeople = useMemo(
    () => dedupeResourcesById(managerResource ? [managerResource, ...resources] : resources),
    [resources, managerResource],
  );

  // Full subtree of the scoped manager (for overview counts and right panels)
  const scopedSubtreePeople = useMemo(() => {
    const rootId = selectedManagerId === '__direct_team__'
      ? managerResource?.cai_resourceid
      : selectedManagerId;
    if (!rootId) return allPeople;

    const collected = new Set<string>();
    const walk = (id: string) => {
      if (collected.has(id)) return;
      collected.add(id);
      for (const report of subReportsByManager.get(id) ?? []) {
        walk(report.cai_resourceid);
      }
    };
    walk(rootId);
    return allPeople.filter((p) => collected.has(p.cai_resourceid));
  }, [allPeople, managerResource, selectedManagerId, subReportsByManager]);

  const allResourceIds= useMemo(() => {
    return allPeople.map((resource) => resource.cai_resourceid);
  }, [allPeople]);
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    addAssignment: rawAddAssignment,
    updateMultipleAssignments,
    removeAssignment: rawRemoveAssignment,
    refetch,
  } = useAssignments(allResourceIds);
  const leftPaneReady = !resourcesLoading && !assignmentsLoading;
  const { services: serviceInitiatives, hierarchy, placeholderServiceIds } = useServiceHierarchy();

  // Validate initial service ID: if the hash-supplied service doesn't exist in loaded
  // services, clear it and revert to the employees view.
  const initialServiceValidatedRef = useRef(false);
  useEffect(() => {
    if (initialServiceValidatedRef.current || serviceInitiatives.length === 0) return;
    initialServiceValidatedRef.current = true;
    if (initialServiceId && viewMode === 'services') {
      const exists = serviceInitiatives.some((s) => s.cai_serviceorinitiativeid === initialServiceId);
      if (!exists) {
        setViewMode('employees');
        setSelectedSIId(null);
      }
    }
  }, [initialServiceId, serviceInitiatives, viewMode]);

  // Notify parent of view/service changes for URL hash sync. Skip initial render.
  const isFirstViewRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstViewRenderRef.current) {
      isFirstViewRenderRef.current = false;
      return;
    }
    onViewChange?.(viewMode, selectedSIId);
  }, [viewMode, selectedSIId, onViewChange]);

  // Pre-calculated service summaries for the scoped manager
  const scopedManagerId = selectedManagerId === '__direct_team__'
    ? managerResource?.cai_resourceid
    : selectedManagerId;

  const scopedManagerName = useMemo(() => {
    if (selectedManagerId === '__direct_team__') return managerResource?.cai_displayname;
    return resources.find((r) => r.cai_resourceid === scopedManagerId)?.cai_displayname;
  }, [selectedManagerId, scopedManagerId, resources, managerResource]);
  const [svcSummaryRefreshKey] = useState(0);
  const { summaries: serviceSummaries, loading: serviceSummariesLoading } = useServiceSummaryMap(
    rightPanelReady ? scopedManagerId : undefined,
    ManagerSummaryType.Assignment,
    null,
    svcSummaryRefreshKey,
  );

  // Direct sub-manager IDs used to fetch per-sub-manager service summaries.
  // All direct reports are included (not just known managers) so newly discovered
  // managers whose subManagerIds entry hasn't propagated yet are still queried.
  const scopedDirectSubManagerIds = useMemo(
    () =>
      scopedManagerId
        ? (subReportsByManager.get(scopedManagerId) ?? []).map((r) => r.cai_resourceid)
        : [],
    [scopedManagerId, subReportsByManager],
  );

  const { summariesByManager: managerSummariesForService, loading: managerSummariesLoading } =
    useServiceSummariesByManager(
      scopedDirectSubManagerIds,
      ManagerSummaryType.Assignment,
      null,
      viewMode === 'services' ? (selectedSIId ?? undefined) : undefined,
      svcSummaryRefreshKey,
    );

  // Parent manager context: used by ServiceDetailPanel to show a "back" button when
  // the user has drilled into a sub-manager's scope via "View Team".
  const parentManagerEntry = useMemo(() => {
    if (!scopedManagerId || selectedManagerId === '__direct_team__') return null;
    const scopedResource = resources.find((r) => r.cai_resourceid === scopedManagerId);
    if (!scopedResource?._cai_managerresourceid_value) return null;
    const parentId = scopedResource._cai_managerresourceid_value;
    if (parentId === managerResource?.cai_resourceid) {
      return { id: '__direct_team__', name: managerResource.cai_displayname };
    }
    const parentResource = resources.find((r) => r.cai_resourceid === parentId);
    return parentResource ? { id: parentId, name: parentResource.cai_displayname } : null;
  }, [scopedManagerId, selectedManagerId, resources, managerResource]);

  const handleGoBack = useCallback(() => {
    if (!parentManagerEntry) return;
    onSelectedManagerChange?.(parentManagerEntry.id);
  }, [parentManagerEntry, onSelectedManagerChange]);
  const addAssignment = useCallback(
    async (resourceId: string, serviceId: string, percentage: number) => {
      await rawAddAssignment(resourceId, serviceId, percentage);
      onAssignmentChange?.();
    },
    [rawAddAssignment, onAssignmentChange],
  );

  const removeAssignment = useCallback(
    async (id: string) => {
      await rawRemoveAssignment(id);
      onAssignmentChange?.();
    },
    [rawRemoveAssignment, onAssignmentChange],
  );

  const invalidResourceIds = useMemo(() => {
    const assignmentsByResource = new Map<string, IAssignment[]>();
    for (const a of assignments) {
      const list = assignmentsByResource.get(a._cai_resourceid_value) ?? [];
      list.push(a);
      assignmentsByResource.set(a._cai_resourceid_value, list);
    }
    const ids = new Set<string>();
    for (const person of allPeople) {
      const personAssignments = assignmentsByResource.get(person.cai_resourceid);
      if (!personAssignments || sumPercentages(personAssignments) !== 100) {
        ids.add(person.cai_resourceid);
      }
    }
    return ids;
  }, [assignments, allPeople]);

  const invalidCount = invalidResourceIds.size;

  const managerAlertSummaries = useMemo(
    () => buildHierarchyAlertSummaries(allPeople, subReportsByManager, invalidResourceIds),
    [allPeople, subReportsByManager, invalidResourceIds],
  );

  const getEffectiveManagerAlertCount = useCallback((managerId: string): number => {
    const clientAlerts = getHierarchyAlertSummary(managerAlertSummaries, managerId).total;
    if (assignRollups) {
      const rollup = getRollup(assignRollups, managerId);
      if (rollup.alertCount > 0) {
        return Math.max(rollup.alertCount, clientAlerts);
      }
    }
    return clientAlerts;
  }, [assignRollups, managerAlertSummaries]);

  const scopedIssueCount = useMemo(() => {
    const scopedId = selectedManagerId === '__direct_team__'
      ? managerResource?.cai_resourceid
      : selectedManagerId;
    if (!scopedId) return invalidCount;
    return getEffectiveManagerAlertCount(scopedId);
  }, [getEffectiveManagerAlertCount, invalidCount, managerResource, selectedManagerId]);

  const managerAlertCountsById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const resource of resources) {
      if (!subManagerIds.has(resource.cai_resourceid)) continue;
      const alerts = getEffectiveManagerAlertCount(resource.cai_resourceid);
      if (alerts > 0) {
        counts.set(resource.cai_resourceid, alerts);
      }
    }
    return counts;
  }, [getEffectiveManagerAlertCount, resources, subManagerIds]);

  const managerAlertStatuses = useMemo<ManagerAlertStatus[]>(() => {
    // Show only direct-report managers of the currently-scoped manager,
    // with alert counts from tree rollups (accurate) or client-side (fallback).
    const scopedId = selectedManagerId === '__direct_team__'
      ? managerResource?.cai_resourceid
      : selectedManagerId;
    if (!scopedId || subManagerIds.size === 0) return [];

    const directReportMgrs = resources.filter(
      (r) => r._cai_managerresourceid_value === scopedId && subManagerIds.has(r.cai_resourceid),
    );

    return directReportMgrs
      .map((mgr) => {
        const alerts = getEffectiveManagerAlertCount(mgr.cai_resourceid);
        if (alerts === 0) return null;
        return { id: mgr.cai_resourceid, name: mgr.cai_displayname, alerts };
      })
      .filter((status): status is NonNullable<typeof status> => status !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getEffectiveManagerAlertCount, managerResource, resources, selectedManagerId, subManagerIds]);

  useEffect(() => {
    onManagerAlertStatusesChange?.(managerAlertStatuses);
  }, [managerAlertStatuses, onManagerAlertStatusesChange]);

  useEffect(() => {
    if (!leftPaneReady) {
      setRightPanelReady(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setRightPanelReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [leftPaneReady, selectedManagerId, viewMode, issuesFilter]);

  const handleViewChange = (mode: ListViewMode) => {
    if (mode !== viewMode) {
      setSelectedEmployeeIds(new Set());
      setSelectedSIId(null);
      setViewMode(mode);
    } else {
      setSelectedEmployeeIds(new Set());
      setSelectedSIId(null);
    }
  };

  const handleIssuesFilterChange = (active: boolean) => {
    setIssuesFilter(active);
    if (active) {
      setSelectedEmployeeIds(new Set());
      setSelectedSIId(null);
    }
  };

  const handleSelectManagerAlerts = useCallback((managerId: string) => {
    setViewMode('employees');
    setIssuesFilter(true);
    setSelectedEmployeeIds(new Set());
    setSelectedSIId(null);
    const newId = selectedManagerId === managerId ? '__direct_team__' : managerId;
    onSelectedManagerChange?.(newId);
  }, [selectedManagerId, onSelectedManagerChange]);

  // Navigate to a sub-manager's scope from the ServiceDetailPanel summary rows.
  const handleSelectSubManager = useCallback(
    async (managerId: string) => {
      if (loadManagerTeam && !loadedManagerIds?.has(managerId)) {
        await loadManagerTeam(managerId);
      }
      onSelectedManagerChange?.(managerId);
    },
    [loadManagerTeam, loadedManagerIds, onSelectedManagerChange],
  );

  const handleSearchResult = useCallback(
    async (result: EmployeeSearchResult) => {
      const targetManagerId = result.navigateToManagerId;
      if (targetManagerId !== '__direct_team__' && loadManagerTeam && !loadedManagerIds?.has(targetManagerId)) {
        await loadManagerTeam(targetManagerId);
      }

      onSelectedManagerChange?.(targetManagerId);
      setViewMode('employees');
      setIssuesFilter(false);
      setSelectedSIId(null);

      if (result.highlightResourceId) {
        setSelectedEmployeeIds(new Set([result.highlightResourceId]));
      } else {
        setSelectedEmployeeIds(new Set());
      }
    },
    [loadManagerTeam, loadedManagerIds, onSelectedManagerChange],
  );

  const selectedResources = useMemo(
    () => allPeople.filter((resource) => selectedEmployeeIds.has(resource.cai_resourceid)),
    [allPeople, selectedEmployeeIds],
  );

  const selectedAssignments = useMemo(
    () => assignments.filter((assignment) => selectedEmployeeIds.has(assignment._cai_resourceid_value)),
    [assignments, selectedEmployeeIds],
  );

  const handleSave = useCallback(
    async (changes: AssignmentChange[]) => {
      await updateMultipleAssignments(
        changes.map(({ assignmentId, data }) => ({ id: assignmentId, data })),
      );
      onAssignmentChange?.();
    },
    [updateMultipleAssignments, onAssignmentChange],
  );

  const handleBulkAdd = useCallback(
    async (resourceIds: string[], serviceId: string, percentage: number) => {
      // Skip employees who already have this service assigned to prevent duplicates
      const alreadyAssigned = new Set(
        assignments
          .filter((a) => a._cai_serviceorinitiativeid_value === serviceId)
          .map((a) => a._cai_resourceid_value),
      );
      const toAdd = resourceIds.filter((id) => !alreadyAssigned.has(id));
      if (toAdd.length === 0) {
        showToast('error', 'All selected employees already have this service assigned');
        return;
      }
      const skipped = resourceIds.length - toAdd.length;
      for (const resourceId of toAdd) {
        await addAssignment(resourceId, serviceId, percentage);
      }
      await refetch();
      onAssignmentChange?.();
      if (skipped > 0) {
        showToast('success', `Added to ${toAdd.length} employee(s); ${skipped} already had it`);
      }
    },
    [addAssignment, assignments, refetch, showToast, onAssignmentChange],
  );

  const handleBulkRemove = useCallback(
    async (resourceIds: string[], serviceId: string) => {
      const toRemove = assignments.filter(
        (assignment) =>
          resourceIds.includes(assignment._cai_resourceid_value) &&
          assignment._cai_serviceorinitiativeid_value === serviceId,
      );
      for (const assignment of toRemove) {
        try {
          await api.deleteAssignment(assignment.cai_assignmentid);
        } catch {
          showToast('error', 'Failed to remove assignment from employee');
        }
      }
      await refetch();
      onAssignmentChange?.();
    },
    [assignments, refetch, showToast, onAssignmentChange],
  );

  const selectedSI = useMemo(
    () => serviceInitiatives.find((service) => service.cai_serviceorinitiativeid === selectedSIId) ?? null,
    [serviceInitiatives, selectedSIId],
  );

  const singleEmployee = selectedResources.length === 1 ? selectedResources[0] : null;
  const multiEmployee = selectedResources.length > 1;
  const nothingSelected =
    viewMode === 'employees' ? selectedEmployeeIds.size === 0 : selectedSIId === null;

  const handleSelectEmployee = useCallback((resourceId: string) => {
    setViewMode('employees');
    setSelectedEmployeeIds(new Set([resourceId]));
    setSelectedSIId(null);
  }, []);

  const handleSelectService = useCallback((serviceId: string) => {
    setViewMode('services');
    setSelectedSIId(serviceId);
    setSelectedEmployeeIds(new Set());
  }, []);

  const scopedAssignments = useMemo(() => {
    const subtreeIds = new Set(scopedSubtreePeople.map((p) => p.cai_resourceid));
    return assignments.filter((a) => subtreeIds.has(a._cai_resourceid_value));
  }, [assignments, scopedSubtreePeople]);

  function renderRightPanel() {
    if (!rightPanelReady) {
      return (
        <div className={styles.rightPanelLoading}>
          <Spinner size="small" label="Loading details..." />
        </div>
      );
    }

    if (nothingSelected) {
      if (viewMode === 'services') {
        return (
          <EmployeeOverview
            resources={scopedSubtreePeople}
            assignments={scopedAssignments}
            onSelectEmployee={handleSelectEmployee}
            onSelectManager={handleSelectManagerAlerts}
            managerAlertCountsById={managerAlertCountsById}
            placeholderServiceIds={placeholderServiceIds}
          />
        );
      }
      return (
        <AssignmentsDashboard
          assignments={scopedAssignments}
          resources={scopedSubtreePeople}
          serviceInitiatives={serviceInitiatives}
          hierarchy={hierarchy}
          onSelectEmployee={handleSelectEmployee}
          onSelectService={handleSelectService}
          serviceSummaries={serviceSummaries}
        />
      );
    }

    if (viewMode === 'employees') {
      if (singleEmployee) {
        return (
          <AssignmentEditor
            resource={singleEmployee}
            assignments={selectedAssignments}
            serviceInitiatives={serviceInitiatives}
            hierarchy={hierarchy}
            onSave={handleSave}
            onAdd={addAssignment}
            onDelete={removeAssignment}
          />
        );
      }
      if (multiEmployee) {
        return (
          <BulkEditPanel
            selectedResources={selectedResources}
            assignments={assignments}
            serviceInitiatives={serviceInitiatives}
            hierarchy={hierarchy}
            onBulkAdd={handleBulkAdd}
            onBulkRemove={handleBulkRemove}
            onSelectEmployee={handleSelectEmployee}
          />
        );
      }
    }

    if (viewMode === 'services' && selectedSI) {
      return (
          <ServiceDetailPanel
            serviceInitiative={selectedSI}
            scopedSummary={serviceSummaries.get(selectedSI.cai_serviceorinitiativeid)}
            managerSummariesForService={managerSummariesForService}
            managerSummariesLoading={managerSummariesLoading}
            scopedSummaryLoaded={!serviceSummariesLoading}
            assignments={scopedAssignments}
            resources={scopedSubtreePeople}
            scopedManagerId={scopedManagerId}
            scopedManagerName={scopedManagerName}
            onSelectManager={handleSelectSubManager}
            onSelectEmployee={handleSelectEmployee}
            backLabel={parentManagerEntry ? `${parentManagerEntry.name}'s team` : undefined}
            onGoBack={parentManagerEntry ? handleGoBack : undefined}
          />
        );
    }

    return null;
  }

  return (
    <div className={styles.outerContainer}>
      <div className={styles.container}>
        {viewMode === 'employees' || issuesFilter ? (
          <EmployeeList
            managerResource={managerResource}
            resources={resources}
            subReportsByManager={subReportsByManager}
            subManagerIds={subManagerIds}
            assignments={assignments}
            loading={resourcesLoading || assignmentsLoading}
            error={resourcesError ?? assignmentsError}
            selectedIds={selectedEmployeeIds}
            onSelectionChange={setSelectedEmployeeIds}
            viewMode={viewMode}
            onViewModeChange={handleViewChange}
            issuesFilter={issuesFilter}
            onIssuesFilterChange={handleIssuesFilterChange}
            loadManagerTeam={loadManagerTeam}
            loadedManagerIds={loadedManagerIds}
            loadingManagerId={loadingManagerId}
            selectedManagerId={selectedManagerId}
            onSelectedManagerChange={onSelectedManagerChange}
            assignRollups={assignRollups}
            onSearchClick={() => setSearchOpen(true)}
            placeholderServiceIds={placeholderServiceIds}
          />
        ) : (
          <ServiceInitiativeList
            serviceInitiatives={serviceInitiatives}
            hierarchy={hierarchy}
            assignments={assignments}
            resources={scopedSubtreePeople}
            serviceSummaries={serviceSummaries}
            selectedId={selectedSIId}
            onSelectionChange={setSelectedSIId}
            viewMode={viewMode}
            onViewModeChange={handleViewChange}
            invalidCount={scopedIssueCount}
            onIssuesFilterChange={handleIssuesFilterChange}
          />
        )}
        {renderRightPanel()}
      </div>

      <EmployeeSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onResultSelect={handleSearchResult}
        scopeRootResourceId={managerResource?.cai_resourceid ?? null}
        subManagerIds={subManagerIds}
        loadedResources={resources}
      />
    </div>
  );
}
