import { useEffect, useState } from 'react';
import { getHasDirectReports } from '../api';

interface UseHasDirectReportsResult {
  hasDirectReports: boolean | null;
  loading: boolean;
}

export function useHasDirectReports(managerResourceId: string | null): UseHasDirectReportsResult {
  const [hasDirectReports, setHasDirectReports] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!managerResourceId) {
      setHasDirectReports(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    void (async () => {
      try {
        const result = await getHasDirectReports(managerResourceId);
        if (!cancelled) {
          setHasDirectReports(result);
        }
      } catch {
        if (!cancelled) {
          setHasDirectReports(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [managerResourceId]);

  return { hasDirectReports, loading };
}
