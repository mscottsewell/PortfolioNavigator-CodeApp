import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  extractErrorMessage,
  extractErrorStatus,
  getRetryDelayMs,
  isRetryableDataverseError,
  isRetryableDataverseResponse,
} from '../api/retryPolicy';

describe('retryPolicy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts messages from error-like objects', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
    expect(extractErrorMessage({ message: 'plain object failure' })).toBe('plain object failure');
  });

  it('extracts HTTP-style status values from error-like objects', () => {
    expect(extractErrorStatus({ status: 429 })).toBe(429);
    expect(extractErrorStatus({ statusCode: 503 })).toBe(503);
    expect(extractErrorStatus({ httpStatusCode: 504 })).toBe(504);
    expect(extractErrorStatus({ message: 'no status here' })).toBeNull();
  });

  it('treats common Dataverse lock and throttle failures as retryable', () => {
    expect(isRetryableDataverseError({ message: 'Transaction (Process ID 60) was deadlocked on lock resources.' })).toBe(true);
    expect(isRetryableDataverseError({ status: 429, message: 'Too Many Requests' })).toBe(true);
    expect(isRetryableDataverseError({ message: 'Lock request time out period exceeded.' })).toBe(true);
    expect(isRetryableDataverseError({ message: 'Validation failed for business rule.' })).toBe(false);
  });

  it('treats retryable responses consistently', () => {
    expect(isRetryableDataverseResponse(503, 'Service unavailable')).toBe(true);
    expect(isRetryableDataverseResponse(400, 'deadlock detected')).toBe(true);
    expect(isRetryableDataverseResponse(400, 'invalid payload')).toBe(false);
  });

  it('adds bounded jitter to retry delays', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(getRetryDelayMs(0)).toBe(900);
    expect(getRetryDelayMs(3)).toBe(5625);
    expect(getRetryDelayMs(5)).toBe(5625);
  });
});
