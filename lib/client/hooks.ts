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

/** Fetches on mount (and whenever `key` changes), optionally polling every `intervalMs`. */
export function useFetch<T>(fetcher: (() => Promise<T>) | null, key: string, intervalMs?: number): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!fetcher);
  const ref = useRef(fetcher);
  useEffect(() => {
    ref.current = fetcher;
  });

  const reload = useCallback(async () => {
    if (!ref.current) return;
    try {
      const next = await ref.current();
      setData(next);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("UNKNOWN", String(e), 0));
    } finally {
      setLoading(false);
    }
  }, []);

  const enabled = !!fetcher;
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const run = () => alive && reload();
    run();
    if (!intervalMs) return () => void (alive = false);
    const t = setInterval(run, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [key, intervalMs, reload, enabled]);

  return { data, error, loading, reload };
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
