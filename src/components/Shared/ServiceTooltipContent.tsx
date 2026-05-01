/* ── Tooltip content for Service / Initiative details ── */

import { makeStyles, tokens, Text } from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';
import type { IServiceOrInitiative } from '../../types';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxWidth: '320px',
  },
  description: {
    fontSize: '12px',
    lineHeight: '16px',
    color: tokens.colorNeutralForeground2,
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    lineHeight: '16px',
    whiteSpace: 'nowrap' as const,
  },
  chipLabel: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
  },
});

interface LeadershipEntry {
  role: string;
  name: string;
}

function getLeadership(service: IServiceOrInitiative): LeadershipEntry[] {
  const entries: LeadershipEntry[] = [];
  if (service._ownerid_value_formatted) entries.push({ role: 'Owner/DRI', name: service._ownerid_value_formatted });
  if (service._cai_pmleadid_value_formatted) entries.push({ role: 'PM Lead', name: service._cai_pmleadid_value_formatted });
  if (service._cai_pmbusinessmanagerid_value_formatted) entries.push({ role: 'PM BizMgr', name: service._cai_pmbusinessmanagerid_value_formatted });
  if (service._cai_engleadid_value_formatted) entries.push({ role: 'Eng Lead', name: service._cai_engleadid_value_formatted });
  if (service._cai_engbusinessmanagerid_value_formatted) entries.push({ role: 'Eng BizMgr', name: service._cai_engbusinessmanagerid_value_formatted });
  return entries;
}

export function hasServiceTooltipContent(service: IServiceOrInitiative): boolean {
  return Boolean(service.cai_description || getLeadership(service).length > 0);
}

export function ServiceTooltipContent({ service }: { service: IServiceOrInitiative }) {
  const styles = useStyles();
  const leadership = getLeadership(service);
  const hasContent = hasServiceTooltipContent(service);

  if (!hasContent) return null;

  return (
    <div className={styles.root}>
      {service.cai_description && (
        <Text className={styles.description}>{service.cai_description}</Text>
      )}
      {leadership.length > 0 && (
        <div className={styles.chipRow}>
          {leadership.map((entry) => (
            <span key={entry.role} className={styles.chip}>
              <PersonRegular style={{ fontSize: 10 }} />
              <span className={styles.chipLabel}>{entry.role}:</span>
              {entry.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
