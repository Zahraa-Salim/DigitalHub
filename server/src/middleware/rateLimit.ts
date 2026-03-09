// File: server/src/middleware/rateLimit.ts
// What this code does:
// 1) Runs in the request pipeline before/after route handlers.
// 2) Enforces cross-cutting rules like auth, validation, and errors.
// 3) Normalizes request/response behavior for downstream code.
// 4) Removes duplicated policy logic from controllers.
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
