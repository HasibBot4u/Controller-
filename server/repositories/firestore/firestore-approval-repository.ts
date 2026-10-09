import crypto from 'crypto';
import { ApprovalRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { PendingApproval } from '../../../src/domain/models/index.ts';
import { ApprovalStatus } from '../../../src/domain/enums/index.ts';
import { getAdminFirestore } from '../../services/firebase-admin.ts';

export function computePayloadHash(parameters: Record<string, unknown>): string {
  const canonicalJson = JSON.stringify(parameters, Object.keys(parameters).sort());
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

export class FirestoreApprovalRepository implements ApprovalRepository {
  private getCollection(userId: string) {
    if (!userId) {
      throw new Error('UserId is required for user-scoped Firestore approval repository');
    }
    return getAdminFirestore().collection('users').doc(userId).collection('approvals');
  }

  async findPending(activityId?: string, userId?: string): Promise<PendingApproval[]> {
    if (!userId) return [];
    let query: FirebaseFirestore.Query = this.getCollection(userId).where('status', '==', ApprovalStatus.PENDING);
    if (activityId) {
      query = query.where('activityId', '==', activityId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as PendingApproval);
  }

  async findById(id: string, userId?: string): Promise<PendingApproval | null> {
    if (!userId) return null;
    const doc = await this.getCollection(userId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as PendingApproval;
  }

  async create(approval: Omit<PendingApproval, 'schemaVersion'>, userId?: string): Promise<PendingApproval> {
    const ownerId = userId || approval.requestedBy || 'unknown';
    const params = approval.parameters || {};
    const payloadHash = approval.payloadHash || computePayloadHash(params);
    const expiresAt = approval.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const entity: PendingApproval = {
      ...approval,
      requestedBy: ownerId,
      schemaVersion: 1,
      status: ApprovalStatus.PENDING,
      payloadHash,
      requestedAt: approval.requestedAt || new Date().toISOString(),
      expiresAt,
    };

    await this.getCollection(ownerId).doc(entity.id).set(entity);
    return entity;
  }

  async resolve(
    id: string,
    status: ApprovalStatus,
    resolvedBy: string,
    userId?: string
  ): Promise<PendingApproval | null> {
    if (!userId) return null;
    if (status === ApprovalStatus.PENDING) {
      throw new Error('Cannot resolve an approval back to PENDING status');
    }

    const db = getAdminFirestore();
    const ref = this.getCollection(userId).doc(id);

    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) return null;

      const existing = doc.data() as PendingApproval;
      if (existing.status !== ApprovalStatus.PENDING) {
        throw new Error(`Approval ${id} is already resolved with status ${existing.status}`);
      }

      if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
        transaction.update(ref, { status: ApprovalStatus.EXPIRED });
        throw new Error(`Approval ${id} has expired`);
      }

      const updated: Partial<PendingApproval> = {
        status,
        resolvedBy,
        resolvedAt: new Date().toISOString(),
      };

      transaction.update(ref, updated);
      return { ...existing, ...updated };
    });
  }

  async consume(id: string, consumedBy?: string, userId?: string): Promise<PendingApproval | null> {
    if (!userId) return null;
    const db = getAdminFirestore();
    const ref = this.getCollection(userId).doc(id);

    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) return null;

      const existing = doc.data() as PendingApproval;
      if (existing.status === ApprovalStatus.CONSUMED) {
        throw new Error(`Approval ${id} has already been consumed`);
      }
      if (existing.status !== ApprovalStatus.APPROVED) {
        throw new Error(`Approval ${id} cannot be consumed because its status is ${existing.status}`);
      }
      if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
        transaction.update(ref, { status: ApprovalStatus.EXPIRED });
        throw new Error(`Approval ${id} has expired`);
      }

      const updated: Partial<PendingApproval> = {
        status: ApprovalStatus.CONSUMED,
        consumedAt: new Date().toISOString(),
        consumedBy: consumedBy || 'system',
      };

      transaction.update(ref, updated);
      return { ...existing, ...updated };
    });
  }
}
