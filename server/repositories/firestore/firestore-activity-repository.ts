import { ActivityRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Activity } from '../../../src/domain/models/index.ts';
import { ActivityStatus } from '../../../src/domain/enums/index.ts';
import { assertActivityTransition } from '../../../src/domain/state-machine/activity-state-machine.ts';
import { getAdminFirestore } from '../../services/firebase-admin.ts';

export class FirestoreActivityRepository implements ActivityRepository {
  private getCollection(userId: string) {
    if (!userId) {
      throw new Error('UserId is required for user-scoped Firestore activity repository');
    }
    return getAdminFirestore().collection('users').doc(userId).collection('activities');
  }

  async findAll(projectId?: string, userId?: string): Promise<Activity[]> {
    if (!userId) return [];
    let query: FirebaseFirestore.Query = this.getCollection(userId);
    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as Activity);
  }

  async findById(id: string, userId?: string): Promise<Activity | null> {
    if (!userId) return null;
    const doc = await this.getCollection(userId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Activity;
  }

  async create(activity: Omit<Activity, 'schemaVersion'>, userId?: string): Promise<Activity> {
    const ownerId = userId || (activity as any).ownerId || 'unknown';
    const entity: Activity = {
      ...activity,
      ownerId,
      schemaVersion: 1,
      createdAt: activity.createdAt || new Date().toISOString(),
      updatedAt: activity.updatedAt || new Date().toISOString(),
      lastEventSequence: activity.lastEventSequence || 0,
    } as Activity;
    await this.getCollection(ownerId).doc(entity.id).set(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Activity>, userId?: string): Promise<Activity | null> {
    if (!userId) return null;
    const ref = this.getCollection(userId).doc(id);
    const existingDoc = await ref.get();
    if (!existingDoc.exists) return null;

    const existing = existingDoc.data() as Activity;
    if (updates.status && updates.status !== existing.status) {
      assertActivityTransition(existing.status, updates.status);
    }

    const updatedData: Partial<Activity> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await ref.update(updatedData);
    const refreshed = await ref.get();
    return refreshed.data() as Activity;
  }

  async updateStatus(id: string, status: ActivityStatus, userId?: string): Promise<Activity | null> {
    return this.update(id, { status }, userId);
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const ref = this.getCollection(userId).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return false;
    await ref.delete();
    return true;
  }
}
