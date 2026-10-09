import crypto from 'crypto';
import { EventRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { ActivityEvent, Activity } from '../../../src/domain/models/index.ts';
import { getAdminFirestore } from '../../services/firebase-admin.ts';

export class FirestoreEventRepository implements EventRepository {
  private getActivitiesCollection(userId: string) {
    return getAdminFirestore().collection('users').doc(userId).collection('activities');
  }

  async findByActivityId(activityId: string, userId?: string): Promise<ActivityEvent[]> {
    if (!userId) return [];
    const eventsRef = this.getActivitiesCollection(userId).doc(activityId).collection('events');
    const snapshot = await eventsRef.orderBy('sequence', 'asc').get();
    return snapshot.docs.map((doc) => doc.data() as ActivityEvent);
  }

  async getEventsSince(activityId: string, sinceSequence = 0, userId?: string): Promise<ActivityEvent[]> {
    if (!userId) return [];
    const eventsRef = this.getActivitiesCollection(userId).doc(activityId).collection('events');
    const snapshot = await eventsRef.where('sequence', '>', sinceSequence).orderBy('sequence', 'asc').get();
    return snapshot.docs.map((doc) => doc.data() as ActivityEvent);
  }

  async getLatestSequence(activityId: string, userId?: string): Promise<number> {
    if (!userId) return 0;
    const actDoc = await this.getActivitiesCollection(userId).doc(activityId).get();
    if (!actDoc.exists) return 0;
    const data = actDoc.data() as Activity;
    return data.lastEventSequence || 0;
  }

  async append(
    event: Omit<ActivityEvent, 'schemaVersion' | 'sequence' | 'id'> & { id?: string },
    userId?: string
  ): Promise<ActivityEvent> {
    if (!userId) {
      throw new Error('UserId is required for user-scoped event append');
    }

    const db = getAdminFirestore();
    const actRef = this.getActivitiesCollection(userId).doc(event.activityId);

    return await db.runTransaction(async (transaction) => {
      const actDoc = await transaction.get(actRef);
      if (!actDoc.exists) {
        throw new Error(`Parent activity ${event.activityId} not found in scope for user ${userId}`);
      }

      const actData = actDoc.data() as Activity;
      const currentSeq = actData.lastEventSequence || 0;
      const nextSequence = currentSeq + 1;
      const eventId = event.id || `evt-${crypto.randomUUID()}`;

      const createdEvent: ActivityEvent = {
        ...event,
        id: eventId,
        sequence: nextSequence,
        schemaVersion: 1,
        timestamp: event.timestamp || new Date().toISOString(),
      };

      const eventRef = actRef.collection('events').doc(eventId);
      transaction.set(eventRef, createdEvent);
      transaction.update(actRef, {
        lastEventSequence: nextSequence,
        updatedAt: new Date().toISOString(),
      });

      return createdEvent;
    });
  }
}
