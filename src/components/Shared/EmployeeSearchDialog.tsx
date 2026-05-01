/* ── Employee Search Dialog ── */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Button,
  Input,
  Text,
  Spinner,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { SearchRegular, DismissRegular, PersonRegular, PeopleTeamRegular } from '@fluentui/react-icons';
import type { IResource } from '../../types';
import { searchResources, getResourceById } from '../../api';
import { getInitials, trackEvent } from '../../utils';

export interface EmployeeSearchResult {
  /** The found resource */
  resource: IResource;
  /** True if the found resource is a manager (has direct reports in the current scope) */
  isManager: boolean;
  /** The manager whose team should be opened (the resource itself if manager, otherwise their parent) */
  navigateToManagerId: string;
  /** The resource to highlight/select after navigating (null if the target is the manager themselves) */
  highlightResourceId: string | null;
}

interface EmployeeSearchDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called when a search result is selected and verified in hierarchy */
  onResultSelect: (result: EmployeeSearchResult) => void;
  /** The scope root resource ID — top of the authorized hierarchy */
  scopeRootResourceId: string | null;
  /** Set of resource IDs already loaded and known to be managers */
  subManagerIds: Set<string>;
  /** All currently-loaded resources (for fast local lookups) */
  loadedResources: IResource[];
}

const useStyles = makeStyles({
  surface: {
    maxWidth: '520px',
    width: '100%',
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  searchInput: {
    flex: 1,
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '12px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    '&:hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '12px',
    flexShrink: 0,
  },
  resultInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  resultName: {
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultAlias: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
  countLabel: {
    color: tokens.colorNeutralForeground3,
    marginTop: '8px',
  },
});

/**
 * Walk up the manager chain from `startId` to see if we reach `scopeRootId`.
 * Returns the chain of resources from start to root (inclusive), or null if
 * the person is not in the authorized hierarchy.
 */
async function walkUpToScopeRoot(
  startId: string,
  scopeRootId: string,
  loadedResources: IResource[],
): Promise<IResource[] | null> {
  const resourceCache = new Map<string, IResource>();
  for (const r of loadedResources) {
    resourceCache.set(r.cai_resourceid, r);
  }

  const chain: IResource[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = startId;

  // Walk up max 20 levels to avoid infinite loops
  for (let i = 0; i < 20 && currentId; i++) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    if (currentId === scopeRootId) {
      // Found in hierarchy — get the root resource and add to chain
      let rootResource = resourceCache.get(currentId);
      if (!rootResource) {
        rootResource = await getResourceById(currentId) ?? undefined;
      }
      if (rootResource) chain.push(rootResource);
      return chain;
    }

    let resource = resourceCache.get(currentId);
    if (!resource) {
      resource = await getResourceById(currentId) ?? undefined;
      if (resource) resourceCache.set(currentId, resource);
    }

    if (!resource) break;
    chain.push(resource);
    currentId = resource._cai_managerresourceid_value;
  }

  return null;
}

export function EmployeeSearchDialog({
  open,
  onClose,
  onResultSelect,
  scopeRootResourceId,
  subManagerIds,
  loadedResources,
}: EmployeeSearchDialogProps) {
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<IResource[]>([]);
  const [searching, setSearching] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setResults([]);
      setError(null);
      setHasSearched(false);
      setVerifying(null);
      // Focus the input after a brief delay for the dialog to render
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSearch = useCallback(async () => {
    const trimmed = searchTerm.trim();
    if (trimmed.length === 0) return;

    setSearching(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    try {
      trackEvent('EmployeeSearchExecuted', {
        properties: {
          termLength: trimmed.length,
        },
      });
      const found = await searchResources(trimmed, 30);
      setResults(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleSearch();
      }
    },
    [handleSearch],
  );

  const handleSelect = useCallback(
    async (resource: IResource) => {
      if (!scopeRootResourceId) return;

      setVerifying(resource.cai_resourceid);
      setError(null);

      try {
        // Check if the resource IS the scope root
        if (resource.cai_resourceid === scopeRootResourceId) {
          onResultSelect({
            resource,
            isManager: true,
            navigateToManagerId: '__direct_team__',
            highlightResourceId: null,
          });
          trackEvent('EmployeeSearchNavigated', {
            properties: { resultType: 'scopeRoot' },
          });
          onClose();
          return;
        }

        // Walk up the manager chain to verify they're in the hierarchy
        const chain = await walkUpToScopeRoot(
          resource.cai_resourceid,
          scopeRootResourceId,
          loadedResources,
        );

        if (!chain) {
          setError(
            `${resource.cai_displayname} was not found in your authorized hierarchy. ` +
            `They may be in a different part of the organization.`,
          );
          setVerifying(null);
          trackEvent('EmployeeSearchNotInHierarchy', {
            properties: { resourceAlias: resource.cai_alias },
          });
          return;
        }

        // Determine navigation target
        const isManager = subManagerIds.has(resource.cai_resourceid);

        if (isManager) {
          // Navigate to this manager's team view
          onResultSelect({
            resource,
            isManager: true,
            navigateToManagerId: resource.cai_resourceid,
            highlightResourceId: null,
          });
          trackEvent('EmployeeSearchNavigated', {
            properties: { resultType: 'manager', chainLength: chain.length },
          });
        } else {
          // Navigate to their manager's team and highlight this person
          const managerId = resource._cai_managerresourceid_value;
          if (managerId && managerId !== scopeRootResourceId) {
            onResultSelect({
              resource,
              isManager: false,
              navigateToManagerId: managerId,
              highlightResourceId: resource.cai_resourceid,
            });
          } else {
            // Direct report of scope root
            onResultSelect({
              resource,
              isManager: false,
              navigateToManagerId: '__direct_team__',
              highlightResourceId: resource.cai_resourceid,
            });
          }
          trackEvent('EmployeeSearchNavigated', {
            properties: { resultType: 'employee', chainLength: chain.length },
          });
        }

        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify hierarchy access');
      } finally {
        setVerifying(null);
      }
    },
    [scopeRootResourceId, subManagerIds, loadedResources, onResultSelect, onClose],
  );

  return (
    <Dialog open={open} onOpenChange={(_e, data) => { if (!data.open) onClose(); }}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<DismissRegular />}
                onClick={onClose}
              />
            }
          >
            Find Employee
          </DialogTitle>
          <DialogContent>
            <div className={styles.searchRow}>
              <Input
                ref={inputRef}
                className={styles.searchInput}
                placeholder="Search by name or alias"
                value={searchTerm}
                onChange={(_e, data) => setSearchTerm(data.value)}
                onKeyDown={handleKeyDown}
                contentBefore={<SearchRegular />}
                disabled={searching}
              />
              <Button
                appearance="primary"
                onClick={handleSearch}
                disabled={searching || searchTerm.trim().length === 0}
              >
                Search
              </Button>
            </div>

            {error && (
              <div style={{ marginTop: '12px' }}>
                <MessageBar intent="warning">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              </div>
            )}

            {searching && (
              <div className={styles.statusRow}>
                <Spinner size="tiny" />
                <Text size={300}>Searching...</Text>
              </div>
            )}

            {!searching && hasSearched && results.length === 0 && !error && (
              <div style={{ marginTop: '12px' }}>
                <MessageBar intent="info">
                  <MessageBarBody>No employees found matching &quot;{searchTerm.trim()}&quot;.</MessageBarBody>
                </MessageBar>
              </div>
            )}

            {results.length > 0 && (
              <>
                <Text size={200} className={styles.countLabel}>
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </Text>
                <div className={styles.resultsList}>
                  {results.map((r) => {
                    const isVerifying = verifying === r.cai_resourceid;
                    const knownManager = subManagerIds.has(r.cai_resourceid);
                    return (
                      <button
                        key={r.cai_resourceid}
                        className={styles.resultItem}
                        onClick={() => { void handleSelect(r); }}
                        disabled={verifying !== null}
                      >
                        <div className={styles.avatar}>
                          {getInitials(r.cai_displayname)}
                        </div>
                        <div className={styles.resultInfo}>
                          <span className={styles.resultName}>
                            {r.cai_displayname}
                            {knownManager && (
                              <PeopleTeamRegular style={{ marginLeft: '4px', verticalAlign: 'middle', fontSize: '14px', color: tokens.colorBrandForeground1 }} />
                            )}
                          </span>
                          <span className={styles.resultAlias}>
                            {r.cai_alias}
                            {r._cai_managerresourceid_value_formatted && (
                              <> · Reports to {r._cai_managerresourceid_value_formatted}</>
                            )}
                          </span>
                        </div>
                        {isVerifying && <Spinner size="tiny" />}
                        {!isVerifying && !knownManager && (
                          <PersonRegular style={{ marginLeft: 'auto', color: tokens.colorNeutralForeground3, fontSize: '16px' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
