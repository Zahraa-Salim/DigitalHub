// File Summary: server/src/utils/redis.ts
// Layer: utils
// Purpose: Provides an optional singleton Redis client for cache and rate-limit features.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import Redis from "ioredis";

let redisClient = null;
let redisDisabled = false;

export function getRedis() {
  if (redisDisabled) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    redisClient.on("error", (error) => {
      console.error("[redis] unavailable:", error?.message ?? error);
      redisDisabled = true;
      try {
        redisClient?.disconnect();
      } catch {
      }
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.error("[redis] init failed:", error?.message ?? error);
    redisDisabled = true;
    redisClient = null;
    return null;
  }
}
