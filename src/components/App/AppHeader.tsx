/* ── App Header ── */

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Tooltip,
  TabList,
  Tab,
  Badge,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  SearchBox,
  Tree,
  TreeItem,
  TreeItemLayout,
  Divider,
} from '@fluentui/react-components';
import type { SearchBoxProps, TreeOpenChangeData } from '@fluentui/react-components';
import {
  WeatherMoonRegular,
  WeatherSunnyRegular,
  ClipboardTaskListLtr20Regular,
  CameraSparklesRegular,
  HatGraduationRegular,
  OrganizationRegular,
  Info20Regular,
  PeopleTeamRegular,
  ChevronDownRegular,
  PeopleSwapRegular,
  PersonRegular,
  LinkRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import type { ManagerTreeNode } from '../../utils/managerOptions';
import type { ResolvedScope } from '../../utils/scopeResolver';
import { formatCount } from '../../utils';
import type { ManagerAlertStatus } from '../Assignments/ManagerAlertChips';
import type { IResource } from '../../types';
import logoSvg from '../../assets/PortfolioNavigatorStar.svg';

const PENDING_ORANGE = '#BC4B09';
const TRAINING_ORANGE = '#E97500';
const DIRECT_TEAM = '__direct_team__';

function completionChipStyle(pct: number): { background: string; color: string } {
  if (pct >= 95) return { background: '#DFF6DD', color: '#107C10' };   // green
  if (pct >= 75) return { background: '#FCE9D3', color: '#8A4500' };   // orange
  return { background: '#FDE7E9', color: '#A4262C' };                  // red
}

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    flexShrink: 0,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  teamSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: '8px',
  },
  teamButton: {
    fontWeight: 600,
  },
  spacer: {
    flex: 1,
  },
  trainingBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '6px 16px',
    backgroundColor: TRAINING_ORANGE,
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  },
  popoverSurface: {
    padding: '8px',
    width: '340px',
    maxHeight: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  treeContainer: {
    overflowY: 'auto',
    maxHeight: '320px',
    marginTop: '4px',
  },
  treeItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    borderRadius: tokens.borderRadiusMedium,
  },
  alertBadge: {
    marginLeft: '6px',
  },
  completionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    marginLeft: '6px',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: '16px',
    flexShrink: 0,
  },
  delegationSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingTop: '4px',
  },
  delegationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  delegationItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  noResults: {
    padding: '12px 8px',
    textAlign: 'center' as const,
    color: tokens.colorNeutralForeground3,
  },
  personResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  personResultInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  personResultManager: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sectionLabel: {
    padding: '4px 8px 2px',
    color: tokens.colorNeutralForeground3,
  },
});

function execCommandCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

interface AppLinkState {
  tab: string;
  managerId?: string;
  periodId?: string;
  /** ID of the open employee snapshot, if any. */
  resourceId?: string;
}

interface AppHeaderProps {
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  activeTab: 'allocations' | 'assignments' | 'services' | 'help';
  onTabChange: (tab: 'allocations' | 'assignments' | 'services' | 'help') => void;
  pendingAllocationCount?: number | null;
  assignmentIssueCount?: number | null;
  trainingMode: boolean;
  onToggleTrainingMode: () => void;
  managerOptions?: ManagerTreeNode[];
  resources?: IResource[];
  subManagerIds?: Set<string>;
  delegationScopes?: ResolvedScope[];
  activeScopeId?: string;
  selectedManagerId?: string;
  onTeamSelect?: (value: string) => void;
  managerAlertStatuses?: ManagerAlertStatus[];
  summaryAlertCountById?: Map<string, number>;
  summaryCompletionById?: Map<string, number>;
  isCurrentUserManager?: boolean;
  linkState?: AppLinkState;
}

export function AppHeader({
  themeMode,
  onToggleTheme,
  activeTab,
  onTabChange,
  pendingAllocationCount = 0,
  assignmentIssueCount = 0,
  trainingMode,
  onToggleTrainingMode,
  managerOptions = [],
  resources = [],
  subManagerIds = new Set(),
  delegationScopes = [],
  activeScopeId = 'self',
  selectedManagerId = DIRECT_TEAM,
  onTeamSelect,
  managerAlertStatuses = [],
  summaryAlertCountById,
  summaryCompletionById,
  isCurrentUserManager = true,
  linkState,
}: AppHeaderProps) {
  const styles = useStyles();
  const hasPending = (pendingAllocationCount ?? 0) > 0;
  const hasAssignmentIssues = (assignmentIssueCount ?? 0) > 0;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyLink = useCallback(() => {
    const stateParams = new URLSearchParams();
    stateParams.set('tab', linkState?.tab ?? activeTab);
    if (linkState?.managerId) stateParams.set('manager', linkState.managerId);
    if (linkState?.periodId) stateParams.set('period', linkState.periodId);
    if (linkState?.resourceId) stateParams.set('resource', linkState.resourceId);

    const url = new URL(window.location.href);
    url.hash = stateParams.toString();
    url.search = '';
    const finalUrl = url.toString();

    const done = () => {
      setLinkCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
    };
    const writeToClipboard = (text: string) => {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text).then(done).catch(() => {
          execCommandCopy(text);
          done();
        });
      } else {
        execCommandCopy(text);
        done();
      }
    };
    writeToClipboard(finalUrl);
  }, [linkState, activeTab]);

  // Use pre-calculated summary counts when available, fall back to callback-based
  const alertCountById = useMemo(
    () => summaryAlertCountById ?? new Map(managerAlertStatuses.map((s) => [s.id, s.alerts])),
    [summaryAlertCountById, managerAlertStatuses],
  );

  const showTeamSelector = managerOptions.length > 0 || delegationScopes.length > 0;
  const hasDelegations = delegationScopes.length > 0;
  const isViewingDelegation = activeScopeId !== 'self';

  // Filter tree nodes by search term (case-insensitive). When a child matches,
  // include all its ancestors so the tree structure stays coherent.
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return managerOptions;
    const lowerSearch = search.toLowerCase();

    const matchingIds = new Set<string>();
    for (const opt of managerOptions) {
      if (opt.name.toLowerCase().includes(lowerSearch)) {
        matchingIds.add(opt.id);
      }
    }

    // Walk up to include ancestors of matched nodes
    const ancestorIds = new Set<string>(matchingIds);
    for (const id of matchingIds) {
      let current = managerOptions.find((o) => o.id === id);
      while (current?.parentId) {
        ancestorIds.add(current.parentId);
        current = managerOptions.find((o) => o.id === current!.parentId);
      }
    }

    return managerOptions.filter((opt) => ancestorIds.has(opt.id));
  }, [managerOptions, search]);

  // Search non-manager people and map each to their direct manager's ID + name
  const matchedPeople = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return [];
    const lowerSearch = search.toLowerCase();
    const managerIdSet = new Set(managerOptions.map((o) => o.id));

    const resourceById = new Map(resources.map((r) => [r.cai_resourceid, r]));

    const results: { id: string; name: string; managerId: string; managerName: string }[] = [];
    for (const resource of resources) {
      // Skip managers — they already appear in the tree
      if (subManagerIds.has(resource.cai_resourceid)) continue;
      if (!resource.cai_displayname.toLowerCase().includes(lowerSearch)) continue;

      // Walk up the chain to find the nearest manager that's in our tree
      let managerId = resource._cai_managerresourceid_value ?? '';
      let managerName = resource._cai_managerresourceid_value_formatted ?? '';

      // If the direct manager isn't in our tree, walk up to find one that is
      let walked = resourceById.get(managerId);
      while (walked && !managerIdSet.has(walked.cai_resourceid) && walked.cai_resourceid !== managerId) {
        managerId = walked._cai_managerresourceid_value ?? '';
        managerName = walked.cai_displayname;
        walked = resourceById.get(managerId);
      }

      // If we found a tree manager, or the direct manager is the scope root (DIRECT_TEAM)
      const targetManagerId = managerIdSet.has(managerId) ? managerId : DIRECT_TEAM;
      const targetManagerName = managerIdSet.has(managerId) ? managerName : 'Direct Team';

      results.push({
        id: resource.cai_resourceid,
        name: resource.cai_displayname,
        managerId: targetManagerId,
        managerName: targetManagerName,
      });
    }

    return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
  }, [resources, subManagerIds, managerOptions, search]);

  const getDisplayValue = (): string => {
    if (isViewingDelegation && selectedManagerId === DIRECT_TEAM) {
      const scope = delegationScopes.find((s) => s.id === activeScopeId);
      return scope?.label ?? 'Delegated Team';
    }
    if (selectedManagerId === DIRECT_TEAM) {
      return 'My Direct Team';
    }
    const mgr = managerOptions.find((o) => o.id === selectedManagerId);
    return mgr ? `${mgr.name}'s Team` : 'My Direct Team';
  };

  const handleSelect = useCallback((value: string) => {
    void onTeamSelect?.(value);
    setPopoverOpen(false);
    setSearch('');
  }, [onTeamSelect]);

  const handleSearchChange: SearchBoxProps['onChange'] = (_e, data) => {
    setSearch(data.value);
  };

  const handlePopoverOpenChange = (_e: unknown, data: { open: boolean }) => {
    setPopoverOpen(data.open);
    if (!data.open) {
      setSearch('');
    }
  };

  // Build children lookup for nested tree rendering
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, ManagerTreeNode[]>();
    for (const opt of filteredOptions) {
      const list = map.get(opt.parentId) ?? [];
      list.push(opt);
      map.set(opt.parentId, list);
    }
    return map;
  }, [filteredOptions]);

  // Determine which nodes should be open. When searching, expand all; otherwise
  // expand the path from the root to the currently selected manager.
  const computeOpenItems = useCallback((): Set<string> => {
    if (search.trim()) {
      return new Set(managerOptions.filter((o) => o.hasChildren).map((o) => o.id));
    }
    if (selectedManagerId === DIRECT_TEAM) return new Set<string>();
    const path = new Set<string>();
    let current = managerOptions.find((o) => o.id === selectedManagerId);
    while (current?.parentId) {
      path.add(current.parentId);
      current = managerOptions.find((o) => o.id === current!.parentId);
    }
    return path;
  }, [managerOptions, selectedManagerId, search]);

  const [openItems, setOpenItems] = useState<Set<string>>(computeOpenItems);

  // Sync open items when search or selection changes
  const prevSearchRef = useRef(search);
  const prevSelectedRef = useRef(selectedManagerId);
  if (search !== prevSearchRef.current || selectedManagerId !== prevSelectedRef.current) {
    prevSearchRef.current = search;
    prevSelectedRef.current = selectedManagerId;
    setOpenItems(computeOpenItems());
  }

  const handleTreeOpenChange = useCallback((_e: unknown, data: TreeOpenChangeData) => {
    setOpenItems(data.openItems as Set<string>);
  }, []);

  // Recursive renderer for nested tree items
  const renderTreeItems = useCallback((parentId: string | null): React.ReactNode => {
    const children = childrenByParent.get(parentId);
    if (!children || children.length === 0) return null;

    return children.map((opt) => {
      const alertCount = alertCountById.get(opt.id) ?? 0;
      const completion = summaryCompletionById?.get(opt.id);
      const isSelected = opt.id === selectedManagerId;
      const subItems = childrenByParent.get(opt.id);
      const hasVisibleChildren = subItems && subItems.length > 0;
      const itemType = hasVisibleChildren ? 'branch' : 'leaf';

      return (
        <TreeItem key={opt.id} value={opt.id} itemType={itemType}>
          <TreeItemLayout
            onClick={(e) => { e.stopPropagation(); handleSelect(opt.id); }}
            className={isSelected ? styles.treeItemSelected : undefined}
            style={{ cursor: 'pointer' }}
          >
            <span>
              {opt.name}&apos;s Team
              {alertCount > 0 && (
                <Badge
                  className={styles.alertBadge}
                  appearance="filled"
                  color="danger"
                  size="small"
                >
                  {formatCount(alertCount)}
                </Badge>
              )}
              {completion !== undefined && (
                <Tooltip
                  content={`${completion}% approved`}
                  relationship="label"
                >
                  <span
                    className={styles.completionChip}
                    style={completionChipStyle(completion)}
                  >
                    {completion}% Approved
                  </span>
                </Tooltip>
              )}
            </span>
          </TreeItemLayout>
          {hasVisibleChildren && (
            <Tree>{renderTreeItems(opt.id)}</Tree>
          )}
        </TreeItem>
      );
    });
  }, [childrenByParent, alertCountById, summaryCompletionById, selectedManagerId, handleSelect, styles.treeItemSelected, styles.alertBadge, styles.completionChip]);

  return (
    <>
      {trainingMode && (
        <div className={styles.trainingBanner}>
          <HatGraduationRegular fontSize={18} />
          Training Mode — Using demo data. Changes will not affect real records.
          <Button
            size="small"
            appearance="secondary"
            onClick={onToggleTrainingMode}
            style={{ marginLeft: '8px', color: TRAINING_ORANGE, minWidth: 'auto' }}
          >
            Exit Training
          </Button>
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.title}>
          <img src={logoSvg} alt="" width={24} height={24} style={themeMode === 'dark' ? { filter: 'invert(1)' } : undefined} />
          <Text size={500} weight="semibold">
            Portfolio Navigator for Managers
          </Text>
          {trainingMode && (
            <Badge appearance="filled" color="warning" size="small" style={{ marginLeft: '4px' }}>
              TRAINING
            </Badge>
          )}
        </div>
        {showTeamSelector && (
          <Popover
            open={popoverOpen}
            onOpenChange={handlePopoverOpenChange}
            positioning="below-start"
            trapFocus
          >
            <PopoverTrigger disableButtonEnhancement>
              <Button
                className={styles.teamButton}
                appearance="subtle"
                size="small"
                icon={<PeopleTeamRegular />}
                iconPosition="before"
              >
                {getDisplayValue()}
                <ChevronDownRegular style={{ marginLeft: 4, fontSize: 12 }} />
              </Button>
            </PopoverTrigger>
            <PopoverSurface className={styles.popoverSurface}>
              <SearchBox
                ref={searchRef}
                placeholder="Search teams..."
                size="small"
                value={search}
                onChange={handleSearchChange}
                style={{ width: '100%' }}
              />
              <div className={styles.treeContainer}>
                {/* "My Direct Team" root item — always visible when not searching */}
                {/* "My Direct Team" root — only for users who are managers */}
                {!search.trim() && isCurrentUserManager && (
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<PeopleTeamRegular />}
                    onClick={() => handleSelect(hasDelegations && isViewingDelegation ? 'self' : DIRECT_TEAM)}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      fontWeight: selectedManagerId === DIRECT_TEAM && !isViewingDelegation ? 700 : 400,
                      backgroundColor: selectedManagerId === DIRECT_TEAM && !isViewingDelegation
                        ? tokens.colorNeutralBackground1Selected : undefined,
                      borderRadius: tokens.borderRadiusMedium,
                    }}
                  >
                    {isViewingDelegation ? 'My Team ←' : 'My Direct Team'}
                  </Button>
                )}

                {/* Hierarchical sub-managers */}
                {filteredOptions.length > 0 && (
                  <Tree
                    aria-label="Team hierarchy"
                    openItems={openItems}
                    onOpenChange={handleTreeOpenChange}
                  >
                    {renderTreeItems(null)}
                  </Tree>
                )}

                {/* People search results */}
                {search.trim() && matchedPeople.length > 0 && (
                  <>
                    {filteredOptions.length > 0 && <Divider style={{ margin: '4px 0' }} />}
                    <Text size={200} weight="semibold" className={styles.sectionLabel}>
                      People
                    </Text>
                    {matchedPeople.map((person) => (
                      <div
                        key={person.id}
                        className={styles.personResult}
                        onClick={() => handleSelect(person.managerId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(person.managerId); }}
                      >
                        <PersonRegular fontSize={16} />
                        <div className={styles.personResultInfo}>
                          <Text size={300}>{person.name}</Text>
                          <span className={styles.personResultManager}>
                            → {person.managerName === 'Direct Team' ? 'My Direct Team' : `${person.managerName}'s Team`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {search.trim() && filteredOptions.length === 0 && matchedPeople.length === 0 && (
                  <div className={styles.noResults}>
                    <Text size={200}>No matching teams or people</Text>
                  </div>
                )}
              </div>

              {/* Delegation scopes */}
              {hasDelegations && (
                <>
                  <Divider />
                  <div className={styles.delegationSection}>
                    <Text size={200} weight="semibold" style={{ padding: '2px 8px', color: tokens.colorNeutralForeground3 }}>
                      Delegated Teams
                    </Text>
                    {delegationScopes.map((scope) => (
                      <div
                        key={scope.id}
                        className={`${styles.delegationItem} ${activeScopeId === scope.id ? styles.delegationItemActive : ''}`}
                        onClick={() => handleSelect(scope.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(scope.id); }}
                      >
                        <PeopleSwapRegular fontSize={16} />
                        <Text size={300}>{scope.label}</Text>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </PopoverSurface>
          </Popover>
        )}
        <div className={styles.spacer} />
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_e, data) => onTabChange(data.value as 'allocations' | 'assignments' | 'services' | 'help')}
          size="large"
        >
          <Tab
            value="allocations"
            icon={<CameraSparklesRegular style={hasPending ? { color: PENDING_ORANGE } : undefined} />}
            style={hasPending && activeTab === 'allocations' ? { borderBottomColor: PENDING_ORANGE } : undefined}
          >
            <span style={hasPending ? { color: PENDING_ORANGE } : undefined}>
              Snapshots
            </span>
          </Tab>
          <Tab
            value="assignments"
            icon={<ClipboardTaskListLtr20Regular style={hasAssignmentIssues ? { color: PENDING_ORANGE } : undefined} />}
            style={hasAssignmentIssues && activeTab === 'assignments' ? { borderBottomColor: PENDING_ORANGE } : undefined}
          >
            <span style={hasAssignmentIssues ? { color: PENDING_ORANGE } : undefined}>Assignments</span>
          </Tab>
          <Tab
            value="services"
            icon={<OrganizationRegular />}
          >
            <span>Services &amp; Initiatives</span>
          </Tab>
          <Tab
            value="help"
            icon={<Info20Regular />}
            aria-label="Help"
            title="Help"
          />
        </TabList>
        {!trainingMode && (
          <Tooltip content="Enter training mode (uses demo data)" relationship="label">
            <Button
              appearance="subtle"
              icon={<HatGraduationRegular />}
              onClick={onToggleTrainingMode}
              aria-label="Enter training mode"
            />
          </Tooltip>
        )}
        <Tooltip
          content={linkCopied ? 'Link copied!' : 'Copy link to this view'}
          relationship="label"
        >
          <Button
            appearance="subtle"
            icon={linkCopied ? <CheckmarkRegular /> : <LinkRegular />}
            onClick={handleCopyLink}
            aria-label="Copy link to this view"
          />
        </Tooltip>
        <Tooltip
          content={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          relationship="label"
        >
          <Button
            appearance="subtle"
            icon={themeMode === 'light' ? <WeatherMoonRegular /> : <WeatherSunnyRegular />}
            onClick={onToggleTheme}
            aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          />
        </Tooltip>
      </header>
    </>
  );
}
