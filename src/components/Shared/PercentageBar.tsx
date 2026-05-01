/* ── Shared: Percentage Bar ── */

import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground4,
    width: '100%',
  },
  segment: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
});

const SEGMENT_COLORS = [
  '#0078D4', // blue
  '#E74856', // red
  '#00B294', // green
  '#FFB900', // gold
  '#8764B8', // purple
  '#E3008C', // magenta
];

interface PercentageBarProps {
  segments: { percentage: number; label?: string }[];
  showOverflow?: boolean;
}

export function PercentageBar({ segments, showOverflow }: PercentageBarProps) {
  const styles = useStyles();
  const total = segments.reduce((s, seg) => s + seg.percentage, 0);

  return (
    <div
      className={styles.container}
      role="img"
      aria-label={`Snapshot: ${total}% of 100%`}
      style={
        showOverflow && total > 100
          ? { outline: `2px solid ${tokens.colorPaletteRedBorderActive}`, outlineOffset: '1px' }
          : undefined
      }
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          className={styles.segment}
          style={{
            width: `${Math.min(seg.percentage, 100)}%`,
            backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
          }}
          title={seg.label ? `${seg.label}: ${seg.percentage}%` : `${seg.percentage}%`}
        />
      ))}
    </div>
  );
}
