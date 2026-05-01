/* ── Delegations hook — fetches and resolves delegation scopes for the current user ── */

import { useState, useEffect } from 'react';
import { getDelegationsForCurrentUser } from '../api';
import { resolveAllDelegationScopes, clearScopeResolverCache } from '../utils/scopeResolver';
import type { ResolvedScope } from '../utils/scopeResolver';

interface UseDelegationsResult {
  /** Resolved delegation scopes (excludes the user's own team) */
  scopes: ResolvedScope[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches active delegations for the current user and resolves each to a
 * scope with a root resource ID and display label.
 *
 * @param delegateResourceId The current user's resource ID (needed for positional scopes)
 */
export function useDelegations(delegateResourceId: string | null): UseDelegationsResult {
  const [scopes, setScopes] = useState<ResolvedScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!delegateResourceId) {
      setScopes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    clearScopeResolverCache();

    (async () => {
      try {
        const delegations = await getDelegationsForCurrentUser();
        if (cancelled) return;

        console.info('[PortfolioNavigator] Delegation lookup completed.', {
          delegateResourceId,
          delegationCount: delegations.length,
        });

        if (delegations.length === 0) {
          console.warn('[PortfolioNavigator] No active delegations found for current user.', {
            delegateResourceId,
          });
          setScopes([]);
          setLoading(false);
          return;
        }

        const resolved = await resolveAllDelegationScopes(delegations, delegateResourceId);
        if (!cancelled) {
          console.info('[PortfolioNavigator] Delegation scope resolution completed.', {
            delegateResourceId,
            delegationCount: delegations.length,
            resolvedScopeCount: resolved.length,
            resolvedScopeLabels: resolved.map((scope) => scope.label),
          });
          setScopes(resolved);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[PortfolioNavigator] Delegation lookup failed.', {
            delegateResourceId,
            message: err instanceof Error ? err.message : 'Failed to load delegations',
          });
          setError(err instanceof Error ? err.message : 'Failed to load delegations');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [delegateResourceId]);

  return { scopes, loading, error };
}
