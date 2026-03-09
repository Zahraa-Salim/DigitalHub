// File: server/src/utils/redis.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
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
