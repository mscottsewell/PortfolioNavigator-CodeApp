/* ── Shared: Empty State ── */

import { makeStyles, tokens, Text } from '@fluentui/react-components';
import { PeopleTeamRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '12px',
    color: tokens.colorNeutralForeground3,
  },
  icon: {
    fontSize: '48px',
  },
  description: {
    maxWidth: '360px',
    textAlign: 'center',
  },
});

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, description, icon }: EmptyStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon ?? <PeopleTeamRegular />}</div>
      <Text size={400} weight="regular">
        {message}
      </Text>
      {description && (
        <Text size={300} weight="regular" className={styles.description}>
          {description}
        </Text>
      )}
    </div>
  );
}
