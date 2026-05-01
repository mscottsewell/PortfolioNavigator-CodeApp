/* ── Theme hook ── */

import { useState, useEffect, useCallback } from 'react';
import { webLightTheme, webDarkTheme, type Theme } from '@fluentui/react-components';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'portfolio-navigator-theme';

function getSystemPreference(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getStoredPreference(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable
  }
  return null;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredPreference() ?? getSystemPreference());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const theme: Theme = mode === 'dark' ? webDarkTheme : webLightTheme;

  return { mode, theme, toggle };
}
