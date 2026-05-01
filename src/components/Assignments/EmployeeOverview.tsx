/* ── Employee Overview (right panel when services view, nothing selected) ── */

import { useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Divider,
  Badge,
} from '@fluentui/react-components';
import {
  DataBarVertical20Regular,
  PeopleTeamRegular,
  Warning16Regular,
} from '@fluentui/react-icons';
import type { IResource, IAssignment } from '../../types';
import {
  formatCount,
  getInitials,
  sumPercentages,
  groupByManager,
  isPlaceholderService,
} from '../../utils';

const useStyles = makeStyles({
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  managerGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px 2px',
    width: 'fit-content',
  },
  managerGroupButton: {
    cursor: 'pointer',
    borderRadius: '999px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
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
  nameBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
    flexShrink: 0,
    width: '140px',
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
});

interface EmployeeOverviewProps {
  resources: IResource[];
  assignments: IAssignment[];
  onSelectEmployee?: (resourceId: string) => void;
  onSelectManager: (managerId: string) => void;
  managerAlertCountsById: Map<string, number>;
  placeholderServiceIds?: Set<string>;
}

export function EmployeeOverview({
  resources,
  assignments,
  onSelectEmployee,
  onSelectManager,
  managerAlertCountsById,
  placeholderServiceIds = new Set(),
}: EmployeeOverviewProps) {
  const styles = useStyles();

  const assignmentsByResource = useMemo(() => {
    const map = new Map<string, IAssignment[]>();
    for (const a of assignments) {
      const list = map.get(a._cai_resourceid_value) ?? [];
      list.push(a);
      map.set(a._cai_resourceid_value, list);
    }
    return map;
  }, [assignments]);

  const groupedPeople = useMemo(() => groupByManager(resources), [resources]);

  const showManagerGroups = groupedPeople.length > 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <DataBarVertical20Regular />
        <Text size={500} weight="semibold">Team Assignment Overview</Text>
      </div>

      <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

      <div className={styles.grid}>
        {groupedPeople.map((group) => {
          const managerId = group.managerId;
          const managerAlertCount = managerId
            ? (managerAlertCountsById.get(managerId) ?? 0)
            : 0;

          return (
            <div key={group.managerName}>
              {showManagerGroups && (
                <div
                  className={`${styles.managerGroupHeader} ${managerId ? styles.managerGroupButton : ''}`}
                  onClick={managerId ? () => onSelectManager(managerId) : undefined}
                  role={managerId ? 'button' : undefined}
                  tabIndex={managerId ? 0 : undefined}
                  onKeyDown={managerId ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectManager(managerId);
                    }
                  } : undefined}
                >
                  <Text size={100} weight="semibold" style={{ color: tokens.colorNeutralForeground3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {group.isTeamManager ? group.managerName : `${group.managerName}'s team`}
                  </Text>
                  <PeopleTeamRegular style={{ fontSize: 14, color: tokens.colorNeutralForeground3 }} />
                  {managerAlertCount > 0 && (
                    <Badge size="small" appearance="filled" color="danger">
                      {formatCount(managerAlertCount)}
                    </Badge>
                  )}
                </div>
              )}
              {group.resources.map((person) => {
              const personAssignments = assignmentsByResource.get(person.cai_resourceid) ?? [];
              const total = sumPercentages(personAssignments);
              const nonPlaceholderTotal = personAssignments.reduce((sum, a) => {
                const isPlaceholder = placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) ||
                  isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted);
                return isPlaceholder ? sum : sum + a.cai_allocationpercentage;
              }, 0);
              const invalidTotal = total !== 100;
              return (
                <div
                  key={person.cai_resourceid}
                  className={styles.row}
                  onClick={() => onSelectEmployee?.(person.cai_resourceid)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelectEmployee?.(person.cai_resourceid); }}
                >
                  <div className={styles.nameBlock}>
                    <Avatar
                      name={person.cai_displayname}
                      initials={getInitials(person.cai_displayname)}
                      size={20}
                      color="colorful"
                    />
                    <Text weight="semibold" size={200} truncate>
                      {person.cai_displayname}
                    </Text>
                  </div>
                  <div className={styles.chipArea}>
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
                    {personAssignments.map((a) => {
                      const isPlaceholder = placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) ||
                        isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted);
                      return (
                        <span
                          key={a.cai_assignmentid}
                          className={styles.chip}
                          style={isPlaceholder ? { color: tokens.colorPaletteRedForeground1, fontStyle: 'italic' } : undefined}
                        >
                          {a._cai_serviceorinitiativeid_value_formatted} {a.cai_allocationpercentage}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
