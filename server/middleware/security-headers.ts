import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers & API Cache-Control Middleware
 * Protects thin-client communication, enforces anti-framing policy, and prevents sensitive API caching.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Mobile permissions restrictions
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy & Frame Protection:
  // Allows self, Google AI Studio domains, and Cloud Run hostnames for embedded applet preview
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseio.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.run.app; " +
    "img-src 'self' data: https:; " +
    "frame-ancestors 'self' https://*.google.com https://*.run.app;"
  );

  // Strict CORS policy for API endpoints:
  // If origin is present, echo only if from permitted domains or same-origin; avoid wildcard with credentials
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Vary', 'Origin');
    if (
      origin.endsWith('.google.com') ||
      origin.endsWith('.run.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
    }
  }

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // API Cache Policy: Cache-Control: no-store for /api/v1/*
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
