import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server.ts';

describe('Server Authentication & Authorization Integration', () => {
  const app = createApp();

  it('allows public health endpoint without authentication', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.controlPlane.status).toBe('HEALTHY');
    expect(res.body.data.executionBackend.status).toBe('NOT_CONFIGURED');
  });

  it('fails closed with 401 when accessing protected endpoints without credentials in normal mode', async () => {
    const originalDemo = process.env.PHASE1_DEMO_MODE;
    delete process.env.PHASE1_DEMO_MODE;

    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    if (originalDemo !== undefined) {
      process.env.PHASE1_DEMO_MODE = originalDemo;
    }
  });

  it('rejects invalid bearer token with 401', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', 'Bearer invalid-token-12345');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
