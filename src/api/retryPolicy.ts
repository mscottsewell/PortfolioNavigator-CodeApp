const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE_FRAGMENTS = [
  'deadlock',
  'sp_getapplock',
  'retry the request',
  'timeout expired',
  'lock request time out period exceeded',
  'too many requests',
  'throttl',
  'temporarily unavailable',
  'service unavailable',
  'gateway timeout',
];
const BASE_DELAY_MS = 800;
const MAX_DELAY_MS = 5000;
const JITTER_RATIO = 0.25;

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    try {
      return JSON.stringify(err);
    } catch {
      return '[unserializable error object]';
    }
  }
  return String(err);
}

export function extractErrorStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;

  const obj = err as Record<string, unknown>;
  for (const key of ['status', 'statusCode', 'httpStatusCode']) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function isRetryableDataverseResponse(status: number, details: string): boolean {
  const normalized = details.toLowerCase();
  return RETRYABLE_STATUS_CODES.has(status)
    || RETRYABLE_MESSAGE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function isRetryableDataverseError(err: unknown): boolean {
  const status = extractErrorStatus(err);
  if (status !== null && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  return isRetryableDataverseResponse(-1, extractErrorMessage(err));
}

export function getRetryDelayMs(attempt: number): number {
  const baseDelay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  const jitterWindow = Math.max(1, Math.round(baseDelay * JITTER_RATIO));
  return baseDelay + Math.floor(Math.random() * jitterWindow);
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

