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

  it('allows VIEWER to read but rejects mutating operations with 403', async () => {
    process.env.AUTH_TOKEN_VIEWER = 'test-viewer-secret';

    // Viewer read allowed
    const readRes = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', 'Bearer test-viewer-secret');
    expect(readRes.status).toBe(200);

    // Viewer mutation rejected with 403
    const mutateRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer test-viewer-secret')
      .send({ name: 'Unauthorized Project' });
    expect(mutateRes.status).toBe(403);
    expect(mutateRes.body.error.code).toBe('FORBIDDEN');

    delete process.env.AUTH_TOKEN_VIEWER;
  });

  it('allows OPERATOR to perform non-administrative mutation, but blocks OWNER-only actions with 403', async () => {
    process.env.AUTH_TOKEN_OPERATOR = 'test-operator-secret';

    // Operator mutation allowed for regular operational actions
    const mutateRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer test-operator-secret')
      .send({ name: 'Operator Project' });
    expect(mutateRes.status).toBe(201);

    // Operator blocked on OWNER-only admin actions
    const adminRes = await request(app)
      .post('/api/v1/admin/reboot')
      .set('Authorization', 'Bearer test-operator-secret');
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe('FORBIDDEN');

    delete process.env.AUTH_TOKEN_OPERATOR;
  });

  it('ignores forged client role headers and relies solely on verified server token', async () => {
    process.env.AUTH_TOKEN_VIEWER = 'test-viewer-secret';

    const forgedRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer test-viewer-secret')
      .set('x-role', 'OWNER')
      .set('x-demo-role', 'OWNER')
      .send({ name: 'Forged Project' });

    expect(forgedRes.status).toBe(403);
    expect(forgedRes.body.error.code).toBe('FORBIDDEN');

    delete process.env.AUTH_TOKEN_VIEWER;
  });

  it('allows OWNER to perform administrative actions', async () => {
    process.env.AUTH_TOKEN_OWNER = 'test-owner-secret';

    const adminRes = await request(app)
      .post('/api/v1/admin/reboot')
      .set('Authorization', 'Bearer test-owner-secret');
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.scheduled).toBe(true);

    delete process.env.AUTH_TOKEN_OWNER;
  });
});
