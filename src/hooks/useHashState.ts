/* ── URL hash state hook ── */

import { useState, useEffect, useCallback } from 'react';

function parseHash(): URLSearchParams {
  return new URLSearchParams(window.location.hash.slice(1));
}

function parseInitialParams(): URLSearchParams {
  const hashStr = window.location.hash.slice(1);
  if (hashStr) return new URLSearchParams(hashStr);

  const sp = new URLSearchParams(window.location.search);
  const data = sp.get('data') ?? sp.get('Data');
  if (data) {
    const params = new URLSearchParams(data);
    if (params.toString()) {
      history.replaceState(null, '', '#' + params.toString());
      return params;
    }
  }

  return new URLSearchParams();
}

/**
 * Reactive hook for reading and writing URL hash params.
 *
 * `hashParams` is kept in sync with `window.location.hash` and reflects any
 * back/forward browser navigation. State is written via `history.replaceState`
 * (or `pushState` when `push` is true) so the parent Power Apps iframe is not
 * disrupted.
 */
export function useHashState() {
  const [hashParams, setHashParamsState] = useState<URLSearchParams>(parseInitialParams);

  // Keep in sync with browser back/forward navigation.
  useEffect(() => {
    const sync = () => setHashParamsState(parseHash());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const setHashParam = useCallback((key: string, value: string, push = false): void => {
    const next = parseHash();
    next.set(key, value);
    const hashStr = '#' + next.toString();
    if (push) {
      history.pushState(null, '', hashStr);
    } else {
      history.replaceState(null, '', hashStr);
    }
    setHashParamsState(next);
  }, []);

  const clearHashParam = useCallback((key: string, push = false): void => {
    const next = parseHash();
    next.delete(key);
    const hashStr = next.toString()
      ? '#' + next.toString()
      : window.location.pathname + window.location.search;
    if (push) {
      history.pushState(null, '', hashStr);
    } else {
      history.replaceState(null, '', hashStr);
    }
    setHashParamsState(next);
  }, []);

  return { hashParams, setHashParam, clearHashParam };
}
