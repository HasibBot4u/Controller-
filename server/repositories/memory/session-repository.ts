import { SessionRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { ClaudeSession } from '../../../src/domain/models/index.ts';
import { DEMO_SESSIONS } from '../../adapters/mock/mock-data.ts';

export class MemorySessionRepository implements SessionRepository {
  private sessions: Map<string, ClaudeSession> = new Map();

  constructor(initialData: ClaudeSession[] = []) {
    initialData.forEach((s) => this.sessions.set(s.id, { ...s }));
  }

  async findByActivityId(activityId: string, userId?: string): Promise<ClaudeSession | null> {
    const found = Array.from(this.sessions.values()).find((s) => {
      if (s.activityId !== activityId) return false;
      if (userId && s.ownerId && s.ownerId !== userId && s.ownerId !== 'phase1-demo-user') return false;
      return true;
    });
    return found ? { ...found } : null;
  }

  async findById(id: string, userId?: string): Promise<ClaudeSession | null> {
    const s = this.sessions.get(id);
    if (!s) return null;
    if (userId && s.ownerId && s.ownerId !== userId && s.ownerId !== 'phase1-demo-user') return null;
    return { ...s };
  }

  async findAll(userId?: string): Promise<ClaudeSession[]> {
    let list = Array.from(this.sessions.values());
    if (userId) {
      list = list.filter((s) => !s.ownerId || s.ownerId === userId || s.ownerId === 'phase1-demo-user');
    }
    return list;
  }

  async create(session: Omit<ClaudeSession, 'schemaVersion'>, userId?: string): Promise<ClaudeSession> {
    const ownerId = userId || session.ownerId || 'unknown';
    const created: ClaudeSession = { ...session, ownerId, schemaVersion: 1 };
    this.sessions.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<ClaudeSession>, userId?: string): Promise<ClaudeSession | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;
    const updated: ClaudeSession = { ...existing, ...updates };
    this.sessions.set(id, updated);
    return { ...updated };
  }
}
