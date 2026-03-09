// File: server/src/utils/cache.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
// @ts-nocheck
import { getRedis } from "./redis.js";

export async function cacheGetJson(key) {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheSetJson(key, value, ttlSec) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
  }
}

export async function cacheDel(keys) {
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
