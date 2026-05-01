import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { Warning16Regular } from '@fluentui/react-icons';
import { formatCount } from '../../utils';

export interface ManagerAlertStatus {
  id: string;
  name: string;
  alerts: number;
}

const useStyles = makeStyles({
  outer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  collapsed: {
    overflow: 'hidden',
    maxHeight: '28px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    border: `1px solid ${tokens.colorPaletteRedBorder2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  toggleChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
    },
  },
  icon: {
    color: tokens.colorPaletteRedForeground1,
    flexShrink: 0,
  },
});

interface ManagerAlertChipsProps {
  managers: ManagerAlertStatus[];
  selectedManagerId?: string;
  onSelectManager: (managerId: string) => void;
}

export function ManagerAlertChips({
  managers,
  selectedManagerId,
  onSelectManager,
}: ManagerAlertChipsProps) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const [overflowCount, setOverflowCount] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el || managers.length === 0) {
      setOverflowCount(0);
      return;
    }
    // Measure which children overflow the first row
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    const firstTop = children[0]!.offsetTop;
    const overflowing = children.filter((c) => c.offsetTop > firstTop).length;
    setOverflowCount(overflowing);
  }, [managers]);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [measure]);

  // Reset to collapsed when manager list changes
  useEffect(() => {
    setExpanded(false);
  }, [managers.length]);

  if (managers.length === 0) {
    return null;
  }

  const isCollapsed = !expanded && overflowCount > 0;

  return (
    <div className={styles.outer}>
      <div
        ref={wrapRef}
        className={mergeClasses(styles.wrap, isCollapsed && styles.collapsed)}
      >
        {managers.map((manager) => {
          const isSelected = selectedManagerId === manager.id;
          return (
            <div
              key={manager.id}
              className={styles.chip}
              onClick={() => onSelectManager(manager.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectManager(manager.id);
                }
              }}
              style={{
                borderColor: isSelected ? tokens.colorBrandStroke1 : tokens.colorPaletteRedBorder2,
                backgroundColor: isSelected ? tokens.colorBrandBackground2 : undefined,
              }}
            >
              <Warning16Regular className={styles.icon} />
              <span>{manager.name}</span>
              <Badge size="small" appearance="filled" color="danger">
                {formatCount(manager.alerts)}
              </Badge>
            </div>
          );
        })}
      </div>
      {overflowCount > 0 && (
        <div
          className={styles.toggleChip}
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setExpanded((v) => !v);
            }
          }}
        >
          {expanded ? 'Show less' : `+${overflowCount} more`}
        </div>
      )}
    </div>
  );
}
