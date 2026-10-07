import { ActivityRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Activity } from '../../../src/domain/models/index.ts';
import { ActivityStatus } from '../../../src/domain/enums/index.ts';
import { assertActivityTransition } from '../../../src/domain/state-machine/activity-state-machine.ts';
import { DEMO_ACTIVITIES } from '../../adapters/mock/mock-data.ts';

export class MemoryActivityRepository implements ActivityRepository {
  private activities: Map<string, Activity> = new Map();

  constructor(initialData: Activity[] = []) {
    initialData.forEach((a) => this.activities.set(a.id, { ...a }));
  }

  async findAll(projectId?: string): Promise<Activity[]> {
    const list = Array.from(this.activities.values());
    if (projectId) {
      return list.filter((a) => a.projectId === projectId);
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findById(id: string): Promise<Activity | null> {
    const act = this.activities.get(id);
    return act ? { ...act } : null;
  }

  async create(activity: Omit<Activity, 'schemaVersion'>): Promise<Activity> {
    const created: Activity = { ...activity, schemaVersion: 1 };
    this.activities.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<Activity>): Promise<Activity | null> {
    const existing = this.activities.get(id);
    if (!existing) return null;

    if (updates.status && updates.status !== existing.status) {
      assertActivityTransition(existing.status, updates.status);
    }

    const updated: Activity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.activities.set(id, updated);
    return { ...updated };
  }

  async updateStatus(id: string, status: ActivityStatus): Promise<Activity | null> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<boolean> {
    return this.activities.delete(id);
  }
}
