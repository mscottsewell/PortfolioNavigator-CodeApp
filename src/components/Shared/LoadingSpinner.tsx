/* ── Shared: Loading Spinner ── */

import { Spinner, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    width: '100%',
  },
});

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <Spinner size="medium" label={label} />
    </div>
  );
}
