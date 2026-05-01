/* ── Allocations Tab (container) ── */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  ToggleButton,
  Divider,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { CheckmarkRegular, CheckmarkCircleRegular, ArrowUpRegular, Warning20Regular, SearchRegular } from '@fluentui/react-icons';
import type { IResource, IAllocation, RollupCounts } from '../../types';
import { AllocationStatus } from '../../types';
import { useAllocations, useAllocationPeriods, useServiceHierarchy } from '../../hooks';
import { useSharedData } from '../../contexts';
import {
  findCurrentPeriod,
  isPeriodEditable,
  dedupeResourcesById,
  buildHierarchyAlertSummaries,
  formatCount,
  getHierarchyAlertSummary,
  trackEvent,
  trackException,
  isPlaceholderService,
} from '../../utils';
import { getRollup } from '../../utils/summaryTreeUtils';
import type { HierarchyAlertSummary } from '../../utils/hierarchyAlerts';
import { getCurrentUserId } from '../../api';
import { LoadingSpinner, ErrorBanner, EmptyState, EmployeeSearchDialog } from '../Shared';
import type { EmployeeSearchResult } from '../Shared';
import { useToast } from '../Shared/Toast';
import { PeriodSelector } from './PeriodSelector';
import { AllocationRow } from './AllocationRow';
import { AllocationEditor, type AllocationChange, type NewAllocation, type AllocationSaveProgress } from './AllocationEditor';
import * as api from '../../api';

const useStyles = makeStyles({
  outerContainer: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
  },
  listPanel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  grid: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  managerSection: {
    marginBottom: '4px',
  },
  managerHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px 4px',
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
    padding: '12px 12px 4px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorNeutralForeground3,
  },
  indentLevel1: {
    paddingLeft: '12px',
  },
  editorPanel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    minWidth: '400px',
    maxWidth: '600px',
    overflow: 'hidden',
  },
});

interface AllocationsTabProps {
  managerResource: IResource | null;
  resources: IResource[];
  subReportsByManager: Map<string, IResource[]>;
  subManagerIds: Set<string>;
  resourcesLoading: boolean;
  resourcesError: ReactNode | null;
  onAllocationChange?: () => void;
  loadManagerTeam?: (managerId: string) => Promise<void>;
  loadedManagerIds?: Set<string>;
  selectedManagerId?: string;
  onSelectedManagerChange?: (managerId: string) => void;
  allocRollups?: Map<string, RollupCounts>;
  allocFallbackRollups?: Map<string, RollupCounts>;
  summaryCompletionById?: Map<string, number>;
  /** Initial period ID to select (from URL hash). Falls back to auto-select current period. */
  initialPeriodId?: string;
  /** Called when the selected period changes, so the caller can sync the URL hash. */
  onPeriodChange?: (periodId: string | null) => void;
  /** Initial open resource ID (from URL hash). */
  initialResourceId?: string;
  /** Called when the open resource changes, so the caller can sync the URL hash. */
  onResourceChange?: (id: string | null) => void;
}

function isPendingReview(allocation: IAllocation): boolean {
  return allocation.cai_managerapprovalstatus === AllocationStatus.PendingReview;
}

export function AllocationsTab({
  managerResource,
  resources,
  subReportsByManager,
  subManagerIds,
  resourcesLoading,
  resourcesError,
  onAllocationChange,
  loadManagerTeam,
  loadedManagerIds = new Set(),
  selectedManagerId = '__direct_team__',
  onSelectedManagerChange,
  allocRollups,
  allocFallbackRollups,
  summaryCompletionById,
  initialPeriodId,
  onPeriodChange,
  initialResourceId,
  onResourceChange,
}: AllocationsTabProps) {
  const styles = useStyles();
  const { showToast } = useToast();
  const { periods, loading: periodsLoading } = useAllocationPeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(() => initialPeriodId ?? null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<'selected' | 'all' | null>(null);
  const [editingResourceId, setEditingResourceIdState] = useState<string | null>(() => initialResourceId ?? null);
  const setEditingResourceId = useCallback((id: string | null) => {
    setEditingResourceIdState(id);
    onResourceChange?.(id);
  }, [onResourceChange]);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { services: serviceInitiatives, hierarchy, placeholderServiceIds } = useServiceHierarchy();
  const { currentPeriodId } = useSharedData();

  // Only show completion chips when the selected period matches the current period.
  // The manager summaries are only calculated for the current period.
  const showCompletionChips = selectedPeriodId !== null && selectedPeriodId === currentPeriodId;

  const serviceMap = useMemo(() => {
    const map = new Map<string, typeof serviceInitiatives[0]>();
    for (const s of serviceInitiatives) map.set(s.cai_serviceorinitiativeid, s);
    return map;
  }, [serviceInitiatives]);

  useEffect(() => {
    if (periods.length === 0) return;
    if (selectedPeriodId) {
      // Validate: if the hash-supplied period no longer exists in the list, fall back to current.
      const isValid = periods.some((p) => p.cai_allocationperiodid === selectedPeriodId);
      if (isValid) return;
    }
    const currentPeriod = findCurrentPeriod(periods);
    setSelectedPeriodId(currentPeriod?.cai_allocationperiodid ?? null);
  }, [periods, selectedPeriodId]);

  // Notify parent of period changes (for URL hash sync). Skip initial render.
  const isFirstPeriodRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstPeriodRenderRef.current) {
      isFirstPeriodRenderRef.current = false;
      return;
    }
    onPeriodChange?.(selectedPeriodId);
  }, [selectedPeriodId, onPeriodChange]);

  // Full team resource IDs — always fetch allocations for everyone
  const fullTeamResourceIds = useMemo(() => {
    const list = dedupeResourcesById(managerResource ? [managerResource, ...resources] : resources);
    return list.map((r) => r.cai_resourceid);
  }, [resources, managerResource]);

  const fullTeamPeople = useMemo(
    () => dedupeResourcesById(managerResource ? [managerResource, ...resources] : resources),
    [managerResource, resources],
  );

  // Include manager in the resource list, filtered by selected manager scope
  const allPeople = useMemo(() => {
    let list: IResource[];

    if (selectedManagerId === '__direct_team__') {
      // Only direct reports (managed by current user) + manager
      const directOnly = resources.filter(
        (r) => r._cai_managerresourceid_value === managerResource?.cai_resourceid
      );
      list = managerResource ? [managerResource, ...directOnly] : [...directOnly];
    } else if (subReportsByManager.has(selectedManagerId)) {
      // Show selected sub-manager + their reports
      const subMgr = resources.find((r) => r.cai_resourceid === selectedManagerId);
      const subReports = subReportsByManager.get(selectedManagerId) ?? [];
      list = subMgr ? [subMgr, ...subReports] : [...subReports];
    } else {
      // selectedManagerId is set to a sub-manager whose team hasn't loaded yet.
      // Return empty so callers see a loading state rather than misleading root-team data.
      list = [];
    }

    // Deduplicate
    const seen = new Set<string>();
    return list.filter((r) => {
      if (seen.has(r.cai_resourceid)) return false;
      seen.add(r.cai_resourceid);
      return true;
    });
  }, [resources, managerResource, selectedManagerId, subReportsByManager]);

  const scopedManager = useMemo(() => {
    if (selectedManagerId !== '__direct_team__') {
      return resources.find((resource) => resource.cai_resourceid === selectedManagerId) ?? null;
    }
    return managerResource;
  }, [managerResource, resources, selectedManagerId]);

  const scopedDirectReports = useMemo(() => {
    if (!scopedManager) {
      return [...allPeople].sort((a, b) => a.cai_displayname.localeCompare(b.cai_displayname));
    }
    return allPeople
      .filter((resource) => resource.cai_resourceid !== scopedManager.cai_resourceid)
      .sort((a, b) => a.cai_displayname.localeCompare(b.cai_displayname));
  }, [allPeople, scopedManager]);

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

  const handleNavigateToManager = useCallback(
    async (managerId: string) => {
      if (managerId !== '__direct_team__' && loadManagerTeam && !loadedManagerIds.has(managerId)) {
        await loadManagerTeam(managerId);
      }

      onSelectedManagerChange?.(managerId);
      setCheckedIds(new Set());
      setEditingResourceId(null);
    },
    [loadManagerTeam, loadedManagerIds, onSelectedManagerChange],
  );

  const handleOpenResource = useCallback(
    async (resourceId: string) => {
      if (subManagerIds.has(resourceId)) {
        await handleNavigateToManager(resourceId);
        return;
      }

      setEditingResourceId(resourceId);
    },
    [handleNavigateToManager, subManagerIds],
  );

  const handleSearchResult = useCallback(
    async (result: EmployeeSearchResult) => {
      // Load the target manager's team if not already loaded
      const targetManagerId = result.navigateToManagerId;
      if (targetManagerId !== '__direct_team__' && loadManagerTeam && !loadedManagerIds.has(targetManagerId)) {
        await loadManagerTeam(targetManagerId);
      }

      // Navigate to the manager's team
      onSelectedManagerChange?.(targetManagerId);
      setCheckedIds(new Set());

      // If the result is an individual employee, open their editor panel
      if (result.highlightResourceId) {
        setEditingResourceId(result.highlightResourceId);
      } else {
        setEditingResourceId(null);
      }
    },
    [loadManagerTeam, loadedManagerIds, onSelectedManagerChange],
  );


  const {
    allocations,
    loading: allocLoading,
    error: allocError,
    approve,
    updateAllocation,
    addAllocation,
    removeAllocation,
    refetch,
  } = useAllocations(selectedPeriodId, fullTeamResourceIds);

  const allocationsByResource = useMemo(() => {
    const map = new Map<string, typeof allocations>();
    for (const allocation of allocations) {
      const list = map.get(allocation._cai_resourceid_value) ?? [];
      list.push(allocation);
      map.set(allocation._cai_resourceid_value, list);
    }
    return map;
  }, [allocations]);

  const invalidResourceIds = useMemo(() => {
    const ids = new Set<string>();
    const fullTeamIds = new Set(fullTeamPeople.map((p) => p.cai_resourceid));
    for (const [resourceId, resourceAllocations] of allocationsByResource) {
      if (!fullTeamIds.has(resourceId)) continue;
      const total = resourceAllocations.reduce((sum, a) => sum + a.cai_allocationpercentage, 0);
      if (total !== 100) ids.add(resourceId);
      // Flag resources with the placeholder "No Service or Initiative Assigned"
      if (resourceAllocations.some((a) =>
        placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) ||
        isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted)
      )) {
        ids.add(resourceId);
      }
    }
    // Also flag loaded resources with zero allocations
    for (const person of fullTeamPeople) {
      if (!allocationsByResource.has(person.cai_resourceid)) {
        ids.add(person.cai_resourceid);
      }
    }
    return ids;
  }, [allocationsByResource, fullTeamPeople, placeholderServiceIds]);

  const alertSummariesByResource = useMemo(
    () => buildHierarchyAlertSummaries(fullTeamPeople, subReportsByManager, invalidResourceIds),
    [fullTeamPeople, subReportsByManager, invalidResourceIds],
  );

  // Get alert summary for a manager: prefer tree rollup (accurate across full
  // hierarchy) over client-side computation (limited to loaded ~2 levels)
  const getEffectiveAlertSummary = useCallback((resourceId: string): HierarchyAlertSummary => {
    const clientSummary = getHierarchyAlertSummary(alertSummariesByResource, resourceId);
    const rollupCandidates = [allocRollups, allocFallbackRollups]
      .filter((rollups): rollups is Map<string, RollupCounts> => !!rollups)
      .map((rollups) => getRollup(rollups, resourceId));
    const bestRollup = rollupCandidates.reduce<RollupCounts | null>((best, rollup) => {
      if (!best) return rollup;
      const bestScore = best.alertCount + best.totalEmployees;
      const rollupScore = rollup.alertCount + rollup.totalEmployees;
      return rollupScore > bestScore ? rollup : best;
    }, null);

    if (bestRollup && (bestRollup.alertCount > 0 || bestRollup.totalEmployees > 0)) {
      return {
        self: clientSummary.self,
        descendant: Math.max(bestRollup.alertCount - clientSummary.self, 0),
        total: Math.max(bestRollup.alertCount, clientSummary.total),
      };
    }
    return clientSummary;
  }, [alertSummariesByResource, allocFallbackRollups, allocRollups]);

  const effectiveAlertCount = getEffectiveAlertSummary(scopedManager?.cai_resourceid ?? '').total;

  const scopedAlertBranchIds = useMemo(() => {
    return new Set(
      allPeople
        .filter((person) => getEffectiveAlertSummary(person.cai_resourceid).total > 0)
        .map((person) => person.cai_resourceid),
    );
  }, [allPeople, getEffectiveAlertSummary]);

  const visibleScopedDirectReports = useMemo(() => {
    return alertsOnly
      ? scopedDirectReports.filter((resource) => scopedAlertBranchIds.has(resource.cai_resourceid))
      : scopedDirectReports;
  }, [alertsOnly, scopedAlertBranchIds, scopedDirectReports]);

  const visibleResourceIds = useMemo(
    () => new Set(allPeople.map((p) => p.cai_resourceid)),
    [allPeople],
  );

  const pendingAllocationIds = useMemo(
    () => allocations
      .filter((a) => isPendingReview(a) && visibleResourceIds.has(a._cai_resourceid_value) && !invalidResourceIds.has(a._cai_resourceid_value))
      .map((a) => a.cai_allocationid),
    [allocations, invalidResourceIds, visibleResourceIds],
  );

  const pendingEmployeeCount = useMemo(
    () => new Set(
      allocations
        .filter((a) => isPendingReview(a) && visibleResourceIds.has(a._cai_resourceid_value) && !invalidResourceIds.has(a._cai_resourceid_value))
        .map((a) => a._cai_resourceid_value),
    ).size,
    [allocations, invalidResourceIds, visibleResourceIds],
  );

  const checkedPendingIds = useMemo(() => {
    return allocations
      .filter(
        (a) =>
          isPendingReview(a) &&
          checkedIds.has(a._cai_resourceid_value) &&
          !invalidResourceIds.has(a._cai_resourceid_value),
      )
      .map((a) => a.cai_allocationid);
  }, [allocations, checkedIds, invalidResourceIds]);

  const handleCheck = (resourceId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(resourceId);
      else next.delete(resourceId);
      return next;
    });
  };

  const handleApproveRow = useCallback(
    async (resourceId: string) => {
      if (invalidResourceIds.has(resourceId)) {
        showToast('error', 'Cannot approve — snapshots must total 100%');
        return;
      }
      const ids = allocations
        .filter((a) => a._cai_resourceid_value === resourceId && isPendingReview(a))
        .map((a) => a.cai_allocationid);
      if (ids.length === 0) return;
      try {
        trackEvent('SnapshotApprovalRequested', {
          properties: {
            mode: 'row',
            resourceId,
            periodId: selectedPeriodId ?? undefined,
          },
          measurements: {
            allocationCount: ids.length,
          },
        });
        await approve(ids);
        trackEvent('SnapshotApprovalCompleted', {
          properties: {
            mode: 'row',
            resourceId,
            periodId: selectedPeriodId ?? undefined,
          },
          measurements: {
            allocationCount: ids.length,
          },
        });
        const name = allPeople.find((r) => r.cai_resourceid === resourceId)?.cai_displayname;
        showToast('success', `Marked review complete for ${name ?? 'employee'}`);
        onAllocationChange?.();
      } catch (err) {
        trackException(err, {
          area: 'AllocationsTab',
          action: 'approveRow',
          resourceId,
          periodId: selectedPeriodId ?? undefined,
        });
        showToast('error', err instanceof Error ? err.message : 'Approval failed');
      }
    },
    [allocations, approve, allPeople, showToast, invalidResourceIds, onAllocationChange, selectedPeriodId],
  );

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.cai_allocationperiodid === selectedPeriodId),
    [periods, selectedPeriodId],
  );

  const periodEditable = selectedPeriod ? isPeriodEditable(selectedPeriod) : true;

  const handleBulkApprove= async () => {
    const ids = approveTarget === 'all' ? pendingAllocationIds : checkedPendingIds;
    if (ids.length === 0) return;
    try {
      trackEvent('SnapshotApprovalRequested', {
        properties: {
          mode: approveTarget === 'all' ? 'bulkAll' : 'bulkSelected',
          periodId: selectedPeriodId ?? undefined,
        },
        measurements: {
          allocationCount: ids.length,
        },
      });
      await approve(ids);
      trackEvent('SnapshotApprovalCompleted', {
        properties: {
          mode: approveTarget === 'all' ? 'bulkAll' : 'bulkSelected',
          periodId: selectedPeriodId ?? undefined,
        },
        measurements: {
          allocationCount: ids.length,
        },
      });
      showToast('success', `Approved ${ids.length} snapshot(s)`);
      setCheckedIds(new Set());
      onAllocationChange?.();
    } catch (err) {
      trackException(err, {
        area: 'AllocationsTab',
        action: 'approveBulk',
        mode: approveTarget === 'all' ? 'bulkAll' : 'bulkSelected',
        periodId: selectedPeriodId ?? undefined,
      });
      showToast('error', err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setConfirmOpen(false);
      setApproveTarget(null);
    }
  };

  const handleAllocationSave = useCallback(
    async (
      changes: AllocationChange[],
      newAllocations: NewAllocation[],
      deletedIds: string[],
      alsoUpdateAssignments: boolean,
      shouldApprove: boolean,
      onProgress?: (progress: AllocationSaveProgress) => void,
    ) => {
      const editResource = allPeople.find((r) => r.cai_resourceid === editingResourceId);
      let completedSteps = 0;
      let totalSteps = changes.length + deletedIds.length + newAllocations.length;
      let cachedFreshAllocations: IAllocation[] | null = null;

      const emitProgress = (message: string) => {
        onProgress?.({
          current: completedSteps,
          total: totalSteps,
          message,
        });
      };

      const addPlannedSteps = (count: number, message: string) => {
        if (count <= 0) return;
        totalSteps += count;
        emitProgress(message);
      };

      const completeStep = (message: string) => {
        completedSteps += 1;
        emitProgress(message);
      };

      const getFreshAllocations = async (): Promise<IAllocation[]> => {
        if (!editingResourceId || !selectedPeriodId) {
          return [];
        }
        if (cachedFreshAllocations === null) {
          emitProgress('Refreshing saved snapshots...');
          cachedFreshAllocations = await api.getAllocations(selectedPeriodId, [editingResourceId]);
        }
        return cachedFreshAllocations;
      };

      emitProgress(totalSteps > 0 ? 'Starting snapshot save...' : 'Preparing follow-up work...');

      // Apply updates sequentially to avoid deadlocks from AllocationTotalCheckerPlugin
      for (const [index, change] of changes.entries()) {
        const { allocationId, data } = change;
        emitProgress(`Updating snapshot ${index + 1} of ${changes.length}`);
        await updateAllocation(allocationId, data);
        completeStep(`Updated snapshot ${index + 1} of ${changes.length}`);
      }

      // Apply deletions sequentially (same plugin contention risk)
      for (const [index, id] of deletedIds.entries()) {
        emitProgress(`Deleting snapshot ${index + 1} of ${deletedIds.length}`);
        await removeAllocation(id);
        completeStep(`Deleted snapshot ${index + 1} of ${deletedIds.length}`);
      }

      // Apply new allocations (sequential — each needs the previous to commit)
      for (const [index, draft] of newAllocations.entries()) {
        const { serviceId, percentage } = draft;
        emitProgress(`Creating snapshot ${index + 1} of ${newAllocations.length}`);
        const service = serviceInitiatives.find((s) => s.cai_serviceorinitiativeid === serviceId);
        await addAllocation({
          cai_name: `${selectedPeriod?.cai_periodname ?? ''} - ${editResource?.cai_displayname ?? ''} - ${service?.cai_name ?? ''}`,
          _cai_resourceid_value: editingResourceId!,
          _cai_resourceid_value_formatted: editResource?.cai_displayname,
          _cai_serviceorinitiativeid_value: serviceId,
          _cai_serviceorinitiativeid_value_formatted: service?.cai_name,
          _cai_allocationperiodid_value: selectedPeriodId!,
          _cai_allocationperiodid_value_formatted: selectedPeriod?.cai_periodname,
          _cai_manager_systemuserid_value: getCurrentUserId(),
          _cai_manager_systemuserid_value_formatted: '',
          cai_managerapprovalstatus: AllocationStatus.PendingReview,
          cai_managerapprovalstatus_formatted: 'Pending Review',
          cai_allocationpercentage: percentage,
          cai_employeename: editResource?.cai_displayname ?? '',
          cai_alias: editResource?.cai_alias ?? '',
        } as Omit<IAllocation, 'cai_allocationid'>);
        completeStep(`Created snapshot ${index + 1} of ${newAllocations.length}`);
      }

      // Reset approval status to PendingReview when saving without approving
      // (e.g., after "Reopen to Edit" and modifying data)
      if (!shouldApprove && editingResourceId && selectedPeriodId) {
        const freshAllocations = await getFreshAllocations();
        const allocationsToReset = freshAllocations.filter((a) => a.cai_managerapprovalstatus !== AllocationStatus.PendingReview);
        addPlannedSteps(allocationsToReset.length, 'Preparing review-status reset...');
        for (const [index, a] of allocationsToReset.entries()) {
          emitProgress(`Resetting review status ${index + 1} of ${allocationsToReset.length}`);
          await updateAllocation(a.cai_allocationid, {
            cai_managerapprovalstatus: AllocationStatus.PendingReview,
            cai_managerreviewdate: null,
          });
          completeStep(`Reset review status ${index + 1} of ${allocationsToReset.length}`);
          if (a._cai_managerreviewcompletedbyid_value) {
            addPlannedSteps(1, 'Clearing reviewer details...');
            emitProgress(`Clearing reviewer details for snapshot ${index + 1} of ${allocationsToReset.length}`);
            await api.clearAllocationReviewCompletedBy(a.cai_allocationid);
            completeStep(`Cleared reviewer details for snapshot ${index + 1} of ${allocationsToReset.length}`);
          }
        }
      }

      // Optionally mirror to assignments — build desired state from the save
      // parameters (not from the stale closure) to avoid data divergence
      if (alsoUpdateAssignments && editingResourceId) {
        try {
          emitProgress('Loading assignments to synchronize...');
          const currentAssignments = await api.getAssignments([editingResourceId]);
          // Compute final desired state from the fresh API query + applied changes
          const freshAllocations = await getFreshAllocations();
          const finalAllocations = freshAllocations.map((a) => ({
            serviceId: a._cai_serviceorinitiativeid_value,
            percentage: a.cai_allocationpercentage,
          }));

          // Delete assignments not in the allocation set (sequentially to avoid plugin deadlocks)
          const toDelete = currentAssignments
            .filter((a) => !finalAllocations.some((f) => f.serviceId === a._cai_serviceorinitiativeid_value));
          addPlannedSteps(toDelete.length + finalAllocations.length, 'Preparing assignment sync...');
          for (const [index, a] of toDelete.entries()) {
            emitProgress(`Deleting assignment ${index + 1} of ${toDelete.length}`);
            await api.deleteAssignment(a.cai_assignmentid);
            completeStep(`Deleted assignment ${index + 1} of ${toDelete.length}`);
          }

          // Update or create assignments (sequentially to avoid plugin deadlocks)
          let assignmentFailures = 0;
          for (const [index, finalAllocation] of finalAllocations.entries()) {
            const { serviceId, percentage } = finalAllocation;
            try {
              emitProgress(`Saving assignment ${index + 1} of ${finalAllocations.length}`);
              const existing = currentAssignments.find((a) => a._cai_serviceorinitiativeid_value === serviceId);
              if (existing) {
                await api.updateAssignment(existing.cai_assignmentid, {
                  cai_allocationpercentage: percentage,
                  cai_totalallocatedperuserperperiod: percentage,
                });
              } else {
                const service = serviceInitiatives.find((s) => s.cai_serviceorinitiativeid === serviceId);
                await api.createAssignment({
                  cai_assignmentname: `${editResource?.cai_displayname ?? 'Resource'} - ${service?.cai_name ?? 'Service'}`,
                  _cai_resourceid_value: editingResourceId,
                  _cai_serviceorinitiativeid_value: serviceId,
                  cai_allocationpercentage: percentage,
                  cai_totalallocatedperuserperperiod: percentage,
                } as Omit<typeof currentAssignments[0], 'cai_assignmentid'>);
              }
              completeStep(`Saved assignment ${index + 1} of ${finalAllocations.length}`);
            } catch {
              assignmentFailures++;
              completeStep(`Skipped failed assignment ${index + 1} of ${finalAllocations.length}`);
            }
          }

          if (assignmentFailures > 0) {
            trackEvent('AssignmentSyncPartialFailure', {
              properties: {
                resourceId: editingResourceId,
                periodId: selectedPeriodId ?? undefined,
              },
              measurements: {
                failedCount: assignmentFailures,
                attemptedCount: finalAllocations.length,
              },
            });
            showToast('error', `Snapshots saved but ${assignmentFailures} assignment update(s) failed`);
          } else {
            showToast('success', 'Assignments also updated');
          }
        } catch (err) {
          trackException(err, {
            area: 'AllocationsTab',
            action: 'syncAssignmentsAfterSnapshotSave',
            resourceId: editingResourceId,
            periodId: selectedPeriodId ?? undefined,
          });
          showToast('error', 'Snapshots saved but failed to update assignments');
        }
      }

      // Approve if requested — query API directly (no setTimeout race)
      if (shouldApprove && editingResourceId && selectedPeriodId) {
        const freshAllocations = await getFreshAllocations();
        const allocationIds = freshAllocations.map((a) => a.cai_allocationid);
        if (allocationIds.length > 0) {
          addPlannedSteps(allocationIds.length, 'Preparing approval...');
          const baseCompletedSteps = completedSteps;
          await api.approveAllocations(allocationIds);
          completedSteps = baseCompletedSteps + allocationIds.length;
          emitProgress(`Approved ${allocationIds.length} snapshot${allocationIds.length === 1 ? '' : 's'}`);
        }
      }

      emitProgress('Refreshing allocation list...');
      refetch();
      onAllocationChange?.();
    },
    [updateAllocation, addAllocation, removeAllocation, editingResourceId, selectedPeriodId, selectedPeriod, allPeople, serviceInitiatives, refetch, showToast, onAllocationChange],
  );

  const handleCopyAssignments = useCallback(
    async (resourceId: string) => {
      if (!selectedPeriodId || !selectedPeriod) return;
      try {
        const assignments = await api.getAssignments([resourceId]);
        if (assignments.length === 0) {
          showToast('error', 'No assignments found for this employee');
          return;
        }

        // Delete any stale allocations for this resource+period first
        const existingAllocations = await api.getAllocations(selectedPeriodId, [resourceId]);
        for (const allocation of existingAllocations) {
          await removeAllocation(allocation.cai_allocationid);
        }

        // Create fresh allocations from assignments
        const resource = allPeople.find((r) => r.cai_resourceid === resourceId);
        for (const assignment of assignments) {
          const service = serviceInitiatives.find((s) => s.cai_serviceorinitiativeid === assignment._cai_serviceorinitiativeid_value);
          await addAllocation({
            cai_name: `${selectedPeriod.cai_periodname} - ${resource?.cai_displayname ?? ''} - ${service?.cai_name ?? ''}`,
            _cai_resourceid_value: resourceId,
            _cai_resourceid_value_formatted: resource?.cai_displayname,
            _cai_serviceorinitiativeid_value: assignment._cai_serviceorinitiativeid_value,
            _cai_serviceorinitiativeid_value_formatted: service?.cai_name ?? assignment._cai_serviceorinitiativeid_value_formatted,
            _cai_allocationperiodid_value: selectedPeriodId,
            _cai_allocationperiodid_value_formatted: selectedPeriod.cai_periodname,
            _cai_manager_systemuserid_value: getCurrentUserId(),
            _cai_manager_systemuserid_value_formatted: '',
            cai_managerapprovalstatus: AllocationStatus.PendingReview,
            cai_managerapprovalstatus_formatted: 'Pending Review',
            cai_allocationpercentage: assignment.cai_allocationpercentage,
            cai_employeename: resource?.cai_displayname ?? '',
            cai_alias: resource?.cai_alias ?? '',
          } as Omit<IAllocation, 'cai_allocationid'>);
        }
        await refetch();
        onAllocationChange?.();
        setEditingResourceId(resourceId);
        showToast('success', `Copied ${assignments.length} assignment(s) to snapshots for ${resource?.cai_displayname ?? 'employee'}`);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to copy assignments');
      }
    },
    [selectedPeriodId, selectedPeriod, allPeople, serviceInitiatives, addAllocation, removeAllocation, refetch, showToast, onAllocationChange],
  );

  const editResource = allPeople.find((r) => r.cai_resourceid === editingResourceId);
  const editAllocations = editingResourceId ? (allocationsByResource.get(editingResourceId) ?? []) : [];

  const loading = resourcesLoading || periodsLoading || allocLoading;
  const error = resourcesError ?? allocError;

  return (
    <div className={styles.outerContainer}>
      <div className={styles.listPanel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <PeriodSelector
              periods={periods}
              selectedPeriodId={selectedPeriodId}
              onSelect={(id) => { setSelectedPeriodId(id); setEditingResourceId(null); }}
              disabled={loading}
            />
          </div>
          <div className={styles.toolbarRight}>
            <Button
              size="small"
              appearance="subtle"
              icon={<SearchRegular />}
              onClick={() => setSearchOpen(true)}
              title="Find Employee"
            >
              Find
            </Button>
            {(alertsOnly || effectiveAlertCount > 0) && (
              <ToggleButton
                size="small"
                appearance={alertsOnly ? 'primary' : 'subtle'}
                icon={<Warning20Regular />}
                checked={alertsOnly}
                onClick={() => setAlertsOnly((current) => !current)}
                style={{
                  color: alertsOnly ? undefined : tokens.colorPaletteRedForeground1,
                  borderColor: alertsOnly ? undefined : tokens.colorPaletteRedBorder1,
                  whiteSpace: 'nowrap',
                }}
              >
                Alerts Only ({formatCount(effectiveAlertCount)})
              </ToggleButton>
            )}
            {checkedIds.size > 0 ? (
              <Button
                appearance="primary"
                icon={<CheckmarkRegular />}
                disabled={!periodEditable || checkedPendingIds.length === 0}
                onClick={() => {
                  setApproveTarget('selected');
                  setConfirmOpen(true);
                }}
              >
                Approve Selected ({formatCount(checkedIds.size)})
              </Button>
            ) : (
              <Button
                appearance="primary"
                icon={<CheckmarkCircleRegular />}
                disabled={!periodEditable || pendingAllocationIds.length === 0}
                onClick={() => {
                  setApproveTarget('all');
                  setConfirmOpen(true);
                }}
              >
                Approve All
              </Button>
            )}
          </div>
        </div>

        <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

        {!periodEditable && (
          <div style={{ padding: '8px 24px 0' }}>
            <MessageBar intent="info">
              <MessageBarBody>
                This period is closed — snapshots are read-only.
              </MessageBarBody>
            </MessageBar>
          </div>
        )}

        {/* Status bar with alert count hidden — rollup counts were unreliable.
            Re-enable once effectiveAlertCount is trustworthy across scopes. */}

        <div className={styles.grid}>
          {loading ? (
            <LoadingSpinner label="Loading snapshots..." />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : allPeople.length === 0 ? (
            <EmptyState message="No employees found for this period" />
          ) : (
            <>
              {scopedManager && (!alertsOnly || effectiveAlertCount > 0) && (
                <div className={styles.managerSection}>
                  <div className={styles.managerHeaderRow}>
                    {parentManagerTarget && (
                      <Button
                        className={styles.managerNavButton}
                        size="small"
                        appearance="transparent"
                        icon={<ArrowUpRegular />}
                        onClick={() => { void handleNavigateToManager(parentManagerTarget); }}
                      >
                        Up
                      </Button>
                    )}
                    <div className={styles.managerLabel}>Manager</div>
                  </div>
                  <AllocationRow
                    key={scopedManager.cai_resourceid}
                    resource={scopedManager}
                    allocations={allocationsByResource.get(scopedManager.cai_resourceid) ?? []}
                    checked={checkedIds.has(scopedManager.cai_resourceid)}
                    onCheckChange={(checked) => handleCheck(scopedManager.cai_resourceid, checked)}
                    onApprove={() => handleApproveRow(scopedManager.cai_resourceid)}
                    onClick={() => setEditingResourceId(scopedManager.cai_resourceid)}
                    onCopyAssignments={periodEditable ? () => handleCopyAssignments(scopedManager.cai_resourceid) : undefined}
                    invalidTotal={periodEditable && invalidResourceIds.has(scopedManager.cai_resourceid)}
                    compact={editingResourceId !== null}
                    readOnly={!periodEditable}
                    isManager={subManagerIds.has(scopedManager.cai_resourceid)}
                    serviceMap={serviceMap}
                    alertSummary={getEffectiveAlertSummary(scopedManager.cai_resourceid)}
                    hideAlertSummary
                    placeholderServiceIds={placeholderServiceIds}
                    completionPct={showCompletionChips ? summaryCompletionById?.get(scopedManager.cai_resourceid) : undefined}
                  />
                </div>
              )}

              {visibleScopedDirectReports.length > 0 && (
                <>
                  <div className={styles.reportsLabel}>
                    Direct Reports ({formatCount(visibleScopedDirectReports.length)})
                  </div>
                  {visibleScopedDirectReports.map((resource) => (
                    <div key={resource.cai_resourceid} className={styles.indentLevel1}>
                      <AllocationRow
                        resource={resource}
                        allocations={allocationsByResource.get(resource.cai_resourceid) ?? []}
                        checked={checkedIds.has(resource.cai_resourceid)}
                        onCheckChange={(checked) => handleCheck(resource.cai_resourceid, checked)}
                        onApprove={() => handleApproveRow(resource.cai_resourceid)}
                        onClick={() => { void handleOpenResource(resource.cai_resourceid); }}
                        onCopyAssignments={periodEditable ? () => handleCopyAssignments(resource.cai_resourceid) : undefined}
                        invalidTotal={periodEditable && invalidResourceIds.has(resource.cai_resourceid)}
                        compact={editingResourceId !== null}
                        readOnly={!periodEditable}
                        isManager={subManagerIds.has(resource.cai_resourceid)}
                        serviceMap={serviceMap}
                        alertSummary={getEffectiveAlertSummary(resource.cai_resourceid)}
                        hideAlertSummary={subManagerIds.has(resource.cai_resourceid)}
                        placeholderServiceIds={placeholderServiceIds}
                        completionPct={showCompletionChips && subManagerIds.has(resource.cai_resourceid) ? summaryCompletionById?.get(resource.cai_resourceid) : undefined}
                      />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <Dialog open={confirmOpen} onOpenChange={(_e, data) => setConfirmOpen(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Confirm Approval</DialogTitle>
              <DialogContent>
                <Text>
                  {approveTarget === 'all'
                    ? `Approve all pending snapshots for ${formatCount(pendingEmployeeCount)} employee(s) for this period?`
                    : `Approve snapshots for ${formatCount(checkedIds.size)} selected employee(s)?`}
                </Text>
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button appearance="primary" onClick={handleBulkApprove}>
                  Approve
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>

      {editResource && selectedPeriod && (
        <div className={styles.editorPanel}>
          <AllocationEditor
            resource={editResource}
            allocations={editAllocations}
            period={selectedPeriod}
            serviceInitiatives={serviceInitiatives}
            hierarchy={hierarchy}
            onSave={handleAllocationSave}
            onBack={() => setEditingResourceId(null)}
            onCopyAssignments={periodEditable ? () => handleCopyAssignments(editResource.cai_resourceid) : undefined}
            readOnly={!periodEditable}
            placeholderServiceIds={placeholderServiceIds}
          />
        </div>
      )}

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
