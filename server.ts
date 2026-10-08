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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Basic security headers & cache control (Item 24 & 25)
  app.use(securityHeadersMiddleware);

  // JSON body parsing with clean error handling
  app.use(express.json());

  // Deterministic Request ID via crypto.randomUUID() (Item 22)
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

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  });
}
