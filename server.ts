import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiV1Router } from './server/routes/api-v1-router.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON parsing and structured logging
  app.use(express.json());

  // Observability & Request Tracing middleware
  app.use((req, res, next) => {
    const requestId = `req-${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms) [${requestId}]`);
      }
    });
    next();
  });

  // Mount API v1 router
  app.use('/api/v1', apiV1Router);

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Claude Cloud Control Center] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
