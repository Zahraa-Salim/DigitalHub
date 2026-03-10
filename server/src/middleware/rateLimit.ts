// File: server/src/middleware/rateLimit.ts
// Purpose: Creates the rate limiting rules used by sensitive API endpoints.
// It helps protect auth and public routes from abusive request bursts.

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../utils/appError.js";
import { getRedis } from "../utils/redis.js";

type RateLimitOptions = {
  keyPrefix: string;
  windowSec: number;
  max: number;
  keyFn?: (req: Request) => string | number | null | undefined;
};

// Handles 'rateLimit' workflow for this module.
export function rateLimit({ keyPrefix, windowSec, max, keyFn }: RateLimitOptions): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedis();
    if (!redis) {
      next();
      return;
    }

    const identity = String((keyFn ? keyFn(req) : req.ip) ?? "unknown");
    const redisKey = `${keyPrefix}:${identity}`;

    try {
      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }

      if (count > max) {
        throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again later.", undefined);
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

