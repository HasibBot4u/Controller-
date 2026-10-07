import { Project, Activity, ActivityEvent, Checkpoint, PendingApproval, ClaudeSession } from '../models/index.ts';
import { ActivityStatus, ApprovalStatus } from '../enums/index.ts';

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(project: Omit<Project, 'schemaVersion'>): Promise<Project>;
  update(id: string, updates: Partial<Project>): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}

export interface ActivityRepository {
  findAll(projectId?: string): Promise<Activity[]>;
  findById(id: string): Promise<Activity | null>;
  create(activity: Omit<Activity, 'schemaVersion'>): Promise<Activity>;
  update(id: string, updates: Partial<Activity>): Promise<Activity | null>;
  updateStatus(id: string, status: ActivityStatus): Promise<Activity | null>;
  delete(id: string): Promise<boolean>;
}

export interface EventRepository {
  findByActivityId(activityId: string): Promise<ActivityEvent[]>;
  append(event: Omit<ActivityEvent, 'schemaVersion' | 'sequence' | 'id'> & { id?: string }): Promise<ActivityEvent>;
  getLatestSequence(activityId: string): Promise<number>;
}

export interface CheckpointRepository {
  findByActivityId(activityId: string): Promise<Checkpoint[]>;
  findById(id: string): Promise<Checkpoint | null>;
  create(checkpoint: Omit<Checkpoint, 'schemaVersion'>): Promise<Checkpoint>;
}

export interface ApprovalRepository {
  findPending(activityId?: string): Promise<PendingApproval[]>;
  findById(id: string): Promise<PendingApproval | null>;
  create(approval: Omit<PendingApproval, 'schemaVersion'>): Promise<PendingApproval>;
  resolve(id: string, status: ApprovalStatus, resolvedBy: string): Promise<PendingApproval | null>;
}

export interface SessionRepository {
  findByActivityId(activityId: string): Promise<ClaudeSession | null>;
  findAll(): Promise<ClaudeSession[]>;
  create(session: Omit<ClaudeSession, 'schemaVersion'>): Promise<ClaudeSession>;
  update(id: string, updates: Partial<ClaudeSession>): Promise<ClaudeSession | null>;
}
