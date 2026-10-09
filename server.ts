import express, { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { apiV1Router } from './server/routes/api-v1-router.ts';
import { securityHeadersMiddleware } from './server/middleware/security-headers.ts';
import { authenticateRequest } from './server/middleware/auth.ts';
import { notFoundHandler, errorHandler } from './server/middleware/error-handler.ts';
import { rateLimiter } from './server/middleware/rate-limiter.ts';

dotenv.config();

// Startup validation: reject incompatible production / demo configuration
if (process.env.NODE_ENV === 'production' && process.env.PHASE1_DEMO_MODE === 'true') {
  console.error('[FATAL] Incompatible configuration: PHASE1_DEMO_MODE=true cannot be enabled in production.');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Basic security headers, CSP, and CORS policy
  app.use(securityHeadersMiddleware);

  // JSON body parsing with explicit 500kb limit (rejects payload-bloat attacks)
  app.use(express.json({ limit: '500kb' }));

  // Deterministic Request ID via crypto.randomUUID()
  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms) [${requestId}]`);
      }
    });

    next();
  });

  // Global rate limiter for API calls (300 req/min)
  app.use('/api/v1', rateLimiter({ windowMs: 60000, max: 300, keyPrefix: 'api-global' }));

  // Stricter rate limiter for sensitive mutation endpoints (60 req/min)
  app.use('/api/v1', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
      return rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'api-mutations' })(req, res, next);
    }
    next();
  });

  // Mount API v1 router with Phase 1 Authentication
  app.use('/api/v1', authenticateRequest, apiV1Router);

  // API 404 handler
  app.all('/api/v1/*', notFoundHandler);

  // Centralized Error handler (Item 23)
  app.use(errorHandler);

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite development middleware or static production serve
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Claude Cloud Control Center] Server running at http://0.0.0.0:${PORT} (Phase 1 Preview)`);
  });

  // Graceful shutdown (Item 23)
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const isTesting =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.VITEST) ||
  Boolean(process.env.TEST) ||
  Boolean(process.env.BUN_ENV === 'test') ||
  process.argv.some((arg) => arg.includes('vitest') || arg.includes('test'));

if (!isTesting) {
  startServer().catch((err) => {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  });
}
