/* ── Root App Component ── */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  FluentProvider,
  makeStyles,
  tokens,
  Button,
  Link,
  Text,
} from '@fluentui/react-components';
import { useTheme, useCurrentUser, useDirectReports, usePendingAllocationCount, useAssignmentIssueCount, useDelegations, useHashState } from '../../hooks';
import { useManagerSummaryTree, selectBestSummaryPerManager } from '../../hooks/useManagerSummaries';
import { isTrainingMode, setTrainingMode, mockApi, getResourceById, getCurrentUserName } from '../../api';
import { buildManagerOptions, dedupeResourcesById, setTelemetryContext, trackEvent, trackPageView } from '../../utils';
import type { ManagerTreeNode } from '../../utils/managerOptions';
import type { ResolvedScope } from '../../utils/scopeResolver';
import type { IResource } from '../../types';
import { ManagerSummaryType } from '../../types';
import type { ManagerAlertStatus } from '../Assignments/ManagerAlertChips';
import { getRollup } from '../../utils/summaryTreeUtils';
import { SharedDataProvider, useSharedData } from '../../contexts';
import { ToastProvider } from '../Shared';
import { AppHeader } from './AppHeader';
import { AssignmentsTab } from '../Assignments';
import { AllocationsTab } from '../Allocations';
import { ServiceHierarchyTab } from '../ServiceHierarchy';
import { HelpTab } from '../Help';

const APP_VERSION = __APP_VERSION__;
const BUILD_VERSION_META_NAME = 'pn-build-version';
const BUILD_UPDATE_CHECK_INTERVAL_MS = 60_000;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  supportErrorContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  supportErrorDetails: {
    padding: '8px 10px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  versionLabel: {
    position: 'fixed',
    bottom: '4px',
    right: '8px',
    fontSize: '10px',
    color: tokens.colorNeutralForeground4,
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 0,
  },
  updateBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#FFF4CE',
    borderBottom: `1px solid ${tokens.colorPaletteYellowBorder2}`,
  },
  updateBannerText: {
    color: '#835C00',
  },
  updateBannerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  nonManagerMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '48px 24px',
  },
  nonManagerCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '520px',
    padding: '32px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: tokens.shadow4,
  },
  nonManagerLinks: {
    margin: '4px 0 0',
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
});

type TabKey = 'allocations' | 'assignments' | 'services' | 'help';

export function App() {
  const { mode, theme, toggle } = useTheme();
  const styles = useStyles();

  // Training mode — key increments to force all hooks to remount and refetch
  const [trainingMode, setTrainingModeState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('training') === 'true';
    if (fromUrl) setTrainingMode(true);
    return fromUrl || isTrainingMode();
  });
  const [dataKey, setDataKey] = useState(0);

  const handleToggleTraining = useCallback(() => {
    const next = !trainingMode;
    trackEvent('TrainingModeToggled', {
      properties: {
        enabled: next,
      },
    });
    setTrainingMode(next);
    if (next) {
      mockApi.resetData();
    }
    setTrainingModeState(next);
    setDataKey((k) => k + 1);
  }, [trainingMode]);

  return (
    <FluentProvider theme={theme}>
      <ToastProvider>
        <div className={styles.root}>
          <SharedDataProvider key={dataKey}>
            <AppInner
              themeMode={mode}
              onToggleTheme={toggle}
              trainingMode={trainingMode}
              onToggleTrainingMode={handleToggleTraining}
            />
          </SharedDataProvider>
          <span className={styles.versionLabel}>v{APP_VERSION}</span>
        </div>
      </ToastProvider>
    </FluentProvider>
  );
}

/** Inner component that remounts when dataKey changes (training mode toggle) */
function AppInner({
  themeMode,
  onToggleTheme,
  trainingMode,
  onToggleTrainingMode,
}: {
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  trainingMode: boolean;
  onToggleTrainingMode: () => void;
}) {
  const styles = useStyles();
  const { hashParams, setHashParam, clearHashParam } = useHashState();
  // Capture initial hash manager once — used to apply deep-linked manager on first scope resolution.
  const initialHashManagerRef = useRef<string | null>(hashParams.get('manager'));
  // Track active period so Copy Link can build a complete URL from React state (not hash).
  const [activePeriodId, setActivePeriodId] = useState<string | null>(() => hashParams.get('period'));
  // Track open employee snapshot so Copy Link includes the resource param.
  const [activeResourceId, setActiveResourceId] = useState<string | null>(() => hashParams.get('resource'));
  const currentUser = useCurrentUser();
  const { scopes: delegationScopes, loading: delegationsLoading, error: delegationError } = useDelegations(currentUser.resourceId);
  const [activeScopeId, setActiveScopeId] = useState('self');
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);

  // Resolve which resource ID is the hierarchy root based on the active scope
  const activeScope: ResolvedScope | null = useMemo(() => {
    if (activeScopeId === 'self') return null;
    return delegationScopes.find((s) => s.id === activeScopeId) ?? null;
  }, [activeScopeId, delegationScopes]);

  // Track whether hooks have re-initialized for the current resourceId.
  // When currentUser.resourceId changes from null → real ID, hooks still have stale
  // data from their null-arg early exit for one render (effects haven't fired yet).
  const hooksReadyForIdRef = useRef<string | null>(null);
  const hooksInitializing = currentUser.resourceId != null
    && hooksReadyForIdRef.current !== currentUser.resourceId;
  useEffect(() => {
    if (currentUser.resourceId) hooksReadyForIdRef.current = currentUser.resourceId;
  }, [currentUser.resourceId]);

  const scopeRootResourceId = activeScope?.rootResourceId ?? currentUser.resourceId;
  const scopeIsFlat = activeScope?.flat ?? false;
  const directReports = useDirectReports(scopeRootResourceId, scopeIsFlat);

  // Derive manager status from direct reports on initial (self) scope.
  // Captured once and frozen so it doesn't flip when switching delegation scopes.
  // Only capture once the query has actually completed for the current resourceId —
  // otherwise stale state from a prior null call can freeze this at false before
  // data arrives (bug seen with legitimate managers getting the non-manager screen).
  const managerStatusRef = useRef<boolean | null>(null);
  if (
    managerStatusRef.current === null
    && !directReports.error
    && activeScopeId === 'self'
    && currentUser.resourceId
    && directReports.loadedForManagerId === currentUser.resourceId
  ) {
    managerStatusRef.current = directReports.resources.length > 0;
  }
  const isCurrentUserManager = managerStatusRef.current;
  // Still "loading" if status is undetermined and the query is in flight.
  // If there's a direct reports error, status stays null but loading resolves so the error path renders.
  const managerStatusLoading = isCurrentUserManager === null && !directReports.error && (directReports.loading || currentUser.loading);

  // Delegate-only users: auto-switch to the first delegation scope on initial load
  useEffect(() => {
    const firstScope = delegationScopes[0];
    if (isCurrentUserManager === false && firstScope && activeScopeId === 'self') {
      setActiveScopeId(firstScope.id);
    }
  }, [isCurrentUserManager, delegationScopes, activeScopeId]);

  // For delegated scopes, fetch the scope root's IResource so the hierarchy dropdown can build its tree
  const [delegatedRootResource, setDelegatedRootResource] = useState<IResource | null>(null);
  useEffect(() => {
    if (!activeScope) {
      setDelegatedRootResource(null);
      return;
    }
    let cancelled = false;
    void getResourceById(activeScope.rootResourceId)
      .then((resource) => {
        if (!cancelled) setDelegatedRootResource(resource);
      })
      .catch((err) => {
        console.error('[PortfolioNavigator] Failed to load delegated root resource:', err);
        if (!cancelled) setDelegatedRootResource(null);
      });
    return () => { cancelled = true; };
  }, [activeScope]);

  const scopeRootResource = activeScope ? delegatedRootResource : currentUser.resource;

  // ── Unified team selector state ──
  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    () => hashParams.get('manager') ?? '__direct_team__',
  );
  const [managerAlertStatuses, setManagerAlertStatuses] = useState<ManagerAlertStatus[]>([]);

  // Build hierarchical manager options for the dropdown
  const managerOptions: ManagerTreeNode[] = useMemo(
    () => buildManagerOptions(directReports.resources, directReports.subManagerIds, scopeRootResource),
    [directReports.resources, directReports.subManagerIds, scopeRootResource],
  );

  // Reset selected manager when scope changes (delegation switch).
  // On the FIRST scope resolution we preserve the hash-derived manager instead.
  const scopeFirstResolvedRef = useRef(false);
  useEffect(() => {
    if (!scopeRootResourceId) return;
    if (!scopeFirstResolvedRef.current) {
      scopeFirstResolvedRef.current = true;
      // selectedManagerId already holds the hash value from useState.
      // Trigger on-demand team load if the hash manager is a sub-manager.
      // NOTE: The main useDirectReports load runs concurrently, but now uses
      // functional setters that MERGE rather than overwrite, so this result is safe.
      const hashMgr = initialHashManagerRef.current;
      if (hashMgr && hashMgr !== '__direct_team__' && directReports.loadManagerTeam) {
        void directReports.loadManagerTeam(hashMgr);
      }
      return;
    }
    // Scope changed (delegation switch): reset manager to default.
    setSelectedManagerId('__direct_team__');
    clearHashParam('manager');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally ignores directReports.loadManagerTeam and clearHashParam (stable refs)
  }, [scopeRootResourceId]);

  // Sync selectedManagerId from hash when the user presses back/forward.
  // Track the last manager value we saw in the hash so we only react when
  // it actually changes — not when other hash params (e.g. resource) are updated.
  const selectedManagerIdRef = useRef(selectedManagerId);
  selectedManagerIdRef.current = selectedManagerId;
  const prevHashManagerRef = useRef(hashParams.get('manager') ?? '__direct_team__');
  useEffect(() => {
    const hashMgr = hashParams.get('manager') ?? '__direct_team__';
    if (hashMgr === prevHashManagerRef.current) return; // manager key unchanged — ignore other hash updates
    prevHashManagerRef.current = hashMgr;
    if (hashMgr !== selectedManagerIdRef.current) {
      setSelectedManagerId(hashMgr);
      if (hashMgr !== '__direct_team__' && directReports.loadManagerTeam && !directReports.loadedManagerIds.has(hashMgr)) {
        void directReports.loadManagerTeam(hashMgr);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to hash changes, not selectedManagerId (that would loop)
  }, [hashParams]);

  // Unified handler: selecting a sub-manager or a delegation scope
  const { loadManagerTeam, loadedManagerIds } = directReports;
  const handleTeamSelect = useCallback(async (value: string) => {
    // Check if this is a delegation scope selection
    const delegationScope = delegationScopes.find((s) => s.id === value);
    if (delegationScope) {
      setActiveScopeId(value);
      clearHashParam('manager');
      return;
    }

    // Selecting "My Team" root when viewing a delegated scope → switch back to self
    if (value === 'self') {
      setActiveScopeId('self');
      clearHashParam('manager');
      return;
    }

    // Sub-manager within the current scope
    if (value !== '__direct_team__' && loadManagerTeam && !loadedManagerIds.has(value)) {
      await loadManagerTeam(value);
    }
    setSelectedManagerId(value);
    if (value === '__direct_team__') {
      clearHashParam('manager');
    } else {
      setHashParam('manager', value);
    }
  }, [clearHashParam, delegationScopes, loadManagerTeam, loadedManagerIds, setHashParam]);

  // If the active scope becomes invalid (delegation deactivated), fall back to self
  useEffect(() => {
    if (activeScopeId !== 'self' && delegationScopes.length > 0 && !activeScope) {
      setActiveScopeId('self');
    }
  }, [activeScopeId, delegationScopes, activeScope]);

  // All resource IDs: scope root + direct reports + sub-reports
  const allResourceIds = useMemo(() => {
    const rootResources = scopeRootResource ? [scopeRootResource] : [];
    const people = [...rootResources, ...directReports.resources];
    return dedupeResourcesById(people).map((resource) => resource.cai_resourceid);
  }, [directReports.resources, scopeRootResource]);

  const VALID_TABS: TabKey[] = ['allocations', 'assignments', 'services', 'help'];
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const t = hashParams.get('tab') as TabKey | null;
    return t && VALID_TABS.includes(t) ? t : 'allocations';
  });
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(() => {
    const t = hashParams.get('tab') as TabKey | null;
    return new Set([(t && VALID_TABS.includes(t) ? t : 'allocations')]);
  });

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setHashParam('tab', tab, true);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set([...prev, tab]);
    });
  }, [setHashParam]);

  // Sync active tab from hash on browser back/forward.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    const t = hashParams.get('tab') as TabKey | null;
    const validTab = t && VALID_TABS.includes(t) ? t : 'allocations';
    if (validTab !== activeTabRef.current) {
      setActiveTab(validTab);
      setVisitedTabs((prev) => prev.has(validTab) ? prev : new Set([...prev, validTab]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to hash changes
  }, [hashParams]);

  const allocationsEnabled = visitedTabs.has('allocations');
  const assignmentsEnabled = visitedTabs.has('assignments');

  const { count: pendingCount, refetch: refetchPendingCount } = usePendingAllocationCount(allResourceIds, allocationsEnabled);
  const { count: assignmentIssueCount, refetch: refetchAssignmentIssues } = useAssignmentIssueCount(allResourceIds, assignmentsEnabled);

  // ── Pre-calculated summary tree ──
  const { currentPeriodId } = useSharedData();
  const [summaryRefreshKey] = useState(0);

  // Fetch allocation summaries eagerly (lightweight pre-computed data) so completion
  // chips in the nav are visible without requiring the Allocations tab to be visited.
  const allocSummaryEnabled = !!currentPeriodId;
  const { rollups: allocRollups } = useManagerSummaryTree(
    ManagerSummaryType.Allocation, currentPeriodId, summaryRefreshKey, allocSummaryEnabled,
  );
  // Fallback: fetch unfiltered summaries when the current-period summaries are absent
  // or all-zero (e.g. a new period before the batch job has run).
  // Note: Array.from([]).every(...) is vacuously true, so size=0 also triggers this.
  const shouldFetchAllocFallback = allocSummaryEnabled
    && !!currentPeriodId
    && Array.from(allocRollups.values()).every((rollup) => (
      rollup.pendingCount === 0
      && rollup.totalEmployees === 0
      && rollup.noRecordsCount === 0
      && rollup.nottotalingCount === 0
    ));
  const { rollups: allocFallbackRollups } = useManagerSummaryTree(
    ManagerSummaryType.Allocation,
    null,
    summaryRefreshKey,
    shouldFetchAllocFallback,
    {
      allowUnfilteredAllocation: true,
      transformResults: selectBestSummaryPerManager,
    },
  );
  const { rollups: assignRollups } = useManagerSummaryTree(
    ManagerSummaryType.Assignment, null, summaryRefreshKey, assignmentsEnabled,
  );

  // Use summary tree rollups when available, fall back to aggregate queries
  const rootId = scopeRootResource?.cai_resourceid ?? '';
  const scopedManagerResourceId = selectedManagerId === '__direct_team__' ? rootId : selectedManagerId;

  const scopedAllocRollup = getRollup(allocRollups, scopedManagerResourceId);
  const scopedAllocFallbackRollup = getRollup(allocFallbackRollups, scopedManagerResourceId);
  const scopedAssignRollup = getRollup(assignRollups, scopedManagerResourceId);

  // Prefer period-filtered rollup, then unfiltered fallback, then aggregate query
  const effectivePendingCount = scopedAllocRollup && scopedAllocRollup.pendingCount > 0
    ? scopedAllocRollup.pendingCount
    : scopedAllocFallbackRollup && scopedAllocFallbackRollup.pendingCount > 0
      ? scopedAllocFallbackRollup.pendingCount
      : pendingCount;
  const effectiveAssignmentIssueCount = scopedAssignRollup && scopedAssignRollup.alertCount > 0
    ? scopedAssignRollup.alertCount
    : assignmentIssueCount;

  // Summary-based tree badge counts (assignment alerts per manager)
  const summaryAlertCountById = useMemo(() => {
    if (assignRollups.size === 0) return undefined;
    const map = new Map<string, number>();
    for (const [managerId, rollup] of assignRollups) {
      if (rollup.alertCount > 0) {
        map.set(managerId, rollup.alertCount);
      }
    }
    return map;
  }, [assignRollups]);

  // Allocation completion % per manager for the current period.
  // completionPct = (totalEmployees - pendingCount) / totalEmployees * 100
  // Prefer current-period rollups; fall back to unfiltered when period has no data yet.
  const summaryCompletionById = useMemo(() => {
    const sourceRollups = allocRollups.size > 0 ? allocRollups : allocFallbackRollups;
    if (sourceRollups.size === 0) return undefined;
    const map = new Map<string, number>();
    for (const [managerId, rollup] of sourceRollups) {
      if (rollup.totalEmployees > 0) {
        const pct = Math.round(
          ((rollup.totalEmployees - rollup.pendingCount) / rollup.totalEmployees) * 100,
        );
        map.set(managerId, pct);
      }
    }
    return map;
  }, [allocRollups, allocFallbackRollups]);

  const handleAllocationChange = useCallback(() => {
    void refetchPendingCount();
    void refetchAssignmentIssues();
  }, [refetchPendingCount, refetchAssignmentIssues]);

  const handlePeriodChange = useCallback((periodId: string | null) => {
    setActivePeriodId(periodId);
    if (periodId) {
      setHashParam('period', periodId);
    } else {
      clearHashParam('period');
    }
  }, [setHashParam, clearHashParam]);

  const handleResourceChange = useCallback((id: string | null) => {
    setActiveResourceId(id);
    if (id) {
      setHashParam('resource', id);
    } else {
      clearHashParam('resource');
    }
  }, [setHashParam, clearHashParam]);

  const handleAssignmentViewChange = useCallback((viewMode: string, serviceId: string | null) => {
    if (viewMode === 'services' && serviceId) {
      setHashParam('view', 'services');
      setHashParam('service', serviceId);
    } else {
      clearHashParam('view');
      clearHashParam('service');
    }
  }, [setHashParam, clearHashParam]);

  const checkForUpdatedBuild = useCallback(async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('__buildcheck', Date.now().toString());

      const response = await fetch(url.toString(), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Update check failed with ${response.status}`);
      }

      const html = await response.text();
      const remoteDocument = new DOMParser().parseFromString(html, 'text/html');
      const remoteVersion = remoteDocument
        .querySelector(`meta[name="${BUILD_VERSION_META_NAME}"]`)
        ?.getAttribute('content')
        ?.trim();

      if (!remoteVersion) {
        console.warn('Build update check did not find a version marker in the published HTML.');
        return;
      }

      setAvailableVersion(remoteVersion !== APP_VERSION ? remoteVersion : null);
    } catch (error) {
      console.warn('Build update check failed.', error);
    }
  }, []);

  const handleRefreshForLatestBuild = useCallback(() => {
    trackEvent('BuildUpdateRefreshClicked', {
      properties: {
        currentVersion: APP_VERSION,
        availableVersion: availableVersion ?? APP_VERSION,
      },
    });
    const refreshUrl = new URL(window.location.href);
    refreshUrl.searchParams.set('pnv', availableVersion ?? APP_VERSION);
    refreshUrl.searchParams.delete('__buildcheck');
    window.location.replace(refreshUrl.toString());
  }, [availableVersion]);

  const handleDismissBuildUpdate = useCallback(() => {
    trackEvent('BuildUpdateDismissed', {
      properties: {
        currentVersion: APP_VERSION,
        availableVersion: availableVersion ?? APP_VERSION,
      },
    });
    setAvailableVersion(null);
  }, [availableVersion]);

  useEffect(() => {
    void checkForUpdatedBuild();
  }, [checkForUpdatedBuild]);

  // Non-manager guard: not a manager AND no active delegation scopes.
  // Also suppressed while hooks are still initializing for the current resourceId,
  // or if delegation/direct-reports lookup failed (to avoid false "no access" on errors).
  const isNonManagerUser = isCurrentUserManager === false
    && !delegationsLoading
    && !delegationError
    && !directReports.error
    && delegationScopes.length === 0
    && !hooksInitializing;

  // Delegate-only users: still on 'self' scope while the auto-switch effect is pending.
  // Treat as loading so tabs don't flash the user's own (empty) team.
  const pendingDelegateSwitch = isCurrentUserManager === false
    && delegationScopes.length > 0
    && activeScopeId === 'self';

  // Also loading while hooks are initializing or delegations are still being fetched
  const resourcesLoading = currentUser.loading || directReports.loading || pendingDelegateSwitch
    || (managerStatusLoading && activeScopeId === 'self')
    || (isCurrentUserManager === false && delegationsLoading)
    || hooksInitializing;
  const resourcesError = currentUser.missingResourceHelp ? (
    <div className={styles.supportErrorContent}>
      <Text>
        We couldn&apos;t find your Portfolio Navigator resource record. Please{' '}
        <Link href={currentUser.missingResourceHelp.emailHref}>
          email {currentUser.missingResourceHelp.emailAddress}
        </Link>{' '}
        to send this error to the support team.
      </Text>
      <div className={styles.supportErrorDetails}>
        <Text size={200}>
          {currentUser.missingResourceHelp.technicalDetails}
        </Text>
      </div>
    </div>
  ) : currentUser.error ?? directReports.error ?? delegationError;

  useEffect(() => {
    if (currentUser.loading || hooksInitializing) {
      return;
    }

    if (currentUser.missingResourceHelp) {
      console.warn('[PortfolioNavigator] Access blocked: current user has no matching active cai_resource record.', {
        userId: currentUser.userId,
        technicalDetails: currentUser.missingResourceHelp.technicalDetails,
      });
      return;
    }

    if (currentUser.error) {
      console.error('[PortfolioNavigator] Access blocked while loading current user.', {
        userId: currentUser.userId,
        resourceId: currentUser.resourceId,
        error: currentUser.error,
      });
      return;
    }

    if (delegationsLoading || managerStatusLoading) {
      return;
    }

    if (isNonManagerUser) {
      console.warn('[PortfolioNavigator] Access blocked: user is not recognized as a manager and no usable delegation scopes were resolved.', {
        userId: currentUser.userId,
        resourceId: currentUser.resourceId,
        isCurrentUserManager,
        delegationScopeCount: delegationScopes.length,
        activeScopeId,
      });
      return;
    }

    if (pendingDelegateSwitch) {
      console.info('[PortfolioNavigator] Delegate access detected; waiting to auto-switch into delegated scope.', {
        userId: currentUser.userId,
        resourceId: currentUser.resourceId,
        delegationScopeCount: delegationScopes.length,
        activeScopeId,
      });
      return;
    }

    if (isCurrentUserManager === false && delegationScopes.length > 0) {
      console.info('[PortfolioNavigator] Delegate access enabled.', {
        userId: currentUser.userId,
        resourceId: currentUser.resourceId,
        activeScopeId,
        delegationScopeLabels: delegationScopes.map((scope) => scope.label),
      });
    }
  }, [
    activeScopeId,
    currentUser.error,
    currentUser.loading,
    currentUser.missingResourceHelp,
    currentUser.resourceId,
    currentUser.userId,
    delegationScopes,
    delegationsLoading,
    hooksInitializing,
    isCurrentUserManager,
    isNonManagerUser,
    managerStatusLoading,
    pendingDelegateSwitch,
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkForUpdatedBuild();
      }
    }, BUILD_UPDATE_CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdatedBuild();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdatedBuild]);

  useEffect(() => {
    setTelemetryContext({
      appVersion: APP_VERSION,
      activeTab,
      trainingMode,
      userId: currentUser.userId ?? undefined,
      resourceId: currentUser.resourceId ?? undefined,
    });
  }, [activeTab, currentUser.resourceId, currentUser.userId, trainingMode]);

  useEffect(() => {
    trackPageView(`Portfolio Navigator - ${activeTab}`, `${window.location.pathname}#${activeTab}`, {
      tab: activeTab,
      trainingMode,
    });
  }, [activeTab, trainingMode]);

  useEffect(() => {
    if (!availableVersion) {
      return;
    }

    trackEvent('BuildUpdateAvailable', {
      properties: {
        currentVersion: APP_VERSION,
        availableVersion,
      },
    });
  }, [availableVersion]);

  if (isNonManagerUser) {
    return (
      <>
        <AppHeader
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          trainingMode={trainingMode}
          onToggleTrainingMode={onToggleTrainingMode}
        />
        <div className={styles.nonManagerMessage}>
          <div className={styles.nonManagerCard}>
            <Text size={500} weight="semibold">Welcome to Portfolio Navigator</Text>
            <Text size={400}>
              This app is designed for <strong>managers</strong> and their <strong>delegates</strong> to
              review and manage team allocations and assignments.
            </Text>
            <Text size={300}>
              It looks like you don&apos;t currently have any direct reports or active delegation
              records, so there&apos;s nothing to display here.
            </Text>
            <Text size={300}>
              If you believe you should have access, please reach out:
            </Text>
            <ul className={styles.nonManagerLinks}>
              <li>
                <Link href="mailto:PortfolioNavigatorHelp@Microsoft.com">
                  Email PortfolioNavigatorHelp@Microsoft.com
                </Link>
              </li>
              <li>
                Join the <strong>Portfolio Navigator Office Hours</strong> for live assistance
              </li>
            </ul>
            <div className={styles.supportErrorDetails}>
              <Text size={200}>
                {[
                  `App version: ${APP_VERSION}`,
                  `Signed in as: ${getCurrentUserName() ?? '(unknown)'}`,
                  `User ID: ${currentUser.userId ?? '(unknown)'}`,
                  currentUser.resource
                    ? `Resource: ${currentUser.resource.cai_displayname} (${currentUser.resource.cai_resourceid})`
                    : `Resource ID: ${currentUser.resourceId ?? '(none)'}`,
                  `Direct reports query: ${directReports.error ? `error — ${directReports.error}` : `returned ${directReports.resources.length} record(s)`}`,
                  `Delegation scopes: ${delegationScopes.length}${delegationError ? ` (error — ${delegationError})` : ''}`,
                ].join('\n')}
              </Text>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingAllocationCount={effectivePendingCount}
        assignmentIssueCount={effectiveAssignmentIssueCount}
        trainingMode={trainingMode}
        onToggleTrainingMode={onToggleTrainingMode}
        managerOptions={managerOptions}
        resources={directReports.resources}
        subManagerIds={directReports.subManagerIds}
        delegationScopes={delegationScopes}
        activeScopeId={activeScopeId}
        selectedManagerId={selectedManagerId}
        onTeamSelect={handleTeamSelect}
        managerAlertStatuses={managerAlertStatuses}
        summaryAlertCountById={summaryAlertCountById}
        summaryCompletionById={summaryCompletionById}
        isCurrentUserManager={isCurrentUserManager ?? false}
        linkState={{
          tab: activeTab,
          managerId: selectedManagerId !== '__direct_team__' ? selectedManagerId : undefined,
          periodId: activePeriodId ?? undefined,
          resourceId: activeTab === 'allocations' ? (activeResourceId ?? undefined) : undefined,
        }}
      />
      {availableVersion && (
        <div className={styles.updateBanner}>
          <Text size={300} weight="semibold" className={styles.updateBannerText}>
            A newer build ({availableVersion}) is available. Refresh to load the latest app and clear stale cached content.
          </Text>
          <div className={styles.updateBannerActions}>
            <Button size="small" appearance="primary" onClick={handleRefreshForLatestBuild}>
              Refresh now
            </Button>
            <Button size="small" appearance="subtle" onClick={handleDismissBuildUpdate}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      <div className={styles.content}>
        {activeTab === 'allocations' && (
          <AllocationsTab
            managerResource={scopeRootResource}
            resources={directReports.resources}
            subReportsByManager={directReports.subReportsByManager}
            subManagerIds={directReports.subManagerIds}
            resourcesLoading={resourcesLoading}
            resourcesError={resourcesError}
            onAllocationChange={handleAllocationChange}
            loadManagerTeam={directReports.loadManagerTeam}
            loadedManagerIds={directReports.loadedManagerIds}
            selectedManagerId={selectedManagerId}
            onSelectedManagerChange={setSelectedManagerId}
            allocRollups={allocRollups}
            allocFallbackRollups={allocFallbackRollups}
            summaryCompletionById={summaryCompletionById}
            initialPeriodId={hashParams.get('period') ?? undefined}
            onPeriodChange={handlePeriodChange}
            initialResourceId={hashParams.get('resource') ?? undefined}
            onResourceChange={handleResourceChange}
          />
        )}
        {activeTab === 'assignments' && (
          <AssignmentsTab
            managerResource={scopeRootResource}
            resources={directReports.resources}
            subReportsByManager={directReports.subReportsByManager}
            subManagerIds={directReports.subManagerIds}
            resourcesLoading={resourcesLoading}
            resourcesError={resourcesError}
            onAssignmentChange={refetchAssignmentIssues}
            loadManagerTeam={directReports.loadManagerTeam}
            loadedManagerIds={directReports.loadedManagerIds}
            loadingManagerId={directReports.loadingManagerId}
            selectedManagerId={selectedManagerId}
            onSelectedManagerChange={setSelectedManagerId}
            onManagerAlertStatusesChange={setManagerAlertStatuses}
            assignRollups={assignRollups}
            initialViewMode={hashParams.get('view') === 'services' ? 'services' : undefined}
            initialServiceId={hashParams.get('service') ?? undefined}
            onViewChange={handleAssignmentViewChange}
          />
        )}
        {activeTab === 'services' && (
          <ServiceHierarchyTab />
        )}
        {activeTab === 'help' && (
          <HelpTab />
        )}
      </div>
    </>
  );
}
