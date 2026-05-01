/* ── Shared: Toast / Notification context ── */

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  DismissCircleRegular,
  DismissRegular,
} from '@fluentui/react-icons';

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const useStyles = makeStyles({
  container: {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 10000,
    maxWidth: '400px',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: tokens.shadow16,
    animation: 'slideIn 0.3s ease',
  },
  success: {
    backgroundColor: tokens.colorStatusSuccessBackground2,
    color: tokens.colorStatusSuccessForeground2,
  },
  error: {
    backgroundColor: tokens.colorStatusDangerBackground2,
    color: tokens.colorStatusDangerForeground2,
  },
  dismiss: {
    marginLeft: 'auto',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    color: 'inherit',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
});

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear all pending timers on unmount
  useEffect(() => {
    const timers = timerIds.current;
    return () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    };
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    const timerId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timerIds.current.delete(timerId);
    }, 4000);
    timerIds.current.add(timerId);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}
          >
            {toast.type === 'success' ? (
              <CheckmarkCircleRegular fontSize={20} />
            ) : (
              <DismissCircleRegular fontSize={20} />
            )}
            <Text size={300} weight="semibold">
              {toast.message}
            </Text>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              <DismissRegular fontSize={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
