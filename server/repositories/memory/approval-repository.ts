import crypto from 'crypto';
import { ApprovalRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { PendingApproval } from '../../../src/domain/models/index.ts';
import { ApprovalStatus } from '../../../src/domain/enums/index.ts';

export function computePayloadHash(parameters: Record<string, unknown>): string {
  const canonicalJson = JSON.stringify(parameters, Object.keys(parameters).sort());
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

export class MemoryApprovalRepository implements ApprovalRepository {
  private approvals: Map<string, PendingApproval> = new Map();

  constructor(initialData: PendingApproval[] = []) {
    initialData.forEach((a) => this.approvals.set(a.id, { ...a }));
  }

  async findAll(activityId?: string, userId?: string): Promise<PendingApproval[]> {
    let list = Array.from(this.approvals.values());
    if (userId) {
      list = list.filter((a) => !a.requestedBy || a.requestedBy === userId || a.requestedBy === 'phase1-demo-user');
    }
    if (activityId) {
      list = list.filter((a) => a.activityId === activityId);
    }
    return list;
  }

  async findPending(activityId?: string, userId?: string): Promise<PendingApproval[]> {
    let list = Array.from(this.approvals.values()).filter(
      (a) => a.status === ApprovalStatus.PENDING
    );
    if (userId) {
      list = list.filter((a) => !a.requestedBy || a.requestedBy === userId || a.requestedBy === 'phase1-demo-user');
    }
    if (activityId) {
      list = list.filter((a) => a.activityId === activityId);
    }
    return list;
  }

  async findById(id: string, userId?: string): Promise<PendingApproval | null> {
    const a = this.approvals.get(id);
    if (!a) return null;
    if (userId && a.requestedBy && a.requestedBy !== userId && a.requestedBy !== 'phase1-demo-user') {
      return null;
    }
    return { ...a };
  }

  async create(approval: Omit<PendingApproval, 'schemaVersion'>, userId?: string): Promise<PendingApproval> {
    const ownerId = userId || approval.requestedBy || 'unknown';
    const params = approval.parameters || {};
    const payloadHash = approval.payloadHash || computePayloadHash(params);
    const expiresAt = approval.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const created: PendingApproval = {
      ...approval,
      requestedBy: ownerId,
      schemaVersion: 1,
      status: ApprovalStatus.PENDING,
      payloadHash,
      requestedAt: approval.requestedAt || new Date().toISOString(),
      expiresAt,
    };
    this.approvals.set(created.id, created);
    return { ...created };
  }

  async resolve(
    id: string,
    status: ApprovalStatus,
    resolvedBy: string,
    userId?: string
  ): Promise<PendingApproval | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    if (status === ApprovalStatus.PENDING) {
      const err: any = new Error('Cannot resolve approval with PENDING status');
      err.code = 'INVALID_STATUS';
      throw err;
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      const err: any = new Error(`Approval ${id} is already resolved with status ${existing.status}`);
      err.code = 'APPROVAL_ALREADY_RESOLVED';
      throw err;
    }

    if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
      existing.status = ApprovalStatus.EXPIRED;
      this.approvals.set(id, existing);
      const err: any = new Error(`Approval ${id} has expired`);
      err.code = 'APPROVAL_EXPIRED';
      throw err;
    }

    const resolved: PendingApproval = {
      ...existing,
      status,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };
    this.approvals.set(id, resolved);
    return { ...resolved };
  }

  async consume(id: string, consumedBy?: string, userId?: string): Promise<PendingApproval | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    if (existing.status === ApprovalStatus.CONSUMED) {
      const err: any = new Error(`Approval ${id} has already been consumed`);
      err.code = 'APPROVAL_ALREADY_CONSUMED';
      throw err;
    }

    if (existing.status !== ApprovalStatus.APPROVED) {
      const err: any = new Error(`Approval ${id} cannot be consumed because its status is ${existing.status}`);
      err.code = 'APPROVAL_NOT_APPROVED';
      throw err;
    }

    if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
      existing.status = ApprovalStatus.EXPIRED;
      this.approvals.set(id, existing);
      const err: any = new Error(`Approval ${id} has expired`);
      err.code = 'APPROVAL_EXPIRED';
      throw err;
    }

    const consumed: PendingApproval = {
      ...existing,
      status: ApprovalStatus.CONSUMED,
      consumedAt: new Date().toISOString(),
      consumedBy: consumedBy || 'system',
    };
    this.approvals.set(id, consumed);
    return { ...consumed };
  }
}
