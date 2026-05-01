/* ── useHashState hook tests ── */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashState } from '../hooks/useHashState';

// jsdom provides window.location but history.pushState / replaceState need to be tracked.
// We spy on them to verify which method was called.

describe('useHashState', () => {
  beforeEach(() => {
    // Reset the hash before each test
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('initializes with empty hash params when hash is empty', () => {
    const { result } = renderHook(() => useHashState());
    expect(result.current.hashParams.get('tab')).toBeNull();
    expect(result.current.hashParams.toString()).toBe('');
  });

  it('parses existing hash params on mount', () => {
    window.location.hash = '#tab=allocations&manager=abc-123';
    const { result } = renderHook(() => useHashState());
    expect(result.current.hashParams.get('tab')).toBe('allocations');
    expect(result.current.hashParams.get('manager')).toBe('abc-123');
  });

  it('setHashParam updates hash and state', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    const { result } = renderHook(() => useHashState());

    act(() => {
      result.current.setHashParam('tab', 'assignments');
    });

    expect(result.current.hashParams.get('tab')).toBe('assignments');
    expect(replaceSpy).toHaveBeenCalledWith(null, '', '#tab=assignments');
    replaceSpy.mockRestore();
  });

  it('setHashParam with push=true calls pushState', () => {
    const pushSpy = vi.spyOn(history, 'pushState');
    const { result } = renderHook(() => useHashState());

    act(() => {
      result.current.setHashParam('tab', 'allocations', true);
    });

    expect(pushSpy).toHaveBeenCalledWith(null, '', '#tab=allocations');
    pushSpy.mockRestore();
  });

  it('setHashParam preserves existing params', () => {
    window.location.hash = '#tab=allocations&manager=abc-123';
    const { result } = renderHook(() => useHashState());

    act(() => {
      result.current.setHashParam('period', 'period-999');
    });

    expect(result.current.hashParams.get('tab')).toBe('allocations');
    expect(result.current.hashParams.get('manager')).toBe('abc-123');
    expect(result.current.hashParams.get('period')).toBe('period-999');
  });

  it('clearHashParam removes the specified key and preserves others', () => {
    window.location.hash = '#tab=allocations&manager=abc-123';
    const { result } = renderHook(() => useHashState());

    act(() => {
      result.current.clearHashParam('manager');
    });

    expect(result.current.hashParams.get('manager')).toBeNull();
    expect(result.current.hashParams.get('tab')).toBe('allocations');
  });

  it('clearHashParam with all params removed sets clean URL', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    window.location.hash = '#tab=allocations';
    const { result } = renderHook(() => useHashState());

    act(() => {
      result.current.clearHashParam('tab');
    });

    expect(result.current.hashParams.toString()).toBe('');
    // Should not include a dangling '#'
    const calledWith = replaceSpy.mock.calls[0]?.[2] as string | undefined;
    expect(calledWith).not.toBe('#');
    replaceSpy.mockRestore();
  });

  it('syncs state when hashchange event fires (simulating back/forward)', () => {
    const { result } = renderHook(() => useHashState());

    act(() => {
      window.location.hash = '#tab=services';
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(result.current.hashParams.get('tab')).toBe('services');
  });

  // Code App deep-link scenarios: ?data= param promotion
  it('reads own ?data= param and promotes to hash when hash is empty', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?data=tab%3Dallocations%26manager%3Dabc-123', hash: '' },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHashState());
    expect(result.current.hashParams.get('tab')).toBe('allocations');
    expect(result.current.hashParams.get('manager')).toBe('abc-123');
    expect(replaceSpy).toHaveBeenCalledWith(null, '', expect.stringContaining('tab=allocations'));

    // Restore
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '', hash: '' },
      writable: true,
      configurable: true,
    });
  });

  it('handles ?Data= (capital D) variant from some UCI versions', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?Data=tab%3Dassignments%26manager%3Dxyz', hash: '' },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHashState());
    expect(result.current.hashParams.get('tab')).toBe('assignments');
    expect(result.current.hashParams.get('manager')).toBe('xyz');
    expect(replaceSpy).toHaveBeenCalledWith(null, '', expect.stringContaining('tab=assignments'));

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '', hash: '' },
      writable: true,
      configurable: true,
    });
  });

  it('prefers own hash over ?data= param', () => {
    window.location.hash = '#tab=services&manager=existing';
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?data=tab%3Dallocations', hash: '#tab=services&manager=existing' },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useHashState());
    expect(result.current.hashParams.get('tab')).toBe('services');
    expect(result.current.hashParams.get('manager')).toBe('existing');

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '', hash: '' },
      writable: true,
      configurable: true,
    });
  });
});
