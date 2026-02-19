// File Summary: server/src/middleware/rateLimit.ts
// Layer: middleware
// Purpose: Adds Redis-backed rate limiting with graceful fallback when Redis is unavailable.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { AppError } from "../utils/appError.js";
import { getRedis } from "../utils/redis.js";

export function rateLimit({ keyPrefix, windowSec, max, keyFn }) {
  return async (req, _res, next) => {
    const redis = getRedis();
    if (!redis) {
      next();
      return;
    }

    const identity = (keyFn ? keyFn(req) : req.ip) || "unknown";
    const redisKey = `${keyPrefix}:${identity}`;

    try {
      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }

      if (count > max) {
        throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }

      // Redis failure should not block requests.
      next();
    }
  };
}
