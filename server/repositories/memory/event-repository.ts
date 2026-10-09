import { EventRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { ActivityEvent } from '../../../src/domain/models/index.ts';
import { DEMO_EVENTS } from '../../adapters/mock/mock-data.ts';

export class MemoryEventRepository implements EventRepository {
  private events: ActivityEvent[] = [];
  private sequenceCounters: Map<string, number> = new Map();

  constructor(initialData: ActivityEvent[] = []) {
    this.events = initialData.map((e) => ({ ...e }));
    // Initialize sequence counters from initial data
    this.events.forEach((e) => {
      const current = this.sequenceCounters.get(e.activityId) || 0;
      if (e.sequence > current) {
        this.sequenceCounters.set(e.activityId, e.sequence);
      }
    });
  }

  async findByActivityId(activityId: string, userId?: string): Promise<ActivityEvent[]> {
    return this.events
      .filter((e) => {
        if (e.activityId !== activityId) return false;
        if (userId && e.ownerId && e.ownerId !== userId && e.ownerId !== 'phase1-demo-user') return false;
        return true;
      })
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getEventsSince(activityId: string, sinceSequence = 0, userId?: string): Promise<ActivityEvent[]> {
    return this.events
      .filter((e) => {
        if (e.activityId !== activityId || e.sequence <= sinceSequence) return false;
        if (userId && e.ownerId && e.ownerId !== userId && e.ownerId !== 'phase1-demo-user') return false;
        return true;
      })
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getLatestSequence(activityId: string, _userId?: string): Promise<number> {
    return this.sequenceCounters.get(activityId) || 0;
  }

  async append(
    event: Omit<ActivityEvent, 'schemaVersion' | 'sequence' | 'id'> & { id?: string },
    userId?: string
  ): Promise<ActivityEvent> {
    const currentSeq = this.sequenceCounters.get(event.activityId) || 0;
    const nextSeq = currentSeq + 1;
    this.sequenceCounters.set(event.activityId, nextSeq);

    const ownerId = userId || (event as any).ownerId || 'unknown';
    const newEvent: ActivityEvent = {
      schemaVersion: 1,
      id: event.id || `evt-${Date.now()}-${nextSeq}`,
      activityId: event.activityId,
      sequence: nextSeq,
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type,
      payload: event.payload || {},
      ownerId,
    };

    this.events.push(newEvent);
    return { ...newEvent };
  }
}
