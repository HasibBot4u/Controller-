import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers & API Cache-Control Middleware
 * Protects thin-client communication and prevents API caching.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Basic mobile security restrictions
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // API Cache Policy (Item 25): Cache-Control: no-store for /api/v1/*
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
