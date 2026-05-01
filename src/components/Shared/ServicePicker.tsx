/* ── Hierarchical Service Picker ──
 * A viewport-aware picker that shows services grouped by area and team
 * with collapsible sections and search. Uses a dialog fallback when
 * zoom or constrained viewport space makes a popover unreliable.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Input,
  Text,
  Button,
  Tooltip,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components';
import {
  SearchRegular,
  ChevronDown20Regular,
  ChevronRight20Regular,
  Checkmark20Regular,
} from '@fluentui/react-icons';
import type { PositioningShorthand } from '@fluentui/react-positioning';
import type { IServiceOrInitiative } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { ServiceTooltipContent, hasServiceTooltipContent } from './ServiceTooltipContent';

const VIEWPORT_MARGIN_PX = 16;
const DEFAULT_SURFACE_WIDTH_PX = 360;
const DEFAULT_SURFACE_MAX_HEIGHT_PX = 420;
const MIN_POPOVER_HEIGHT_PX = 220;
const DIALOG_FALLBACK_HEIGHT_PX = 320;
const TOOLTIP_SHOW_DELAY_MS = 400;
const SERVICE_TOOLTIP_POSITIONING: PositioningShorthand = {
  position: 'before',
  fallbackPositions: ['above-start', 'below-start'],
};

const useStyles = makeStyles({
  trigger: {
    width: '100%',
    justifyContent: 'flex-start',
    fontWeight: 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  triggerPlaceholder: {
    color: tokens.colorNeutralForeground3,
  },
  surface: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dialogSurface: {
    width: 'min(640px, calc(100vw - 32px))',
    maxWidth: '100%',
    maxHeight: 'calc(100dvh - 32px)',
  },
  dialogBody: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    maxHeight: 'calc(100dvh - 32px)',
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    padding: 0,
  },
  dialogActions: {
    paddingTop: '12px',
  },
  searchBox: {
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  areaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    userSelect: 'none',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
    },
  },
  teamHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px 6px 28px',
    color: tokens.colorNeutralForeground3,
  },
  serviceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px 6px 44px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  serviceItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  serviceLabel: {
    flex: 1,
    minWidth: 0,
  },
  serviceLabelTrigger: {
    display: 'inline-flex',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
  },
  chevron: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  checkIcon: {
    flexShrink: 0,
    color: tokens.colorBrandForeground1,
  },
  emptyState: {
    padding: '16px',
    textAlign: 'center' as const,
  },
  emptyStateTitle: {
    display: 'block',
    textAlign: 'center' as const,
    width: '100%',
  },
  emptyStateHelp: {
    marginTop: '8px',
    lineHeight: '18px',
  },
});

function getViewportMetrics() {
  if (typeof window === 'undefined') {
    return { width: DEFAULT_SURFACE_WIDTH_PX, height: DEFAULT_SURFACE_MAX_HEIGHT_PX * 2 };
  }

  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight),
  };
}

interface ServicePickerProps {
  hierarchy: ServiceHierarchyNode[];
  services: IServiceOrInitiative[];
  selectedServiceId: string | null;
  disabledServiceIds?: Set<string>;
  onSelect: (serviceId: string, serviceName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ServicePicker({
  hierarchy,
  services,
  selectedServiceId,
  disabledServiceIds,
  onSelect,
  disabled,
  placeholder = 'Select service or initiative...',
}: ServicePickerProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [viewport, setViewport] = useState(getViewportMetrics);
  const [surfaceMaxHeight, setSurfaceMaxHeight] = useState(DEFAULT_SURFACE_MAX_HEIGHT_PX);
  const [surfaceWidth, setSurfaceWidth] = useState(DEFAULT_SURFACE_WIDTH_PX);
  const [popoverPosition, setPopoverPosition] = useState<'above-start' | 'below-start'>('below-start');
  const [useDialogFallback, setUseDialogFallback] = useState(false);
  const [focusedTooltipServiceId, setFocusedTooltipServiceId] = useState<string | null>(null);
  const [hoveredTooltipServiceId, setHoveredTooltipServiceId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hoverTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedService = services.find((s) => s.cai_serviceorinitiativeid === selectedServiceId);

  const selectedAreaName = useMemo(() => {
    if (!selectedServiceId) return null;
    for (const node of hierarchy) {
      for (const teamNode of node.teams) {
        if (teamNode.services.some((s) => s.cai_serviceorinitiativeid === selectedServiceId)) {
          return node.areaName;
        }
      }
    }
    return null;
  }, [hierarchy, selectedServiceId]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.toLowerCase();
    return services.filter((service) => {
      const haystack = [
        service.cai_name,
        service.cai_description,
        service._cai_area_value_formatted,
        service._ownerid_value_formatted,
        service._cai_pmleadid_value_formatted,
        service._cai_pmbusinessmanagerid_value_formatted,
        service._cai_engleadid_value_formatted,
        service._cai_engbusinessmanagerid_value_formatted,
        service._cai_parentserviceorinitiativeid_value_formatted,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, services]);

  const areasWithResults = useMemo(() => {
    if (!searchResults) return null;
    const matchingServiceIds = new Set(searchResults.map((s) => s.cai_serviceorinitiativeid));
    const areas = new Set<string>();
    for (const node of hierarchy) {
      for (const teamNode of node.teams) {
        if (teamNode.services.some((s) => matchingServiceIds.has(s.cai_serviceorinitiativeid))) {
          areas.add(node.areaName);
        }
      }
    }
    return areas;
  }, [searchResults, hierarchy]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateViewport = () => setViewport(getViewportMetrics());
    const visualViewport = window.visualViewport;

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  const updateSurfaceLayout = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const availableWidth = Math.max(240, viewport.width - (VIEWPORT_MARGIN_PX * 2));
    setSurfaceWidth(Math.min(DEFAULT_SURFACE_WIDTH_PX, availableWidth));

    if (!triggerRect) {
      setSurfaceMaxHeight(DEFAULT_SURFACE_MAX_HEIGHT_PX);
      setPopoverPosition('below-start');
      setUseDialogFallback(viewport.height < 700 || viewport.width < 520);
      return;
    }

    const availableBelow = Math.max(0, viewport.height - triggerRect.bottom - VIEWPORT_MARGIN_PX);
    const availableAbove = Math.max(0, triggerRect.top - VIEWPORT_MARGIN_PX);
    const preferBelow = availableBelow >= Math.min(DEFAULT_SURFACE_MAX_HEIGHT_PX, 280) || availableBelow >= availableAbove;
    const preferredHeight = preferBelow ? availableBelow : availableAbove;

    setPopoverPosition(preferBelow ? 'below-start' : 'above-start');
    setSurfaceMaxHeight(Math.max(MIN_POPOVER_HEIGHT_PX, Math.min(DEFAULT_SURFACE_MAX_HEIGHT_PX, preferredHeight)));

    // At higher zoom or shorter viewports, use a dialog so the full hierarchy stays reachable.
    setUseDialogFallback(viewport.width < 520 || Math.max(availableBelow, availableAbove) < DIALOG_FALLBACK_HEIGHT_PX);
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updateSurfaceLayout();

    const handleScroll = () => updateSurfaceLayout();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, updateSurfaceLayout]);

  const clearHoverTooltipTimeout = useCallback(() => {
    if (hoverTooltipTimeoutRef.current !== null) {
      clearTimeout(hoverTooltipTimeoutRef.current);
      hoverTooltipTimeoutRef.current = null;
    }
  }, []);

  const resetTooltipState = useCallback(() => {
    clearHoverTooltipTimeout();
    setFocusedTooltipServiceId(null);
    setHoveredTooltipServiceId(null);
  }, [clearHoverTooltipTimeout]);

  useEffect(() => () => {
    clearHoverTooltipTimeout();
  }, [clearHoverTooltipTimeout]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetTooltipState();
    }
    if (isOpen) {
      setSearch('');
      setExpandedAreas(selectedAreaName ? new Set([selectedAreaName]) : new Set());
      updateSurfaceLayout();
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  };

  const handleSelectService = (service: IServiceOrInitiative) => {
    onSelect(service.cai_serviceorinitiativeid, service.cai_name);
    handleOpen(false);
  };

  const toggleArea = (areaName: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaName)) {
        next.delete(areaName);
      } else {
        next.add(areaName);
      }
      return next;
    });
  };

  function renderServiceItem(service: IServiceOrInitiative) {
    const isDisabled = disabledServiceIds?.has(service.cai_serviceorinitiativeid) ?? false;
    const isSelected = service.cai_serviceorinitiativeid === selectedServiceId;
    const hasTooltip = hasServiceTooltipContent(service);
    const tooltipContent = hasTooltip ? <ServiceTooltipContent service={service} /> : null;
    const activeTooltipServiceId = hoveredTooltipServiceId ?? focusedTooltipServiceId;
    const tooltipVisible = hasTooltip && activeTooltipServiceId === service.cai_serviceorinitiativeid;

    const handleMouseEnter = hasTooltip && !isDisabled
      ? () => {
        clearHoverTooltipTimeout();
        hoverTooltipTimeoutRef.current = setTimeout(() => {
          setHoveredTooltipServiceId(service.cai_serviceorinitiativeid);
          hoverTooltipTimeoutRef.current = null;
        }, TOOLTIP_SHOW_DELAY_MS);
      }
      : undefined;

    const handleMouseLeave = hasTooltip
      ? () => {
        clearHoverTooltipTimeout();
        setHoveredTooltipServiceId((current) => (
          current === service.cai_serviceorinitiativeid ? null : current
        ));
      }
      : undefined;

    const handleItemKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleOpen(false);
        return;
      }

      if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleSelectService(service);
      }
    };

    const item = (
      <div
        key={service.cai_serviceorinitiativeid}
        className={`${styles.serviceItem} ${isSelected ? styles.serviceItemSelected : ''}`}
        onClick={() => !isDisabled && handleSelectService(service)}
        onKeyDown={handleItemKeyDown}
        onFocus={hasTooltip && !isDisabled ? () => {
          clearHoverTooltipTimeout();
          setHoveredTooltipServiceId(null);
          setFocusedTooltipServiceId(service.cai_serviceorinitiativeid);
        } : undefined}
        onBlur={hasTooltip ? () => setFocusedTooltipServiceId((current) => (
          current === service.cai_serviceorinitiativeid ? null : current
        )) : undefined}
        style={isDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        role="option"
        aria-selected={isSelected}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : 0}
      >
        {isSelected && <Checkmark20Regular className={styles.checkIcon} />}
        <div className={styles.serviceLabel}>
          <span
            className={styles.serviceLabelTrigger}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Text size={300} truncate>
              {service.cai_name}
            </Text>
          </span>
        </div>
      </div>
    );

    if (!tooltipContent) {
      return item;
    }

    return (
      <Tooltip
        key={service.cai_serviceorinitiativeid}
        content={tooltipContent}
        relationship="description"
        positioning={SERVICE_TOOLTIP_POSITIONING}
        withArrow
        visible={tooltipVisible}
      >
        {item}
      </Tooltip>
    );
  }

  function renderGroupedList() {
    const isSearching = searchResults !== null;
    const matchingServiceIds = isSearching
      ? new Set(searchResults.map((s) => s.cai_serviceorinitiativeid))
      : null;

    const visibleHierarchy = isSearching
      ? hierarchy.filter((node) => areasWithResults?.has(node.areaName))
      : hierarchy;

    if (isSearching && visibleHierarchy.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Text size={200} className={styles.emptyStateTitle} style={{ color: tokens.colorNeutralForeground3 }}>
            No services found
          </Text>
          <Text size={100} className={styles.emptyStateHelp} style={{ color: tokens.colorNeutralForeground3 }}>
            Try searching by name, description, DRI, lead, or team.
          </Text>
        </div>
      );
    }

    return visibleHierarchy.map((node) => {
      const isExpanded = isSearching || expandedAreas.has(node.areaName);
      const teamsWithContent = isSearching
        ? node.teams.filter((t) => t.services.some((s) => matchingServiceIds!.has(s.cai_serviceorinitiativeid)))
        : node.teams;
      const showTeamHeaders = !isSearching && teamsWithContent.length > 1;

      return (
        <div key={node.areaName}>
          <div
            className={styles.areaHeader}
            onClick={isSearching ? undefined : () => toggleArea(node.areaName)}
            onKeyDown={isSearching ? undefined : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleArea(node.areaName);
              }
            }}
            role="button"
            tabIndex={isSearching ? -1 : 0}
            aria-expanded={isExpanded}
          >
            {!isSearching && (
              isExpanded ? (
                <ChevronDown20Regular className={styles.chevron} />
              ) : (
                <ChevronRight20Regular className={styles.chevron} />
              )
            )}
            <Text size={300} weight="semibold">
              {node.areaName}
            </Text>
          </div>
          {isExpanded &&
            node.teams.map((teamNode) => {
              const visibleServices = matchingServiceIds
                ? teamNode.services.filter((s) => matchingServiceIds.has(s.cai_serviceorinitiativeid))
                : teamNode.services;
              if (visibleServices.length === 0) return null;

              return (
                <div key={teamNode.team.cai_areaid}>
                  {showTeamHeaders && (
                    <div className={styles.teamHeader}>
                      <Text size={200} weight="semibold">
                        {teamNode.team.cai_areaname}
                      </Text>
                    </div>
                  )}
                  {visibleServices.map((service) => renderServiceItem(service))}
                </div>
              );
            })}
        </div>
      );
    });
  }

  function renderPickerBody() {
    return (
      <>
        <div className={styles.searchBox}>
          <Input
            ref={searchRef}
            size="medium"
            contentBefore={<SearchRegular />}
            placeholder="Search by name, DRI, lead..."
            value={search}
            onChange={(_e, data) => setSearch(data.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div
          className={styles.list}
          role="listbox"
          aria-label="Service or initiative options"
        >
          {renderGroupedList()}
        </div>
      </>
    );
  }

  function renderTriggerButton(onClick?: () => void) {
    return (
      <Button
        ref={triggerRef}
        className={styles.trigger}
        appearance="outline"
        disabled={disabled}
        style={{ minWidth: '200px' }}
        onClick={onClick}
      >
        {selectedService ? (
          <Text size={300} truncate>
            {selectedService.cai_name}
          </Text>
        ) : (
          <span className={styles.triggerPlaceholder}>{placeholder}</span>
        )}
      </Button>
    );
  }

  return (
    <>
      {useDialogFallback ? (
        <>
          {renderTriggerButton(() => handleOpen(true))}
          <Dialog open={open} onOpenChange={(_e, data) => handleOpen(data.open)}>
            <DialogSurface className={styles.dialogSurface}>
              <DialogBody className={styles.dialogBody}>
                <DialogTitle>Select service or initiative</DialogTitle>
                <DialogContent className={styles.dialogContent}>
                  {renderPickerBody()}
                </DialogContent>
                <DialogActions className={styles.dialogActions}>
                  <Button appearance="secondary" onClick={() => handleOpen(false)}>
                    Close
                  </Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
        </>
      ) : (
        <Popover open={open} onOpenChange={(_e, data) => handleOpen(data.open)} positioning={popoverPosition} trapFocus>
          <PopoverTrigger>
            {renderTriggerButton()}
          </PopoverTrigger>
          <PopoverSurface
            className={styles.surface}
            style={{
              width: `${surfaceWidth}px`,
              maxHeight: `${surfaceMaxHeight}px`,
            }}
          >
            {renderPickerBody()}
          </PopoverSurface>
        </Popover>
      )}
    </>
  );
}
