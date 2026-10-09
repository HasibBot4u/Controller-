import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

export function rateLimiter(options: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = 'global' } = options;
  if (!rateLimitStores.has(keyPrefix)) {
    rateLimitStores.set(keyPrefix, new Map());
  }
  const store = rateLimitStores.get(keyPrefix)!;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Identify client by authenticated user ID or client IP
    const clientId = req.user?.id || req.ip || req.socket.remoteAddress || 'unknown-client';
    const key = `${keyPrefix}:${clientId}`;
    const now = Date.now();

    const record = store.get(key);
    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    record.count++;
    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
          retryable: true,
          service: 'api-gateway',
        },
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
