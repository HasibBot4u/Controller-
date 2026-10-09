import { SessionRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { ClaudeSession } from '../../../src/domain/models/index.ts';
import { getAdminFirestore } from '../../services/firebase-admin.ts';

export class FirestoreSessionRepository implements SessionRepository {
  private getCollection(userId: string) {
    if (!userId) {
      throw new Error('UserId is required for user-scoped Firestore session repository');
    }
    return getAdminFirestore().collection('users').doc(userId).collection('sessions');
  }

  async findByActivityId(activityId: string, userId?: string): Promise<ClaudeSession | null> {
    if (!userId) return null;
    const snapshot = await this.getCollection(userId).where('activityId', '==', activityId).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as ClaudeSession;
  }

  async findById(id: string, userId?: string): Promise<ClaudeSession | null> {
    if (!userId) return null;
    const doc = await this.getCollection(userId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as ClaudeSession;
  }

  async findAll(userId?: string): Promise<ClaudeSession[]> {
    if (!userId) return [];
    const snapshot = await this.getCollection(userId).get();
    return snapshot.docs.map((doc) => doc.data() as ClaudeSession);
  }

  async create(session: Omit<ClaudeSession, 'schemaVersion'>, userId?: string): Promise<ClaudeSession> {
    const ownerId = userId || session.ownerId || 'unknown';
    const entity: ClaudeSession = {
      ...session,
      ownerId,
      schemaVersion: 1,
      createdAt: session.createdAt || new Date().toISOString(),
    };
    await this.getCollection(ownerId).doc(entity.id).set(entity);
    return entity;
  }

  async update(id: string, updates: Partial<ClaudeSession>, userId?: string): Promise<ClaudeSession | null> {
    if (!userId) return null;
    const ref = this.getCollection(userId).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return null;
    await ref.update(updates);
    const refreshed = await ref.get();
    return refreshed.data() as ClaudeSession;
  }
}
