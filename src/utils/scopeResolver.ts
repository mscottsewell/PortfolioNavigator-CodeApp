/* ── Scope resolver — resolves delegation scope types to a root resource ID ── */

import type { IDelegation, IResource } from '../types';
import { DelegationScopeType } from '../types';
import { getResourceById } from '../api';

/** A resolved scope that can be displayed in the scope switcher. */
export interface ResolvedScope {
  /** Unique identifier (delegation ID, or 'self' for the user's own team) */
  id: string;
  /** Display label for the scope (e.g., "My Team", "Narine's Team (M1)") */
  label: string;
  /** The resource ID of the hierarchy root for this scope */
  rootResourceId: string;
  /** The display name of the hierarchy root manager */
  rootDisplayName: string;
  /** Whether this is a flat (peers-only) view vs. cascade (drill-down) view */
  flat: boolean;
}

// Cache resolved manager chain lookups within a session
const resourceCache = new Map<string, IResource | null>();

async function getCachedResource(resourceId: string): Promise<IResource | null> {
  if (resourceCache.has(resourceId)) return resourceCache.get(resourceId)!;
  const resource = await getResourceById(resourceId);
  resourceCache.set(resourceId, resource);
  return resource;
}

/**
 * Walk up the manager chain from `startResourceId` by `levels` hops.
 * Returns the resource at the target level, or null if the chain is too short.
 */
async function walkManagerChain(startResourceId: string, levels: number): Promise<IResource | null> {
  let current = await getCachedResource(startResourceId);
  for (let i = 0; i < levels; i++) {
    if (!current?._cai_managerresourceid_value) return null;
    current = await getCachedResource(current._cai_managerresourceid_value);
  }
  return current;
}

/**
 * Walk up the manager chain until we find a resource with no manager (the L1 leader).
 * Returns the L1 resource, or null if the chain is broken.
 */
async function walkToL1(startResourceId: string): Promise<IResource | null> {
  let current = await getCachedResource(startResourceId);
  const visited = new Set<string>();

  while (current?._cai_managerresourceid_value) {
    if (visited.has(current.cai_resourceid)) {
      console.warn('[PortfolioNavigator] walkToL1 aborted: cycle detected in manager chain.', {
        startResourceId,
        cycleAt: current.cai_resourceid,
      });
      return null; // cycle guard — fail safely rather than return an arbitrary node
    }
    visited.add(current.cai_resourceid);
    current = await getCachedResource(current._cai_managerresourceid_value);
  }

  return current;
}

/**
 * Walk up the full manager chain and return the L2 leader (the person whose
 * manager is the L1 leader — i.e., one level below the top).
 * Returns null if the chain is too short (person is already L1 or L2).
 */
async function walkToL2(startResourceId: string): Promise<IResource | null> {
  const chain: IResource[] = [];
  let current = await getCachedResource(startResourceId);
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.cai_resourceid)) {
      console.warn('[PortfolioNavigator] walkToL2 aborted: cycle detected in manager chain.', {
        startResourceId,
        cycleAt: current.cai_resourceid,
      });
      return null; // cycle guard — fail safely rather than return a partial chain
    }
    visited.add(current.cai_resourceid);
    chain.push(current);
    if (!current._cai_managerresourceid_value) break;
    current = await getCachedResource(current._cai_managerresourceid_value);
  }

  // chain[0] = start, chain[last] = L1 (no manager)
  // L2 = chain[chain.length - 2] (one below L1)
  if (chain.length < 2) return null; // already at L1, no L2 exists
  return chain[chain.length - 2] ?? null;
}

function scopeLabel(displayName: string, suffix: string): string {
  const firstName = displayName.split(' ')[0] ?? displayName;
  return `${firstName}'s Team${suffix ? ` (${suffix})` : ''}`;
}

/**
 * Resolve a single delegation to a scope with a root resource ID.
 * Returns null if the scope can't be resolved (e.g., chain too short).
 */
export async function resolveDelegationScope(
  delegation: IDelegation,
  delegateResourceId: string,
): Promise<ResolvedScope | null> {
  const { cai_scopetype: scopeType } = delegation;
  let root: IResource | null = null;
  let flat = false;
  let suffix = '';

  switch (scopeType) {
    case DelegationScopeType.DesignatedManagerDirects: {
      if (!delegation._cai_delegatorresourceid_value) {
        console.warn('[PortfolioNavigator] Delegation could not resolve: DesignatedManagerDirects scope is missing delegator resource.', {
          delegationId: delegation.cai_delegationid,
          delegateResourceId,
          scopeType,
        });
        return null;
      }
      root = await getCachedResource(delegation._cai_delegatorresourceid_value);
      flat = true;
      break;
    }
    case DelegationScopeType.DesignatedManagerCascade: {
      if (!delegation._cai_delegatorresourceid_value) {
        console.warn('[PortfolioNavigator] Delegation could not resolve: DesignatedManagerCascade scope is missing delegator resource.', {
          delegationId: delegation.cai_delegationid,
          delegateResourceId,
          scopeType,
        });
        return null;
      }
      root = await getCachedResource(delegation._cai_delegatorresourceid_value);
      suffix = 'Cascade';
      break;
    }
    case DelegationScopeType.M1Peers: {
      root = await walkManagerChain(delegateResourceId, 1);
      flat = true;
      suffix = 'M1 Peers';
      break;
    }
    case DelegationScopeType.M1Cascade: {
      root = await walkManagerChain(delegateResourceId, 1);
      suffix = 'M1';
      break;
    }
    case DelegationScopeType.M2Cascade: {
      root = await walkManagerChain(delegateResourceId, 2);
      suffix = 'M2';
      break;
    }
    case DelegationScopeType.M3Cascade: {
      root = await walkManagerChain(delegateResourceId, 3);
      suffix = 'M3';
      break;
    }
    case DelegationScopeType.L1Cascade: {
      root = await walkToL1(delegateResourceId);
      suffix = 'L1';
      break;
    }
    case DelegationScopeType.L2Cascade: {
      root = await walkToL2(delegateResourceId);
      suffix = 'L2';
      break;
    }
    default:
      console.warn('[PortfolioNavigator] Delegation could not resolve: unsupported scope type.', {
        delegationId: delegation.cai_delegationid,
        delegateResourceId,
        scopeType,
      });
      return null;
  }

  if (!root) {
    console.warn('[PortfolioNavigator] Delegation could not resolve to a root resource.', {
      delegationId: delegation.cai_delegationid,
      delegateResourceId,
      scopeType,
      delegatorResourceId: delegation._cai_delegatorresourceid_value ?? null,
    });
    return null;
  }

  return {
    id: delegation.cai_delegationid,
    label: scopeLabel(root.cai_displayname, suffix),
    rootResourceId: root.cai_resourceid,
    rootDisplayName: root.cai_displayname,
    flat,
  };
}

/**
 * Resolve all delegations to scopes. Filters out any that can't be resolved.
 */
export async function resolveAllDelegationScopes(
  delegations: IDelegation[],
  delegateResourceId: string,
): Promise<ResolvedScope[]> {
  const results = await Promise.all(
    delegations.map((d) => resolveDelegationScope(d, delegateResourceId)),
  );
  const resolved = results.filter((r): r is ResolvedScope => r !== null);
  if (resolved.length !== delegations.length) {
    console.warn('[PortfolioNavigator] Some delegations were found but did not resolve to usable scopes.', {
      delegateResourceId,
      delegationCount: delegations.length,
      resolvedScopeCount: resolved.length,
    });
  }
  return resolved;
}

/** Clear the resource cache (e.g., on training mode toggle). */
export function clearScopeResolverCache(): void {
  resourceCache.clear();
}
