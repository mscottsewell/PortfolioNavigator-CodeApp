/* ── Employee Card ── */

import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Checkbox,
  Tooltip,
} from '@fluentui/react-components';
import { Warning16Regular, PeopleTeam16Regular } from '@fluentui/react-icons';
import type { IResource, IAssignment } from '../../types';
import { formatCount, getInitials, sumPercentages, type HierarchyAlertSummary } from '../../utils';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  selected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  flag: {
    display: 'flex',
    alignItems: 'center',
  },
  alertBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px 6px',
    borderRadius: '999px',
    fontSize: '10px',
    lineHeight: '16px',
    fontWeight: 700,
    flexShrink: 0,
    backgroundColor: '#FFF4CE',
    color: '#835C00',
  },
});

interface EmployeeCardProps {
  resource: IResource;
  assignments: IAssignment[];
  selected: boolean;
  multiSelectMode: boolean;
  isManager?: boolean;
  alertSummary?: HierarchyAlertSummary;
  hideAlertSummary?: boolean;
  onClick: () => void;
  onCheckboxChange: (checked: boolean) => void;
}

export function EmployeeCard({
  resource,
  assignments,
  selected,
  multiSelectMode,
  isManager,
  alertSummary,
  hideAlertSummary = false,
  onClick,
  onCheckboxChange,
}: EmployeeCardProps) {
  const styles = useStyles();
  const total = sumPercentages(assignments);
  const isValid = total === 100;
  const selfAlerts = alertSummary?.self ?? (!isValid ? 1 : 0);
  const descendantAlerts = alertSummary?.descendant ?? 0;
  const totalAlerts = alertSummary?.total ?? selfAlerts;
  const alertTooltip = totalAlerts === 0
    ? ''
    : descendantAlerts > 0
      ? selfAlerts > 0
        ? `${formatCount(selfAlerts)} alert on this manager and ${formatCount(descendantAlerts)} in the team below`
        : `${formatCount(descendantAlerts)} alert${descendantAlerts === 1 ? '' : 's'} in the team below`
      : `${formatCount(selfAlerts)} alert on this employee`;

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {multiSelectMode && (
        <Checkbox
          checked={selected}
          onChange={(_e, data) => onCheckboxChange(!!data.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${resource.cai_displayname}`}
        />
      )}
      <Avatar
        name={resource.cai_displayname}
        initials={getInitials(resource.cai_displayname)}
        size={20}
        color="colorful"
      />
      <div className={styles.info}>
        <Text weight="semibold" size={200} truncate className={styles.name}>
          {resource.cai_displayname}
        </Text>
        {isManager && (
          <PeopleTeam16Regular style={{ fontSize: 12, flexShrink: 0, color: tokens.colorBrandForeground1 }} />
        )}
        <div className={styles.stats}>
          {!hideAlertSummary && totalAlerts > 0 && (
            <Tooltip content={alertTooltip} relationship="description" withArrow>
              <span className={styles.alertBadge}>
                <Warning16Regular style={{ fontSize: 12 }} />
                {formatCount(totalAlerts)} alert{totalAlerts === 1 ? '' : 's'}
              </span>
            </Tooltip>
          )}
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {formatCount(assignments.length)} Assigned&nbsp;·&nbsp;{total}%
          </Text>
        </div>
      </div>
    </div>
  );
}
