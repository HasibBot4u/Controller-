import { ApprovalRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { PendingApproval } from '../../../src/domain/models/index.ts';
import { ApprovalStatus } from '../../../src/domain/enums/index.ts';
import { DEMO_APPROVALS } from '../../adapters/mock/mock-data.ts';

export class MemoryApprovalRepository implements ApprovalRepository {
  private approvals: Map<string, PendingApproval> = new Map();

  constructor(initialData: PendingApproval[] = []) {
    initialData.forEach((a) => this.approvals.set(a.id, { ...a }));
  }

  async findAll(activityId?: string): Promise<PendingApproval[]> {
    const list = Array.from(this.approvals.values());
    if (activityId) {
      return list.filter((a) => a.activityId === activityId);
    }
    return list;
  }

  async findPending(activityId?: string): Promise<PendingApproval[]> {
    const list = Array.from(this.approvals.values()).filter(
      (a) => a.status === ApprovalStatus.PENDING
    );
    if (activityId) {
      return list.filter((a) => a.activityId === activityId);
    }
    return list;
  }

  async findById(id: string): Promise<PendingApproval | null> {
    const a = this.approvals.get(id);
    return a ? { ...a } : null;
  }

  async create(approval: Omit<PendingApproval, 'schemaVersion'>): Promise<PendingApproval> {
    const created: PendingApproval = { ...approval, schemaVersion: 1 };
    this.approvals.set(created.id, created);
    return { ...created };
  }

  async resolve(
    id: string,
    status: ApprovalStatus,
    resolvedBy: string
  ): Promise<PendingApproval | null> {
    const existing = this.approvals.get(id);
    if (!existing) return null;
    if (existing.status !== ApprovalStatus.PENDING) return null;
    if (status !== ApprovalStatus.APPROVED && status !== ApprovalStatus.REJECTED) return null;
    const resolved: PendingApproval = {
      ...existing,
      status,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };
    this.approvals.set(id, resolved);
    return { ...resolved };
  }

  async consume(id: string): Promise<PendingApproval | null> {
    const existing = this.approvals.get(id);
    if (!existing || existing.status !== ApprovalStatus.APPROVED) return null;
    const consumed: PendingApproval = {
      ...existing,
      status: ApprovalStatus.CONSUMED,
      consumedAt: new Date().toISOString(),
    };
    this.approvals.set(id, consumed);
    return { ...consumed };
  }
}
