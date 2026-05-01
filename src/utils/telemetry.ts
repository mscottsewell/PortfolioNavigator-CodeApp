import {
  ApplicationInsights,
  SeverityLevel,
  type IDependencyTelemetry,
  type ITelemetryItem,
} from '@microsoft/applicationinsights-web';

const DEFAULT_CLOUD_ROLE = 'PortfolioNavigatorMAT';

type TelemetryValue = string | number | boolean | null | undefined;
type TelemetryProperties = Record<string, TelemetryValue>;
type TelemetryMeasurements = Record<string, number | null | undefined>;

export interface TelemetryContext {
  appVersion?: string;
  activeTab?: string;
  trainingMode?: boolean;
  userId?: string;
  resourceId?: string;
}

interface InitializeTelemetryOptions {
  connectionString?: string;
  cloudRole?: string;
  appVersion?: string;
}

interface TrackEventOptions {
  properties?: TelemetryProperties;
  measurements?: TelemetryMeasurements;
}

interface DataverseTelemetry {
  operation: string;
  entityLogicalName?: string;
  durationMs: number;
  success: boolean;
  responseCode?: number | null;
  target?: string;
  properties?: TelemetryProperties;
  measurements?: TelemetryMeasurements;
}

let appInsights: ApplicationInsights | null = null;
const sharedContext: Record<string, TelemetryValue> = {};
let cloudRole = DEFAULT_CLOUD_ROLE;

function sanitizeProperties(properties?: TelemetryProperties): Record<string, string> {
  const sanitized: Record<string, string> = {};
  if (!properties) {
    return sanitized;
  }

  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null) {
      continue;
    }
    sanitized[key] = String(value);
  }

  return sanitized;
}

function sanitizeMeasurements(measurements?: TelemetryMeasurements): Record<string, number> {
  const sanitized: Record<string, number> = {};
  if (!measurements) {
    return sanitized;
  }

  for (const [key, value] of Object.entries(measurements)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function buildProperties(properties?: TelemetryProperties): Record<string, string> {
  return {
    ...sanitizeProperties(sharedContext),
    ...sanitizeProperties(properties),
  };
}

function buildMeasurements(measurements?: TelemetryMeasurements): Record<string, number> {
  return sanitizeMeasurements(measurements);
}

function buildTelemetryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeUserId(userId?: string): string | null {
  if (!userId) {
    return null;
  }

  const sanitized = userId.trim().replace(/[\s,;=|]+/g, '_');
  return sanitized.length > 0 ? sanitized : null;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

function applyTelemetryContext(item: ITelemetryItem): void {
  const tags = (item.tags ?? {}) as Record<string, string>;
  tags['ai.cloud.role'] = cloudRole;
  item.tags = tags as typeof item.tags;

  const mergedProperties = buildProperties();
  if (Object.keys(mergedProperties).length === 0) {
    return;
  }

  const baseData = item.baseData as { properties?: Record<string, unknown> } | undefined;
  if (!baseData || typeof baseData !== 'object') {
    return;
  }

  baseData.properties = {
    ...mergedProperties,
    ...(baseData.properties ?? {}),
  };
}

export function initializeTelemetry(options: InitializeTelemetryOptions = {}): boolean {
  if (appInsights) {
    if (options.appVersion) {
      setTelemetryContext({ appVersion: options.appVersion });
    }
    return true;
  }

  const connectionString = options.connectionString?.trim()
    || import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING?.trim();

  if (!connectionString) {
    return false;
  }

  cloudRole = options.cloudRole?.trim() || DEFAULT_CLOUD_ROLE;

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      disableAjaxTracking: true,
      disableFetchTracking: true,
      disableCorrelationHeaders: true,
      enableUnhandledPromiseRejectionTracking: true,
    },
  });

  appInsights.loadAppInsights();
  appInsights.addTelemetryInitializer((item) => {
    applyTelemetryContext(item);
    return true;
  });

  if (options.appVersion) {
    setTelemetryContext({ appVersion: options.appVersion });
  }

  return true;
}

export function isTelemetryEnabled(): boolean {
  return appInsights !== null;
}

export function setTelemetryContext(context: Partial<TelemetryContext>): void {
  for (const [key, value] of Object.entries(context) as Array<[keyof TelemetryContext, TelemetryContext[keyof TelemetryContext]]>) {
    if (value === undefined || value === null || value === '') {
      delete sharedContext[key];
    } else {
      sharedContext[key] = value;
    }
  }

  if (!appInsights) {
    return;
  }

  const userId = sanitizeUserId(typeof sharedContext.userId === 'string' ? sharedContext.userId : undefined);
  if (userId) {
    appInsights.setAuthenticatedUserContext(userId, undefined, false);
  } else {
    appInsights.clearAuthenticatedUserContext();
  }
}

export function trackEvent(name: string, options: TrackEventOptions = {}): void {
  if (!appInsights) {
    return;
  }

  appInsights.trackEvent({
    name,
    properties: buildProperties(options.properties),
    measurements: buildMeasurements(options.measurements),
  });
}

export function trackPageView(name: string, uri?: string, properties?: TelemetryProperties): void {
  if (!appInsights) {
    return;
  }

  appInsights.trackPageView({
    name,
    uri,
    properties: buildProperties(properties),
  });
}

export function trackException(
  error: unknown,
  properties?: TelemetryProperties,
  severityLevel: SeverityLevel = SeverityLevel.Error,
): void {
  if (!appInsights) {
    return;
  }

  appInsights.trackException({
    exception: toError(error),
    severityLevel,
    properties: buildProperties(properties),
  });
}

export function trackDataverseCall({
  operation,
  entityLogicalName,
  durationMs,
  success,
  responseCode,
  target,
  properties,
  measurements,
}: DataverseTelemetry): void {
  if (!appInsights) {
    return;
  }

  const dependency: IDependencyTelemetry = {
    id: buildTelemetryId(),
    name: entityLogicalName ? `${operation} ${entityLogicalName}` : operation,
    data: entityLogicalName ? `${operation}:${entityLogicalName}` : operation,
    target: target ?? 'Dataverse',
    type: 'Dataverse',
    startTime: new Date(Date.now() - Math.max(0, durationMs)),
    duration: Math.max(0, durationMs),
    success,
    responseCode: responseCode ?? 0,
    properties: buildProperties({
      operation,
      entityLogicalName,
      ...properties,
    }),
    measurements: buildMeasurements({
      durationMs,
      ...measurements,
    }),
  };

  appInsights.trackDependencyData(dependency);
}

