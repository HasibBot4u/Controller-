import { CheckpointRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Checkpoint } from '../../../src/domain/models/index.ts';
import { DEMO_CHECKPOINTS } from '../../adapters/mock/mock-data.ts';

export class MemoryCheckpointRepository implements CheckpointRepository {
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(initialData: Checkpoint[] = DEMO_CHECKPOINTS) {
    initialData.forEach((c) => this.checkpoints.set(c.id, { ...c }));
  }

  async findByActivityId(activityId: string): Promise<Checkpoint[]> {
    return Array.from(this.checkpoints.values()).filter((c) => c.activityId === activityId);
  }

  async findById(id: string): Promise<Checkpoint | null> {
    const c = this.checkpoints.get(id);
    return c ? { ...c } : null;
  }

  async create(checkpoint: Omit<Checkpoint, 'schemaVersion'>): Promise<Checkpoint> {
    const created: Checkpoint = { ...checkpoint, schemaVersion: 1 };
    this.checkpoints.set(created.id, created);
    return { ...created };
  }
}
