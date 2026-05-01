/* ── Service/Initiative list hook ── */

import { useState, useEffect } from 'react';
import type { IServiceOrInitiative } from '../types';
import { getServiceInitiatives } from '../api';

interface UseServiceInitiativesResult {
  items: IServiceOrInitiative[];
  loading: boolean;
  error: string | null;
}

export function useServiceInitiatives(): UseServiceInitiativesResult {
  const [items, setItems] = useState<IServiceOrInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getServiceInitiatives();
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load services');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
