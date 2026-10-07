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

  async findByActivityId(activityId: string): Promise<ActivityEvent[]> {
    return this.events
      .filter((e) => e.activityId === activityId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getEventsSince(activityId: string, sinceSequence = 0): Promise<ActivityEvent[]> {
    return this.events
      .filter((e) => e.activityId === activityId && e.sequence > sinceSequence)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getLatestSequence(activityId: string): Promise<number> {
    return this.sequenceCounters.get(activityId) || 0;
  }

  async append(
    event: Omit<ActivityEvent, 'schemaVersion' | 'sequence' | 'id'> & { id?: string }
  ): Promise<ActivityEvent> {
    const currentSeq = this.sequenceCounters.get(event.activityId) || 0;
    const nextSeq = currentSeq + 1;
    this.sequenceCounters.set(event.activityId, nextSeq);

    const newEvent: ActivityEvent = {
      schemaVersion: 1,
      id: event.id || `evt-${Date.now()}-${nextSeq}`,
      activityId: event.activityId,
      sequence: nextSeq,
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type,
      payload: event.payload || {},
    };

    this.events.push(newEvent);
    return { ...newEvent };
  }
}
