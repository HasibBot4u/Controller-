import { ActivityRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Activity } from '../../../src/domain/models/index.ts';
import { ActivityStatus } from '../../../src/domain/enums/index.ts';
import { assertActivityTransition } from '../../../src/domain/state-machine/activity-state-machine.ts';

export class MemoryActivityRepository implements ActivityRepository {
  private activities: Map<string, Activity> = new Map();

  constructor(initialData: Activity[] = []) {
    initialData.forEach((a) => this.activities.set(a.id, { ...a }));
  }

  async findAll(projectId?: string, userId?: string): Promise<Activity[]> {
    let list = Array.from(this.activities.values());
    if (userId) {
      list = list.filter((a) => !a.ownerId || a.ownerId === userId || a.ownerId === 'phase1-demo-user');
    }
    if (projectId) {
      list = list.filter((a) => a.projectId === projectId);
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findById(id: string, userId?: string): Promise<Activity | null> {
    const act = this.activities.get(id);
    if (!act) return null;
    if (userId && act.ownerId && act.ownerId !== userId && act.ownerId !== 'phase1-demo-user') {
      return null;
    }
    return { ...act };
  }

  async create(activity: Omit<Activity, 'schemaVersion'>, userId?: string): Promise<Activity> {
    const ownerId = userId || activity.ownerId || 'unknown';
    const created: Activity = { ...activity, ownerId, schemaVersion: 1 };
    this.activities.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<Activity>, userId?: string): Promise<Activity | null> {
    const existing = await this.findById(id, userId);
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

  async updateStatus(id: string, status: ActivityStatus, userId?: string): Promise<Activity | null> {
    return this.update(id, { status }, userId);
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    const existing = await this.findById(id, userId);
    if (!existing) return false;
    return this.activities.delete(id);
  }
}
