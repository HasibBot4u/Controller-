import {
  ProjectRepository,
  ActivityRepository,
  EventRepository,
  CheckpointRepository,
  ApprovalRepository,
  SessionRepository
} from '../../domain/contracts/repository-contracts.ts';
import {
  Project,
  Activity,
  ActivityEvent,
  Checkpoint,
  PendingApproval,
  ClaudeSession
} from '../../domain/models/index.ts';
import { ActivityStatus, ApprovalStatus } from '../../domain/enums/index.ts';
import {
  INITIAL_PROJECTS,
  INITIAL_ACTIVITIES,
  INITIAL_EVENTS,
  INITIAL_CHECKPOINTS,
  INITIAL_APPROVALS,
  INITIAL_SESSIONS
} from './mock-data.ts';

export class InMemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  constructor(initialData: Project[] = INITIAL_PROJECTS) {
    initialData.forEach((p) => this.projects.set(p.id, { ...p }));
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.get(id) ? { ...this.projects.get(id)! } : null;
  }

  async create(project: Omit<Project, 'schemaVersion'>): Promise<Project> {
    const created: Project = { ...project, schemaVersion: 1 };
    this.projects.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const existing = this.projects.get(id);
    if (!existing) return null;
    const updated: Project = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

export class InMemoryActivityRepository implements ActivityRepository {
  private activities: Map<string, Activity> = new Map();

  constructor(initialData: Activity[] = INITIAL_ACTIVITIES) {
    initialData.forEach((a) => this.activities.set(a.id, { ...a }));
  }

  async findAll(projectId?: string): Promise<Activity[]> {
    const all = Array.from(this.activities.values());
    if (projectId) {
      return all.filter((a) => a.projectId === projectId);
    }
    return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
    const updated: Activity = { ...existing, ...updates, updatedAt: new Date().toISOString() };
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

export class InMemoryEventRepository implements EventRepository {
  private events: ActivityEvent[] = [];

  constructor(initialData: ActivityEvent[] = INITIAL_EVENTS) {
    this.events = initialData.map((e) => ({ ...e }));
  }

  async findByActivityId(activityId: string): Promise<ActivityEvent[]> {
    return this.events
      .filter((e) => e.activityId === activityId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async append(event: Omit<ActivityEvent, 'schemaVersion' | 'sequence' | 'id'> & { id?: string }): Promise<ActivityEvent> {
    const latestSeq = await this.getLatestSequence(event.activityId);
    const newEvent: ActivityEvent = {
      id: event.id || `evt-${Date.now()}-${latestSeq + 1}`,
      ...event,
      schemaVersion: 1,
      sequence: latestSeq + 1,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    this.events.push(newEvent);
    return { ...newEvent };
  }

  async getLatestSequence(activityId: string): Promise<number> {
    const matching = this.events.filter((e) => e.activityId === activityId);
    if (matching.length === 0) return 0;
    return Math.max(...matching.map((e) => e.sequence));
  }
}

export class InMemoryCheckpointRepository implements CheckpointRepository {
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(initialData: Checkpoint[] = INITIAL_CHECKPOINTS) {
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

export class InMemoryApprovalRepository implements ApprovalRepository {
  private approvals: Map<string, PendingApproval> = new Map();

  constructor(initialData: PendingApproval[] = INITIAL_APPROVALS) {
    initialData.forEach((a) => this.approvals.set(a.id, { ...a }));
  }

  async findPending(activityId?: string): Promise<PendingApproval[]> {
    const list = Array.from(this.approvals.values()).filter((a) => a.status === ApprovalStatus.PENDING);
    if (activityId) {
      return list.filter((a) => a.activityId === activityId);
    }
    return list;
  }

  async findById(id: string): Promise<PendingApproval | null> {
    const a = this.approvals.get(id);
    return a ? { ...a } : null;
  }

  async create(approval: Omit<PendingApproval, 'schemaVersion'>): Promise<PendingApproval> {
    const created: PendingApproval = { ...approval, schemaVersion: 1 };
    this.approvals.set(created.id, created);
    return { ...created };
  }

  async resolve(id: string, status: ApprovalStatus, resolvedBy: string): Promise<PendingApproval | null> {
    const existing = this.approvals.get(id);
    if (!existing) return null;
    const resolved: PendingApproval = {
      ...existing,
      status,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    };
    this.approvals.set(id, resolved);
    return { ...resolved };
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private sessions: Map<string, ClaudeSession> = new Map();

  constructor(initialData: ClaudeSession[] = INITIAL_SESSIONS) {
    initialData.forEach((s) => this.sessions.set(s.id, { ...s }));
  }

  async findByActivityId(activityId: string): Promise<ClaudeSession | null> {
    const found = Array.from(this.sessions.values()).find((s) => s.activityId === activityId);
    return found ? { ...found } : null;
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
