// File Summary: server/src/utils/cache.ts
// Layer: utils
// Purpose: Exposes safe cache helpers that no-op when Redis is unavailable.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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
