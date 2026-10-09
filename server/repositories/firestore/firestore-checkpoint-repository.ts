import { CheckpointRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Checkpoint } from '../../../src/domain/models/index.ts';
import { getAdminFirestore } from '../../services/firebase-admin.ts';

export class FirestoreCheckpointRepository implements CheckpointRepository {
  private getCollection(userId: string) {
    if (!userId) {
      throw new Error('UserId is required for user-scoped Firestore checkpoint repository');
    }
    return getAdminFirestore().collection('users').doc(userId).collection('checkpoints');
  }

  async findByActivityId(activityId: string, userId?: string): Promise<Checkpoint[]> {
    if (!userId) return [];
    const snapshot = await this.getCollection(userId).where('activityId', '==', activityId).get();
    return snapshot.docs.map((doc) => doc.data() as Checkpoint);
  }

  async findById(id: string, userId?: string): Promise<Checkpoint | null> {
    if (!userId) return null;
    const doc = await this.getCollection(userId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Checkpoint;
  }

  async create(checkpoint: Omit<Checkpoint, 'schemaVersion'>, userId?: string): Promise<Checkpoint> {
    const ownerId = userId || checkpoint.ownerId || 'unknown';
    const entity: Checkpoint = {
      ...checkpoint,
      ownerId,
      schemaVersion: 1,
      createdAt: checkpoint.createdAt || new Date().toISOString(),
    };
    await this.getCollection(ownerId).doc(entity.id).set(entity);
    return entity;
  }
}
