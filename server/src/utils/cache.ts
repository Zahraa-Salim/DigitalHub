// File: server/src/utils/cache.ts
// Purpose: Provides shared helper logic for cache.
// It supports other backend modules with reusable utility functions.


import { getRedis } from "./redis.js";

// Handles 'cacheGetJson' workflow for this module.
export async function cacheGetJson<T = unknown>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Handles 'cacheSetJson' workflow for this module.
export async function cacheSetJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
  }
}

// Handles 'cacheDel' workflow for this module.
export async function cacheDel(keys: string | string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const list = Array.isArray(keys) ? keys : [keys];
  if (!list.length) {
    return;
  }

  try {
    await redis.del(...list);
  } catch {
  }
}

