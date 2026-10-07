import {
  DashboardState,
  Project,
  Activity,
  ActivityEvent,
  ClaudeSession,
  FileItem,
  TerminalSession,
  TerminalOutput,
  McpServerItem,
  ModelProfile,
  TaskRoutingPolicy,
  BackupStatus,
  GitHubRepoStatus,
  BackgroundJob,
  PendingApproval,
  Checkpoint,
  SystemServiceStatus,
  ServerResourceSummary
} from '../models/index.ts';
import { ActivityStatus, ApprovalStatus, RiskLevel } from '../enums/index.ts';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  requestId: string;
  timestamp: string;
  durationMs?: number;
}

export interface HealthApi {
  getHealth(): Promise<ApiResponse<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
    version: string;
    uptime: number;
    services: SystemServiceStatus[];
  }>>;
}

export interface DashboardApi {
  getDashboardState(): Promise<ApiResponse<DashboardState>>;
}

export interface ProjectsApi {
  getProjects(): Promise<ApiResponse<Project[]>>;
  getProject(id: string): Promise<ApiResponse<Project>>;
  createProject(data: { name: string; description: string; repository: string }): Promise<ApiResponse<Project>>;
}

export interface ActivitiesApi {
  getActivities(projectId?: string): Promise<ApiResponse<Activity[]>>;
  getActivity(id: string): Promise<ApiResponse<Activity>>;
  createActivity(data: {
    projectId: string;
    title: string;
    description: string;
    model: string;
    provider: string;
  }): Promise<ApiResponse<Activity>>;
  continueActivity(id: string, prompt?: string): Promise<ApiResponse<Activity>>;
  pauseActivity(id: string): Promise<ApiResponse<Activity>>;
  stopActivity(id: string): Promise<ApiResponse<Activity>>;
  retryActivity(id: string): Promise<ApiResponse<Activity>>;
  resumeActivity(id: string): Promise<ApiResponse<Activity>>;
  forkActivity(id: string): Promise<ApiResponse<Activity>>;
  rewindActivity(id: string, checkpointId: string): Promise<ApiResponse<Activity>>;
  resolveApproval(id: string, status: ApprovalStatus): Promise<ApiResponse<PendingApproval>>;
}

export interface SessionsApi {
  getSessions(): Promise<ApiResponse<ClaudeSession[]>>;
  getSession(id: string): Promise<ApiResponse<ClaudeSession>>;
  sendPrompt(sessionId: string, prompt: string, options?: { planMode?: boolean }): Promise<ApiResponse<{ ack: boolean; promptEventId: string }>>;
}

export interface EventsApi {
  getActivityEvents(activityId: string, sinceSequence?: number): Promise<ApiResponse<ActivityEvent[]>>;
  getCheckpoints(activityId: string): Promise<ApiResponse<Checkpoint[]>>;
}

export interface FilesApi {
  getFiles(projectId: string, directoryPath?: string): Promise<ApiResponse<FileItem[]>>;
  getFileContent(projectId: string, filePath: string): Promise<ApiResponse<FileItem>>;
  saveFileContent(projectId: string, filePath: string, content: string): Promise<ApiResponse<{ success: boolean; path: string; isModified: boolean }>>;
  createFile(projectId: string, filePath: string, isDirectory: boolean): Promise<ApiResponse<FileItem>>;
  renameFile(projectId: string, oldPath: string, newPath: string): Promise<ApiResponse<{ success: boolean; newPath: string }>>;
  deleteFile(projectId: string, filePath: string): Promise<ApiResponse<{ success: boolean }>>;
}

export interface TerminalApi {
  createSession(options?: { cols?: number; rows?: number; cwd?: string }): Promise<ApiResponse<TerminalSession>>;
  sendInput(sessionId: string, input: string): Promise<ApiResponse<{ acknowledged: boolean }>>;
  getOutput(sessionId: string, sinceSequence?: number): Promise<ApiResponse<TerminalOutput[]>>;
  resize(sessionId: string, cols: number, rows: number): Promise<ApiResponse<{ cols: number; rows: number }>>;
  reconnect(sessionId: string): Promise<ApiResponse<TerminalSession>>;
  closeSession(sessionId: string): Promise<ApiResponse<{ closed: boolean }>>;
}

export interface GitHubApi {
  getStatus(): Promise<ApiResponse<GitHubRepoStatus>>;
  syncRepository(): Promise<ApiResponse<{ synced: boolean; latestCommitSha: string }>>;
}

export interface McpApi {
  getServers(): Promise<ApiResponse<McpServerItem[]>>;
  toggleServer(id: string, enabled: boolean): Promise<ApiResponse<McpServerItem>>;
  restartServer(id: string): Promise<ApiResponse<McpServerItem>>;
  addServer(server: Partial<McpServerItem>): Promise<ApiResponse<McpServerItem>>;
}

export interface ModelsApi {
  getProfiles(): Promise<ApiResponse<ModelProfile[]>>;
  getRoutingPolicies(): Promise<ApiResponse<TaskRoutingPolicy[]>>;
  updateRoutingPolicy(id: string, policy: Partial<TaskRoutingPolicy>): Promise<ApiResponse<TaskRoutingPolicy>>;
}

export interface JobsApi {
  getJobs(): Promise<ApiResponse<BackgroundJob[]>>;
  triggerJob(type: string, title: string): Promise<ApiResponse<BackgroundJob>>;
  cancelJob(id: string): Promise<ApiResponse<{ cancelled: boolean }>>;
}

export interface MonitoringApi {
  getMetrics(): Promise<ApiResponse<{
    resources: ServerResourceSummary;
    services: SystemServiceStatus[];
  }>>;
}

export interface BackupApi {
  getStatus(): Promise<ApiResponse<BackupStatus>>;
  triggerBackup(): Promise<ApiResponse<{ jobId: string; status: string }>>;
  verifyBackup(): Promise<ApiResponse<{ verified: boolean; message: string }>>;
  testRestore(): Promise<ApiResponse<{ restored: boolean; message: string }>>;
}

export interface ApprovalsApi {
  getApprovals(activityId?: string): Promise<ApiResponse<PendingApproval[]>>;
  getApproval(id: string): Promise<ApiResponse<PendingApproval>>;
  createApproval(approval: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>): Promise<ApiResponse<PendingApproval>>;
  resolveApproval(id: string, status: ApprovalStatus): Promise<ApiResponse<PendingApproval>>;
}

export interface AdminApi {
  rebootServer(riskLevel: RiskLevel): Promise<ApiResponse<{ scheduled: boolean; message: string }>>;
  restartService(serviceName: string): Promise<ApiResponse<{ restarted: boolean }>>;
  runDiagnostic(): Promise<ApiResponse<{ status: 'HEALTHY' | 'DEGRADED'; reports: string[] }>>;
}
