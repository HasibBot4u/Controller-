import { Project, Activity, ActivityEvent, Checkpoint, PendingApproval, ClaudeSession } from '../models/index.ts';
import { ActivityStatus, ApprovalStatus } from '../enums/index.ts';

export interface ProjectRepository {
  findAll(userId?: string): Promise<Project[]>;
  findById(id: string, userId?: string): Promise<Project | null>;
  create(project: Omit<Project, 'schemaVersion'>, userId?: string): Promise<Project>;
  update(id: string, updates: Partial<Project>, userId?: string): Promise<Project | null>;
  delete(id: string, userId?: string): Promise<boolean>;
}

export interface ActivityRepository {
  findAll(projectId?: string, userId?: string): Promise<Activity[]>;
  findById(id: string, userId?: string): Promise<Activity | null>;
  create(activity: Omit<Activity, 'schemaVersion'>, userId?: string): Promise<Activity>;
  update(id: string, updates: Partial<Activity>, userId?: string): Promise<Activity | null>;
  updateStatus(id: string, status: ActivityStatus, userId?: string): Promise<Activity | null>;
  delete(id: string, userId?: string): Promise<boolean>;
}

export interface EventRepository {
  findByActivityId(activityId: string, userId?: string): Promise<ActivityEvent[]>;
  getEventsSince?(activityId: string, sinceSequence?: number, userId?: string): Promise<ActivityEvent[]>;
  append(event: Omit<ActivityEvent, 'schemaVersion' | 'sequence' | 'id'> & { id?: string }, userId?: string): Promise<ActivityEvent>;
  getLatestSequence(activityId: string, userId?: string): Promise<number>;
}

export interface CheckpointRepository {
  findByActivityId(activityId: string, userId?: string): Promise<Checkpoint[]>;
  findById(id: string, userId?: string): Promise<Checkpoint | null>;
  create(checkpoint: Omit<Checkpoint, 'schemaVersion'>, userId?: string): Promise<Checkpoint>;
}

export interface ApprovalRepository {
  findPending(activityId?: string, userId?: string): Promise<PendingApproval[]>;
  findById(id: string, userId?: string): Promise<PendingApproval | null>;
  create(approval: Omit<PendingApproval, 'schemaVersion'>, userId?: string): Promise<PendingApproval>;
  resolve(id: string, status: ApprovalStatus, resolvedBy: string, userId?: string): Promise<PendingApproval | null>;
  consume?(id: string, consumedBy?: string, userId?: string): Promise<PendingApproval | null>;
}

export interface SessionRepository {
  findByActivityId(activityId: string, userId?: string): Promise<ClaudeSession | null>;
  findById(id: string, userId?: string): Promise<ClaudeSession | null>;
  findAll(userId?: string): Promise<ClaudeSession[]>;
  create(session: Omit<ClaudeSession, 'schemaVersion'>, userId?: string): Promise<ClaudeSession>;
  update(id: string, updates: Partial<ClaudeSession>, userId?: string): Promise<ClaudeSession | null>;
}
