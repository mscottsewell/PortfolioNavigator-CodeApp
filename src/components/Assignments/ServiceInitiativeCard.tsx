/* ── Service/Initiative Card ── */

import {
  Badge,
  makeStyles,
  tokens,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import type { IServiceOrInitiative } from '../../types';
import { formatCount } from '../../utils';
import { ServiceTooltipContent } from '../Shared';
import type { EffectiveServiceMetrics } from './serviceMetrics';

const useStyles = makeStyles({
  card: {
    position: 'relative',
    overflow: 'hidden',
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
  bar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.colorBrandBackground2,
    transition: 'width 0.4s ease',
    pointerEvents: 'none',
    zIndex: 0,
  },
  selected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  info: {
    position: 'relative',
    zIndex: 1,
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
});

interface ServiceInitiativeCardProps {
  serviceInitiative: IServiceOrInitiative;
  metrics: EffectiveServiceMetrics;
  maxPct: number;
  selected: boolean;
  onClick: () => void;
}

export function ServiceInitiativeCard({
  serviceInitiative,
  metrics,
  maxPct,
  selected,
  onClick,
}: ServiceInitiativeCardProps) {
  const styles = useStyles();
  const barWidth = maxPct > 0 ? (metrics.totalPercentage / maxPct) * 50 : 0;

  const tooltipContent = <ServiceTooltipContent service={serviceInitiative} />;

  const card = (
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
      <div className={styles.bar} style={{ width: `${barWidth}%` }} aria-hidden="true" />
      <div className={styles.info}>
        <Text weight="semibold" size={200} truncate className={styles.name} style={{ color: tokens.colorBrandForeground1 }}>
          {serviceInitiative.cai_name}
        </Text>
        <div className={styles.stats}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {formatCount(metrics.employeeCount)} employee{metrics.employeeCount !== 1 ? 's' : ''} · {metrics.fte}&nbsp;FTEs
          </Text>
          {metrics.employees.length < metrics.employeeCount && (
            <Badge appearance="tint" size="small" color="subtle">
              hierarchy
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  if (!tooltipContent) return card;

  return (
    <Tooltip content={tooltipContent} relationship="description" withArrow positioning="after">
      {card}
    </Tooltip>
  );
}
