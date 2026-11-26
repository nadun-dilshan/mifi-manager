import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { errorMessage } from '@/lib/format';

interface Options {
  /** Re-fetch on this interval while the screen is focused and the app is in the foreground. */
  intervalMs?: number;
}

export interface RouterData<T> {
  data: T | null;
  error: string | null;
  /** True until the first attempt finishes. */
  loading: boolean;
  /** True while a pull-to-refresh is running. */
  refreshing: boolean;
  /** Pull-to-refresh handler. */
  refresh: () => void;
  /** Silent re-fetch, e.g. after saving a change. */
  reload: () => Promise<void>;
}

/**
 * Loads data from the router when the screen gains focus, optionally polling.
 * Overlapping fetches are skipped so a slow router is never sent a backlog of requests.
 */
export function useRouterData<T>(fetcher: () => Promise<T>, options: Options = {}): RouterData<T> {
  const { intervalMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (pull: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (pull) setRefreshing(true);
    try {
      const next = await fetcherRef.current();
      if (mounted.current) {
        setData(next);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) setError(errorMessage(err));
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
      if (!intervalMs) return undefined;
      const id = setInterval(() => {
        if (AppState.currentState === 'active') void load(false);
      }, intervalMs);
      return () => clearInterval(id);
    }, [load, intervalMs])
  );

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);
  const reload = useCallback(() => load(false), [load]);

  return { data, error, loading, refreshing, refresh, reload };
}
