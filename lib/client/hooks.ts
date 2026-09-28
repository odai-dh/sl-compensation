"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { UserView } from "@/lib/schemas";
import { api, ApiError } from "./api";
import { useApp } from "./store";

export type Loadable<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * Fetches on mount (and whenever `key` changes), optionally polling every `intervalMs`.
 * - A response that arrives after a newer request was sent is ignored (no out-of-order overwrites).
 * - Changing `key` clears the previous key's data, so a screen never shows another key's results.
 * - Polling stops on a 404: the thing being watched is gone, and asking again every second won't bring it back.
 */
export function useFetch<T>(fetcher: (() => Promise<T>) | null, key: string, intervalMs?: number): Loadable<T> {
  const [state, setState] = useState<{ key: string; data: T | null; error: ApiError | null; loading: boolean }>({
    key,
    data: null,
    error: null,
    loading: !!fetcher,
  });
  const ref = useRef(fetcher);
  const latest = useRef(0);
  const keyRef = useRef(key);
  useEffect(() => {
    ref.current = fetcher;
    keyRef.current = key;
  });

  // Data from a previous key is never shown for the current one.
  if (state.key !== key) setState({ key, data: null, error: null, loading: !!fetcher });
  const current = state.key === key ? state : { key, data: null, error: null, loading: !!fetcher };

  const reload = useCallback(async (): Promise<ApiError | null> => {
    if (!ref.current) return null;
    const ticket = ++latest.current;
    const forKey = keyRef.current;
    try {
      const next = await ref.current();
      if (ticket === latest.current) setState({ key: forKey, data: next, error: null, loading: false });
      return null;
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError("UNKNOWN", String(e), 0);
      if (ticket === latest.current) setState((prev) => ({ key: forKey, data: prev.key === forKey ? prev.data : null, error, loading: false }));
      return error;
    }
  }, []);

  const enabled = !!fetcher;
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const run = async () => {
      if (!alive) return;
      const error = await reload();
      if (error?.status === 404 && timer) clearInterval(timer);
    };
    void run();
    if (intervalMs) timer = setInterval(run, intervalMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [key, intervalMs, reload, enabled]);

  return { data: current.data, error: current.error, loading: current.loading, reload: async () => void (await reload()) };
}

/** The signed-in user's view, or null when signed out. */
export function useUser(): Loadable<UserView> & { userId: string | null } {
  const userId = useApp((s) => s.userId);
  const loadable = useFetch(userId ? () => api.user(userId) : null, userId ?? "none");
  return { ...loadable, userId };
}

/** Reads a query-string value after mount (avoids hydration mismatches and Suspense for useSearchParams). */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

const noopSubscribe = () => () => undefined;
