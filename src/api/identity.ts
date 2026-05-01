/* ── Identity helpers for Code App — replaces xrm.ts getters ── */

import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';

export const MOCK_CURRENT_USER_ID = 'c1e2e054-6ddb-f011-8544-6045bd0390df';

let trainingMode = false;
let cachedUserId: string | null = null;
let cachedUserName: string | null = null;

interface IOperationResult<T> {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  } | null;
}

interface IIdentityClient {
  executeAsync?<T>(request: unknown): Promise<IOperationResult<T>>;
}

async function getIdentityClient(): Promise<IIdentityClient> {
  const { getClient } = await import('@microsoft/power-apps/data');
  return getClient(dataSourcesInfo) as unknown as IIdentityClient;
}

function normalizeGuid(value: string): string {
  return value.replace(/[{}]/g, '').toLowerCase();
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readHostUserId(): string | null {
  try {
    const hostWindow = window as unknown as Record<string, unknown>;
    const powerApps = hostWindow.PowerApps;
    if (powerApps && typeof powerApps === 'object') {
      const user = (powerApps as Record<string, unknown>).user;
      if (user && typeof user === 'object') {
        const id = readString((user as Record<string, unknown>).id);
        if (id) return normalizeGuid(id);
      }
    }

    const host = hostWindow.__powerAppsHost;
    if (host && typeof host === 'object') {
      const user = (host as Record<string, unknown>).user;
      if (user && typeof user === 'object') {
        const id = readString((user as Record<string, unknown>).id);
        if (id) return normalizeGuid(id);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function readHostUserName(): string | null {
  try {
    const hostWindow = window as unknown as Record<string, unknown>;
    const powerApps = hostWindow.PowerApps;
    if (powerApps && typeof powerApps === 'object') {
      const user = (powerApps as Record<string, unknown>).user;
      if (user && typeof user === 'object') {
        return readString((user as Record<string, unknown>).displayName)
          ?? readString((user as Record<string, unknown>).name);
      }
    }

    const host = hostWindow.__powerAppsHost;
    if (host && typeof host === 'object') {
      const user = (host as Record<string, unknown>).user;
      if (user && typeof user === 'object') {
        return readString((user as Record<string, unknown>).displayName)
          ?? readString((user as Record<string, unknown>).name);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isTrainingMode(): boolean {
  return trainingMode;
}

export function setTrainingMode(enabled: boolean): void {
  trainingMode = enabled;
}

export function isPowerAppsHostAvailable(): boolean {
  try {
    const hostWindow = window as unknown as Record<string, unknown>;
    return typeof hostWindow.__powerAppsHost !== 'undefined'
      || typeof hostWindow.PowerApps !== 'undefined';
  } catch {
    return false;
  }
}

export async function resolveCurrentUserId(): Promise<string> {
  const hostUserId = readHostUserId();
  if (hostUserId) {
    return hostUserId;
  }

  try {
    const client = await getIdentityClient();
    if (typeof client.executeAsync === 'function') {
      const result = await client.executeAsync<{ UserId?: string }>({
        dataverseRequest: {
          action: 'WhoAmI',
        },
      });
      const userId = result.data?.UserId;
      if (userId) {
        return normalizeGuid(userId);
      }
    }
  } catch (error) {
    console.warn('[PortfolioNav] WhoAmI failed, using mock user ID.', error);
  }

  return MOCK_CURRENT_USER_ID;
}

export async function initCurrentUser(userId?: string | null): Promise<void> {
  const resolvedUserId = userId ? normalizeGuid(userId) : await resolveCurrentUserId();
  cachedUserId = resolvedUserId;
  cachedUserName = readHostUserName();
}

export function getCurrentUserId(): string {
  return cachedUserId ?? MOCK_CURRENT_USER_ID;
}

export function getCurrentUserName(): string | null {
  return cachedUserName ?? readHostUserName();
}

export function getClientUrl(): string | null {
  try {
    return window.location.origin || 'https://portfolioshapingdev.crm.dynamics.com';
  } catch {
    return 'https://portfolioshapingdev.crm.dynamics.com';
  }
}

export function isXrmAvailable(): boolean {
  return !trainingMode && cachedUserId !== null;
}
