import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server.ts';
import * as firebaseAdmin from '../services/firebase-admin.ts';

describe('Multi-User Scoping & Resource Isolation Integration', () => {
  const app = createApp();
  let originalOperatorIds: string | undefined;

  beforeAll(() => {
    originalOperatorIds = process.env.OPERATOR_USER_IDS;
    process.env.OPERATOR_USER_IDS = 'user-a-principal,user-b-principal';

    // Mock Firebase Admin ID token verification to simulate two distinct principals
    const mockAuth: any = {
      verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-token-user-a') {
          return {
            uid: 'user-a-principal',
            email: 'user-a@example.com',
          };
        }
        if (token === 'valid-token-user-b') {
          return {
            uid: 'user-b-principal',
            email: 'user-b@example.com',
          };
        }
        const err: any = new Error('Invalid token');
        err.code = 'auth/argument-error';
        throw err;
      }),
    };

    vi.spyOn(firebaseAdmin, 'getAdminAuth').mockReturnValue(mockAuth);
  });

  afterAll(() => {
    if (originalOperatorIds !== undefined) {
      process.env.OPERATOR_USER_IDS = originalOperatorIds;
    } else {
      delete process.env.OPERATOR_USER_IDS;
    }
    vi.restoreAllMocks();
  });

  const authUserA = { Authorization: 'Bearer valid-token-user-a' };
  const authUserB = { Authorization: 'Bearer valid-token-user-b' };

  let projectAId: string;
  let activityAId: string;
  let approvalAId: string;

  it('allows User A to create a private project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set(authUserA)
      .send({
        name: 'Alpha Secret Workspace',
        description: 'User A private project',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    projectAId = res.body.data.id;
    expect(res.body.data.ownerId).toBe('user-a-principal');
  });

  it('prevents User B from seeing User A project in list / refresh queries', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set(authUserB);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.find((p: any) => p.id === projectAId);
    expect(found).toBeUndefined();
  });

  it('prevents User B from reading User A project by direct ID lookup', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectAId}`)
      .set(authUserB);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('prevents User B from creating an activity inside User A project (parent-child ownership check)', async () => {
    const res = await request(app)
      .post('/api/v1/activities')
      .set(authUserB)
      .send({
        projectId: projectAId,
        title: 'Intruder Activity',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('allows User A to create an activity and records ownership', async () => {
    const res = await request(app)
      .post('/api/v1/activities')
      .set(authUserA)
      .send({
        projectId: projectAId,
        title: 'Alpha Analysis Step',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    activityAId = res.body.data.id;
    expect(res.body.data.ownerId).toBe('user-a-principal');
  });

  it('prevents User B from reading User A activity', async () => {
    const res = await request(app)
      .get(`/api/v1/activities/${activityAId}`)
      .set(authUserB);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACTIVITY_NOT_FOUND');
  });

  it('prevents User B from mutating User A activity (pause, stop, continue, rewind)', async () => {
    const pauseRes = await request(app)
      .post(`/api/v1/activities/${activityAId}/pause`)
      .set(authUserB);

    expect(pauseRes.status).toBe(404);
    expect(pauseRes.body.success).toBe(false);

    const stopRes = await request(app)
      .post(`/api/v1/activities/${activityAId}/stop`)
      .set(authUserB);

    expect(stopRes.status).toBe(404);
    expect(stopRes.body.success).toBe(false);

    const rewindRes = await request(app)
      .post(`/api/v1/activities/${activityAId}/rewind`)
      .set(authUserB)
      .send({ checkpointId: 'chk-non-existent' });

    expect(rewindRes.status).toBe(404);
    expect(rewindRes.body.success).toBe(false);
  });

  it('prevents User B from reading User A event streams and checkpoints', async () => {
    const eventsRes = await request(app)
      .get(`/api/v1/activities/${activityAId}/events`)
      .set(authUserB);

    expect(eventsRes.status).toBe(404);
    expect(eventsRes.body.success).toBe(false);

    const checkRes = await request(app)
      .get(`/api/v1/activities/${activityAId}/checkpoints`)
      .set(authUserB);

    expect(checkRes.status).toBe(404);
    expect(checkRes.body.success).toBe(false);
  });

  it('prevents User B from reading or modifying User A project files', async () => {
    const listRes = await request(app)
      .get(`/api/v1/projects/${projectAId}/files`)
      .set(authUserB);

    expect(listRes.status).toBe(404);
    expect(listRes.body.success).toBe(false);

    const createRes = await request(app)
      .post(`/api/v1/projects/${projectAId}/files`)
      .set(authUserB)
      .send({ path: 'malicious.sh' });

    expect(createRes.status).toBe(404);
    expect(createRes.body.success).toBe(false);
  });

  it('allows User A to create an approval and prevents User B from approving or resolving it', async () => {
    const apprRes = await request(app)
      .post('/api/v1/approvals')
      .set(authUserA)
      .send({
        activityId: activityAId,
        projectId: projectAId,
        actionType: 'FILE_MUTATION',
        title: 'Approve Alpha Code Change',
      });

    expect(apprRes.status).toBe(201);
    expect(apprRes.body.success).toBe(true);
    approvalAId = apprRes.body.data.id;

    // User B cannot see the approval in list
    const listRes = await request(app)
      .get('/api/v1/approvals')
      .set(authUserB);
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find((a: any) => a.id === approvalAId);
    expect(found).toBeUndefined();

    // User B cannot resolve User A's approval
    const resolveRes = await request(app)
      .post(`/api/v1/approvals/${approvalAId}/resolve`)
      .set(authUserB)
      .send({ status: 'APPROVED' });

    expect(resolveRes.status).toBe(404);
    expect(resolveRes.body.success).toBe(false);
    expect(resolveRes.body.error.code).toBe('APPROVAL_NOT_FOUND');

    // User A CAN resolve their own approval
    const ownerResolveRes = await request(app)
      .post(`/api/v1/approvals/${approvalAId}/resolve`)
      .set(authUserA)
      .send({ status: 'APPROVED' });

    expect(ownerResolveRes.status).toBe(200);
    expect(ownerResolveRes.body.success).toBe(true);
    expect(ownerResolveRes.body.data.status).toBe('APPROVED');
  });
});
