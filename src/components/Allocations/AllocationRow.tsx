/* ── Allocation Row (one employee in the grid) ── */

import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Button,
  Checkbox,
  Tooltip,
} from '@fluentui/react-components';
import { CheckmarkCircleRegular, CircleRegular, AlertRegular, ArrowImportRegular, Warning16Regular, PeopleTeam16Regular } from '@fluentui/react-icons';
import type { IResource, IAllocation, IServiceOrInitiative } from '../../types';
import { AllocationStatus, type AllocationStatusValue } from '../../types';
import { formatCount, getInitials, sumPercentages, isPlaceholderService, type HierarchyAlertSummary } from '../../utils';
import { ServiceTooltipContent } from '../Shared';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 12px',
    borderRadius: '4px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  reviewComplete: {
    opacity: 0.8,
  },
  nameBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
    flexShrink: 0,
    width: '182px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  chipArea: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center',
    minWidth: 0,
  },
  chip: {
    padding: '1px 6px',
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '10px',
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
  alertChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '1px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    lineHeight: '16px',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  completionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    lineHeight: '16px',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  actionButton: {
    minWidth: '110px',
    justifyContent: 'center',
  },
});

interface AllocationRowProps {
  resource: IResource;
  allocations: IAllocation[];
  checked: boolean;
  onCheckChange: (checked: boolean) => void;
  onApprove: () => void;
  onClick?: () => void;
  onCopyAssignments?: () => void;
  invalidTotal?: boolean;
  compact?: boolean;
  readOnly?: boolean;
  isManager?: boolean;
  serviceMap?: Map<string, IServiceOrInitiative>;
  alertSummary?: HierarchyAlertSummary;
  hideAlertSummary?: boolean;
  placeholderServiceIds?: Set<string>;
  completionPct?: number;
}

function completionChipStyle(pct: number): { background: string; color: string } {
  if (pct >= 95) return { background: '#DFF6DD', color: '#107C10' };
  if (pct >= 75) return { background: '#FCE9D3', color: '#8A4500' };
  return { background: '#FDE7E9', color: '#A4262C' };
}

function getRowStatus(allocations: IAllocation[]): AllocationStatusValue {
  if (allocations.some((allocation) => allocation.cai_managerapprovalstatus === AllocationStatus.PendingReview)) {
    return AllocationStatus.PendingReview;
  }
  if (allocations.some((allocation) => allocation.cai_managerapprovalstatus === AllocationStatus.ReviewCompleteRemoved)) {
    return AllocationStatus.ReviewCompleteRemoved;
  }
  return AllocationStatus.ReviewComplete;
}

export function AllocationRow({
  resource,
  allocations,
  checked,
  onCheckChange,
  onApprove,
  onClick,
  onCopyAssignments,
  invalidTotal,
  compact,
  readOnly,
  isManager,
  serviceMap,
  alertSummary,
  hideAlertSummary = false,
  placeholderServiceIds = new Set(),
  completionPct,
}: AllocationRowProps) {
  const styles = useStyles();

  const status = getRowStatus(allocations);
  const isReviewComplete = status !== AllocationStatus.PendingReview;
  const total = allocations.length > 0 ? sumPercentages(allocations) : 0;
  // Exclude placeholder allocations from the "Under by" amount so the chip
  // reflects the real gap, not the placeholder filler percentage.
  const nonPlaceholderTotal = allocations.reduce((sum, a) => {
    const isPlaceholder = placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) ||
      isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted);
    return isPlaceholder ? sum : sum + a.cai_allocationpercentage;
  }, 0);
  const hasNoAllocations = allocations.length === 0;
  const teamAlertCount = alertSummary?.descendant ?? 0;
  const totalAlertCount = alertSummary?.total ?? (invalidTotal ? 1 : 0);
  const showRollupAlertChip = teamAlertCount > 0;
  const alertTooltip = showRollupAlertChip
    ? alertSummary?.self
      ? `${formatCount(alertSummary.self)} alert on this manager and ${formatCount(teamAlertCount)} in the team below`
      : `${formatCount(teamAlertCount)} alert${teamAlertCount === 1 ? '' : 's'} in the team below`
    : '';

  return (
    <div
      className={`${styles.row} ${isReviewComplete ? styles.reviewComplete : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
    >
      <Checkbox
        checked={checked}
        onChange={(_e, data) => onCheckChange(!!data.checked)}
        onClick={(e) => e.stopPropagation()}
        disabled={isReviewComplete || !!invalidTotal}
        aria-label={`Select ${resource.cai_displayname}`}
      />
      <div className={styles.nameBlock}>
        <Avatar
          name={resource.cai_displayname}
          initials={getInitials(resource.cai_displayname)}
          size={20}
          color="colorful"
        />
        <Text weight="semibold" size={200} truncate>
          {resource.cai_displayname}
        </Text>
        {isManager && (
          <PeopleTeam16Regular style={{ fontSize: 12, flexShrink: 0, color: tokens.colorBrandForeground1 }} />
        )}
      </div>
      <div className={styles.chipArea} style={compact ? { flexWrap: 'nowrap', overflow: 'hidden' } : undefined}>
        {completionPct !== undefined && (
          <Tooltip content={`${completionPct}% approved`} relationship="description" withArrow>
            <span
              className={styles.completionChip}
              style={completionChipStyle(completionPct)}
            >
              {completionPct}% Approved
            </span>
          </Tooltip>
        )}
        {!hideAlertSummary && showRollupAlertChip && (
          <Tooltip content={alertTooltip} relationship="description" withArrow>
            <span
              className={styles.alertChip}
              style={{
                backgroundColor: '#FDE7E9',
                color: '#A4262C',
              }}
            >
              <Warning16Regular style={{ fontSize: 10 }} />
              {formatCount(totalAlertCount)} alert{totalAlertCount === 1 ? '' : 's'}
            </span>
          </Tooltip>
        )}
        {invalidTotal && (
          <span
            className={styles.alertChip}
            style={{
              backgroundColor: total > 100 ? '#FDE7E9' : '#FFF4CE',
              color: total > 100 ? '#A80200' : '#835C00',
            }}
          >
            <Warning16Regular style={{ fontSize: 10 }} />
            {total > 100 ? `Over by ${total - 100}%` : `Under by ${100 - nonPlaceholderTotal}%`}
          </span>
        )}
        {allocations.map((allocation) => {
          const service = serviceMap?.get(allocation._cai_serviceorinitiativeid_value);
          const tooltipContent = service ? <ServiceTooltipContent service={service} /> : null;
          const isPlaceholder = placeholderServiceIds.has(allocation._cai_serviceorinitiativeid_value) ||
            isPlaceholderService(allocation._cai_serviceorinitiativeid_value_formatted);
          if (isPlaceholder) return null;
          const chip = (
            <span
              key={allocation.cai_allocationid}
              className={styles.chip}
            >
              {allocation._cai_serviceorinitiativeid_value_formatted} {allocation.cai_allocationpercentage}%
            </span>
          );
          if (!tooltipContent) return chip;
          return (
            <Tooltip key={allocation.cai_allocationid} content={tooltipContent} relationship="description" withArrow>
              {chip}
            </Tooltip>
          );
        })}
      </div>
      <div className={styles.actions}>
        {hasNoAllocations && !readOnly && onCopyAssignments ? (
          <Button
            className={styles.actionButton}
            size="small"
            appearance="outline"
            icon={<ArrowImportRegular />}
            onClick={(e) => { e.stopPropagation(); onCopyAssignments(); }}
            style={{ backgroundColor: '#FFF9F5', borderColor: '#FDCFB4', color: '#BC4B09' }}
          >
            Import
          </Button>
        ) : isReviewComplete || readOnly ? (
          <Button
            className={styles.actionButton}
            size="small"
            appearance="outline"
            icon={<CheckmarkCircleRegular />}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            style={{ backgroundColor: '#DFF6DD', borderColor: '#9EE09E', color: '#107C10' }}
          >
            Approved
          </Button>
        ) : invalidTotal ? (
          <Button
            className={styles.actionButton}
            size="small"
            appearance="outline"
            icon={<AlertRegular />}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            style={{ backgroundColor: '#FFF9F5', borderColor: '#FDCFB4', color: '#BC4B09' }}
          >
            Review
          </Button>
        ) : (
          <Button
            className={styles.actionButton}
            size="small"
            appearance="outline"
            icon={<CircleRegular />}
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            style={{ backgroundColor: '#FFF4CE', borderColor: '#EAD169', color: '#835C00' }}
          >
            Ready
          </Button>
        )}
      </div>
    </div>
  );
}
