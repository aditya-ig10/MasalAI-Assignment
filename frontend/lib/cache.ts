"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tiny browser cache for fast page loads: localStorage-backed entries with
 * a TTL, plus a stale-while-revalidate hook. Pages render the last-known
 * data instantly, then refresh quietly in the background.
 */

const PREFIX = "masalai-cache:v1:";

interface Entry<T> {
  savedAt: number;
  data: T;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function keyOf(key: string): string {
  return `${PREFIX}${key}`;
}

/** Last cached value, or null when missing / expired / unreadable. */
export function readCache<T>(key: string, maxAgeMs: number): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(keyOf(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (typeof entry.savedAt !== "number" || Date.now() - entry.savedAt > maxAgeMs) {
      store.removeItem(keyOf(key));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** Persist a value for later instant loads. Never throws. */
export function writeCache<T>(key: string, data: T): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(keyOf(key), JSON.stringify({ savedAt: Date.now(), data } satisfies Entry<T>));
  } catch {
    // Quota exceeded or unavailable — caching is best-effort.
  }
}

/** Drop cached entries. Pass a prefix (e.g. "leads") to bust a group,
 *  or nothing to clear the whole app cache. */
export function bustCache(prefix?: string): void {
  const store = storage();
  if (!store) return;
  try {
    const match = prefix ? `${PREFIX}${prefix}` : PREFIX;
    const doomed: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k && k.startsWith(match)) doomed.push(k);
    }
    doomed.forEach((k) => store.removeItem(k));
  } catch {
    // best-effort
  }
}

export interface CachedOptions<T> {
  /** How long a cached value counts as fresh (still rendered instantly either way). */
  ttlMs: number;
  /** Shown when there is neither cache nor network data. */
  fallback?: T;
}

export interface CachedResult<T> {
  data: T;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Optimistically replace the value (also updates the cache). */
  update: (next: T) => void;
}

/**
 * Render cached data instantly, then revalidate in the background.
 * `loading` is only true when nothing is on screen yet.
 * When a `fallback` is given, `data` is never null.
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedOptions<T> & { fallback: T }
): CachedResult<T>;
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedOptions<T>
): CachedResult<T | null>;
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedOptions<T>
): CachedResult<T | null> {
  const { ttlMs, fallback } = opts;
  const [data, setData] = useState<T | null>(() => readCache<T>(key, ttlMs));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await fetcher();
      setData(fresh);
      writeCache(key, fresh);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not refresh data.");
    } finally {
      setRefreshing(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    let live = true;
    setRefreshing(true);
    setError(null);
    fetcher()
      .then((fresh) => {
        if (!live) return;
        setData(fresh);
        writeCache(key, fresh);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : "Could not load data.");
      })
      .finally(() => {
        if (live) setRefreshing(false);
      });
    return () => {
      live = false;
    };
    // Re-run when the cache key changes (e.g. a different lead id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Optimistically replace the value (also updates the cache). */
  const update = useCallback(
    (next: T | null) => {
      setData(next);
      if (next !== null) writeCache(key, next);
    },
    [key]
  );

  const visible = data ?? fallback ?? null;
  return { data: visible, loading: visible === null && refreshing, refreshing, error, refresh, update };
}
