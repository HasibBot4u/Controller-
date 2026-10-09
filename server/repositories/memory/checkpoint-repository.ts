import { CheckpointRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Checkpoint } from '../../../src/domain/models/index.ts';
import { DEMO_CHECKPOINTS } from '../../adapters/mock/mock-data.ts';

export class MemoryCheckpointRepository implements CheckpointRepository {
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(initialData: Checkpoint[] = []) {
    initialData.forEach((c) => this.checkpoints.set(c.id, { ...c }));
  }

  async findByActivityId(activityId: string, userId?: string): Promise<Checkpoint[]> {
    return Array.from(this.checkpoints.values()).filter((c) => {
      if (c.activityId !== activityId) return false;
      if (userId && c.ownerId && c.ownerId !== userId && c.ownerId !== 'phase1-demo-user') return false;
      return true;
    });
  }

  async findById(id: string, userId?: string): Promise<Checkpoint | null> {
    const c = this.checkpoints.get(id);
    if (!c) return null;
    if (userId && c.ownerId && c.ownerId !== userId && c.ownerId !== 'phase1-demo-user') return null;
    return { ...c };
  }

  async create(checkpoint: Omit<Checkpoint, 'schemaVersion'>, userId?: string): Promise<Checkpoint> {
    const ownerId = userId || checkpoint.ownerId || 'unknown';
    const created: Checkpoint = { ...checkpoint, ownerId, schemaVersion: 1 };
    this.checkpoints.set(created.id, created);
    return { ...created };
  }
}
