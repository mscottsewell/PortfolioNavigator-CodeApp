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

  // Not in Power Apps mode — return mock ID
  if (Object.keys(dataSourcesInfo as Record<string, unknown>).length === 0) {
    return MOCK_CURRENT_USER_ID;
  }

  // In Code App mode: use WhoAmI via the SDK
  try {
    const { getClient } = await import('@microsoft/power-apps/data');
    const client = getClient(dataSourcesInfo) as unknown as {
      executeAsync?: <T>(req: unknown) => Promise<IOperationResult<T>>;
    };
    if (typeof client.executeAsync === 'function') {
      const result = await client.executeAsync<{ UserId?: string; userId?: string }>({
        dataverseRequest: {
          action: 'customapi',
          parameters: { operationName: 'WhoAmI', tableName: 'whoami' },
        },
      });
      const userId = result.data?.UserId ?? result.data?.userId;
      if (userId) return normalizeGuid(userId);
    }
  } catch (error) {
    console.warn('[PortfolioNav] WhoAmI failed, userId will be resolved lazily.', error);
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
  if (trainingMode) return false;
  // Real mode when dataSourcesInfo has been populated by pac code add-data-source.
  // Stub file exports an empty object; generated file has entity entries.
  return Object.keys(dataSourcesInfo as Record<string, unknown>).length > 0;
}
