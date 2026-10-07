import { SessionRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { ClaudeSession } from '../../../src/domain/models/index.ts';
import { DEMO_SESSIONS } from '../../adapters/mock/mock-data.ts';

export class MemorySessionRepository implements SessionRepository {
  private sessions: Map<string, ClaudeSession> = new Map();

  constructor(initialData: ClaudeSession[] = []) {
    initialData.forEach((s) => this.sessions.set(s.id, { ...s }));
  }

  async findByActivityId(activityId: string): Promise<ClaudeSession | null> {
    const found = Array.from(this.sessions.values()).find((s) => s.activityId === activityId);
    return found ? { ...found } : null;
  }

  async findById(id: string): Promise<ClaudeSession | null> {
    const s = this.sessions.get(id);
    return s ? { ...s } : null;
  }

  async findAll(): Promise<ClaudeSession[]> {
    return Array.from(this.sessions.values());
  }

  async create(session: Omit<ClaudeSession, 'schemaVersion'>): Promise<ClaudeSession> {
    const created: ClaudeSession = { ...session, schemaVersion: 1 };
    this.sessions.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<ClaudeSession>): Promise<ClaudeSession | null> {
    const existing = this.sessions.get(id);
    if (!existing) return null;
    const updated: ClaudeSession = { ...existing, ...updates };
    this.sessions.set(id, updated);
    return { ...updated };
  }
}
