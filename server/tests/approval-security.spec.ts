import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server.ts';
import { ApprovalStatus, RiskLevel } from '../../src/domain/enums/index.ts';

describe('Server-Authoritative Approval Security Gate', () => {
  const app = createApp();
  const operatorToken = 'operator-test-token';

  beforeEach(() => {
    process.env.AUTH_TOKEN_OPERATOR = operatorToken;
  });

  it('rejects attempt to resolve approval with PENDING status', async () => {
    // 1. Create a project and activity
    const pRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Approval Gate Project' });
    const projId = pRes.body.data.id;

    const aRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ projectId: projId, title: 'Approval Test Activity' });
    const actId = aRes.body.data.id;

    // 2. Create approval
    const apprRes = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        activityId: actId,
        projectId: projId,
        actionType: 'FILE_DELETE',
        title: 'Delete secret config',
      });
    expect(apprRes.status).toBe(201);
    const apprId = apprRes.body.data.id;

    // 3. Attempt to resolve with status PENDING -> MUST FAIL
    const res = await request(app)
      .post(`/api/v1/approvals/${apprId}/resolve`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'PENDING' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('rejects resolving an APPROVED approval twice (prevents double resolution)', async () => {
    const pRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Proj Double Resolve' });
    const projId = pRes.body.data.id;

    const apprRes = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        projectId: projId,
        actionType: 'FILE_WRITE',
        title: 'Approve file write',
      });
    const apprId = apprRes.body.data.id;

    // First resolve -> APPROVED succeeds
    const res1 = await request(app)
      .post(`/api/v1/approvals/${apprId}/resolve`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: ApprovalStatus.APPROVED });
    expect(res1.status).toBe(200);

    // Second resolve -> MUST FAIL with 409
    const res2 = await request(app)
      .post(`/api/v1/approvals/${apprId}/resolve`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: ApprovalStatus.APPROVED });
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('APPROVAL_ALREADY_RESOLVED');
  });

  it('rejects resolving a REJECTED approval twice', async () => {
    const pRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Proj Double Reject' });
    const projId = pRes.body.data.id;

    const apprRes = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        projectId: projId,
        actionType: 'FILE_DELETE',
        title: 'Approve dangerous delete',
      });
    const apprId = apprRes.body.data.id;

    // First resolve -> REJECTED succeeds
    const res1 = await request(app)
      .post(`/api/v1/approvals/${apprId}/resolve`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: ApprovalStatus.REJECTED });
    expect(res1.status).toBe(200);

    // Second resolve -> MUST FAIL with 409
    const res2 = await request(app)
      .post(`/api/v1/approvals/${apprId}/resolve`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: ApprovalStatus.REJECTED });
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('APPROVAL_ALREADY_RESOLVED');
  });

  it('enforces server-side authoritative risk level and rejects forged client riskLevel', async () => {
    const pRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Proj Risk Test' });
    const projId = pRes.body.data.id;

    // Client attempts to pass riskLevel: SAFE for FILE_DELETE (which is defined as STRONG_CONFIRM)
    const res = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        projectId: projId,
        actionType: 'FILE_DELETE',
        riskLevel: 'SAFE', // Forged by client!
        title: 'Delete everything safely',
      });

    expect(res.status).toBe(201);
    // Server MUST have overridden the forged client riskLevel with STRONG_CONFIRM
    expect(res.body.data.riskLevel).toBe(RiskLevel.STRONG_CONFIRM);
  });

  it('rejects fake activityId and cross-resource mismatch on approval creation', async () => {
    const pRes1 = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Proj 1' });
    const proj1 = pRes1.body.data.id;

    const pRes2 = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Proj 2' });
    const proj2 = pRes2.body.data.id;

    const aRes = await request(app)
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ projectId: proj1, title: 'Activity under Proj 1' });
    const actId = aRes.body.data.id;

    // 1. Non-existent activity
    const fakeActRes = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        activityId: 'non-existent-act-999',
        actionType: 'FILE_WRITE',
        title: 'Approval for non-existent activity',
      });
    expect(fakeActRes.status).toBe(404);
    expect(fakeActRes.body.error.code).toBe('ACTIVITY_NOT_FOUND');

    // 2. Cross-resource mismatch: activity belongs to proj1, but approval specifies proj2
    const mismatchRes = await request(app)
      .post('/api/v1/approvals')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        activityId: actId,
        projectId: proj2,
        actionType: 'FILE_WRITE',
        title: 'Cross resource approval',
      });
    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.error.code).toBe('CROSS_RESOURCE_MISMATCH');
  });
});
