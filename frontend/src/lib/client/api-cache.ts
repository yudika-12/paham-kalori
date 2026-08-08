"use client";

const DEFAULT_TTL = 60_000;

const store = new Map<string, { at: number; data: unknown }>();

export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data as T;
  const data = await fetcher();
  store.set(key, { at: Date.now(), data });
  return data;
}

export function invalidateApiCache() {
  store.clear();
}
