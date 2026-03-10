// File: server/src/utils/redis.ts
// Purpose: Provides shared helper logic for redis.
// It supports other backend modules with reusable utility functions.


import { Redis } from "ioredis";

let redisClient: Redis | null = null;
let redisDisabled = false;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Handles 'getRedis' workflow for this module.
export function getRedis(): Redis | null {
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

    redisClient.on("error", (error: unknown) => {
      console.error("[redis] unavailable:", toErrorMessage(error));
      redisDisabled = true;
      try {
        redisClient?.disconnect();
      } catch {
      }
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.error("[redis] init failed:", toErrorMessage(error));
    redisDisabled = true;
    redisClient = null;
    return null;
  }
}

