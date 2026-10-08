import {
  HealthApi,
  DashboardApi,
  ProjectsApi,
  ActivitiesApi,
  SessionsApi,
  EventsApi,
  FilesApi,
  TerminalApi,
  GitHubApi,
  McpApi,
  ModelsApi,
  JobsApi,
  MonitoringApi,
  BackupApi,
  AdminApi,
  ApprovalsApi,
  ApiResponse
} from '../../domain/contracts/api-contracts.ts';
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
  ServerResourceSummary,
  HealthStatusResponse,
} from '../../domain/models/index.ts';
import { ActivityStatus, ApprovalStatus, RiskLevel, HealthStatus, EventType } from '../../domain/enums/index.ts';
import {
  InMemoryProjectRepository,
  InMemoryActivityRepository,
  InMemoryEventRepository,
  InMemoryCheckpointRepository,
  InMemoryApprovalRepository,
  InMemorySessionRepository
} from './mock-repositories.ts';
import {
  INITIAL_DASHBOARD_STATE,
  INITIAL_FILE_ITEMS,
  INITIAL_MCP_SERVERS,
  INITIAL_MODEL_PROFILES,
  INITIAL_ROUTING_POLICIES,
  INITIAL_BACKUP_STATUS,
  INITIAL_GITHUB_STATUS,
  INITIAL_JOBS,
  INITIAL_SYSTEM_SERVICES,
  INITIAL_RESOURCE_SUMMARY
} from './mock-data.ts';
import { MockRemoteTerminalAdapter } from './mock-terminal.ts';

function createResponse<T>(data: T, durationMs = 25): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId: `req-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    durationMs,
  };
}

export class MockHealthApi implements HealthApi {
  async getHealth(): Promise<ApiResponse<HealthStatusResponse>> {
    return createResponse({
      controlPlane: {
        status: HealthStatus.HEALTHY,
        version: '1.0.0-phase1-preview',
        uptimeSeconds: INITIAL_RESOURCE_SUMMARY.uptimeSeconds || 120,
      },
      executionBackend: {
        status: HealthStatus.DEGRADED,
        message: 'Mock execution host simulated',
      },
      dataMode: 'DEMO',
      persistence: 'IN_MEMORY',
      phase: 'PHASE_1',
      services: [...INITIAL_SYSTEM_SERVICES],
    });
  }
}

export class MockDashboardApi implements DashboardApi {
  constructor(
    private activityRepo: InMemoryActivityRepository,
    private approvalRepo: InMemoryApprovalRepository
  ) {}

  async getDashboardState(): Promise<ApiResponse<DashboardState>> {
    const activities = await this.activityRepo.findAll();
    const approvals = await this.approvalRepo.findPending();

    const running = activities.filter((a) => a.status === ActivityStatus.RUNNING).length;
    const waiting = activities.filter((a) => a.status === ActivityStatus.WAITING_APPROVAL).length;
    const recoverable = activities.filter((a) => a.status === ActivityStatus.RECOVERABLE).length;
    const completed = activities.filter((a) => a.status === ActivityStatus.COMPLETED).length;
    const failed = activities.filter((a) => a.status === ActivityStatus.FAILED).length;

    const state: DashboardState = {
      ...INITIAL_DASHBOARD_STATE,
      recentActivities: activities,
      pendingApprovals: approvals,
      workSummary: {
        runningActivities: running,
        waitingApprovals: waiting,
        recoverableActivities: recoverable,
        completedActivities: completed,
        failedActivities: failed,
      },
    };

    return createResponse(state);
  }
}

export class MockProjectsApi implements ProjectsApi {
  constructor(private projectRepo: InMemoryProjectRepository) {}

  async getProjects(): Promise<ApiResponse<Project[]>> {
    const list = await this.projectRepo.findAll();
    return createResponse(list);
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new Error(`Project ${id} not found`);
    return createResponse(project);
  }

  async createProject(data: { name: string; description: string; repository: string }): Promise<ApiResponse<Project>> {
    const newProject = await this.projectRepo.create({
      id: `proj-${Date.now().toString(36)}`,
      name: data.name,
      description: data.description,
      rootPath: `/home/oracle/workspace/${data.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      repository: data.repository,
      branch: 'main',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
      activityCount: 0,
      filesCount: 4,
      isGitClean: true,
    });
    return createResponse(newProject);
  }
}

export class MockActivitiesApi implements ActivitiesApi {
  constructor(
    private activityRepo: InMemoryActivityRepository,
    private eventRepo: InMemoryEventRepository,
    private approvalRepo: InMemoryApprovalRepository,
    private checkpointRepo: InMemoryCheckpointRepository
  ) {}

  async getActivities(projectId?: string): Promise<ApiResponse<Activity[]>> {
    const list = await this.activityRepo.findAll(projectId);
    return createResponse(list);
  }

  async getActivity(id: string): Promise<ApiResponse<Activity>> {
    const activity = await this.activityRepo.findById(id);
    if (!activity) throw new Error(`Activity ${id} not found`);
    return createResponse(activity);
  }

  async createActivity(data: {
    projectId: string;
    title: string;
    description: string;
    model: string;
    provider: string;
  }): Promise<ApiResponse<Activity>> {
    const id = `act-${Date.now().toString().slice(-4)}`;
    const newActivity = await this.activityRepo.create({
      id,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: ActivityStatus.RUNNING,
      phase: 'Initial prompt queued on remote daemon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEventSequence: 1,
      lastKnownState: 'Session started and workspace lock acquired',
      currentAction: 'Waiting for remote agent dispatch',
      nextAction: 'Parse prompt requirements',
      blocker: null,
      claudeSessionId: `sess-${Date.now().toString(36)}`,
      provider: data.provider,
      model: data.model,
      gitBranch: `feat/${data.title.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`,
      gitBaseCommit: '1a7c88b',
      filesChangedCount: 0,
      testsPassed: 0,
      testsFailed: 0,
      estimatedCost: 0.01,
      durationMs: 1000,
      checkpointId: null,
      handoffAvailable: false,
      recoverable: true,
      approvalCount: 0,
    });

    await this.eventRepo.append({
      id: `evt-${Date.now()}-1`,
      activityId: id,
      type: EventType.ACTIVITY_CREATED,
      timestamp: new Date().toISOString(),
      payload: { provider: data.provider, model: data.model, title: data.title },
    });

    return createResponse(newActivity);
  }

  async continueActivity(id: string, prompt?: string): Promise<ApiResponse<Activity>> {
    const act = await this.activityRepo.findById(id);
    if (!act) throw new Error(`Activity ${id} not found`);

    const updated = await this.activityRepo.update(id, {
      status: ActivityStatus.RUNNING,
      currentAction: prompt ? `Processing user instruction: "${prompt.slice(0, 30)}..."` : 'Continuing execution from last checkpoint',
      nextAction: 'Synthesizing changes and evaluating tests',
      blocker: null,
    });

    await this.eventRepo.append({
      id: `evt-${Date.now()}`,
      activityId: id,
      type: EventType.ACTIVITY_RESUMED,
      timestamp: new Date().toISOString(),
      payload: { instruction: prompt || 'User continued session' },
    });

    return createResponse(updated!);
  }

  async pauseActivity(id: string): Promise<ApiResponse<Activity>> {
    const updated = await this.activityRepo.update(id, {
      status: ActivityStatus.PAUSED,
      currentAction: 'Paused by user',
      nextAction: 'Await resume signal',
    });
    await this.eventRepo.append({
      id: `evt-${Date.now()}`,
      activityId: id,
      type: EventType.ACTIVITY_PAUSED,
      timestamp: new Date().toISOString(),
      payload: { pausedBy: 'mobile-client' },
    });
    return createResponse(updated!);
  }

  async stopActivity(id: string): Promise<ApiResponse<Activity>> {
    const updated = await this.activityRepo.update(id, {
      status: ActivityStatus.CANCELLED,
      currentAction: 'Cancelled by user',
      nextAction: 'None',
    });
    await this.eventRepo.append({
      id: `evt-${Date.now()}`,
      activityId: id,
      type: EventType.ACTIVITY_INTERRUPTED,
      timestamp: new Date().toISOString(),
      payload: { reason: 'User requested stop (cancelled)' },
    });
    return createResponse(updated!);
  }

  async retryActivity(id: string): Promise<ApiResponse<Activity>> {
    const updated = await this.activityRepo.update(id, {
      status: ActivityStatus.RUNNING,
      currentAction: 'Retrying last failed step in clean cgroup',
      blocker: null,
    });
    await this.eventRepo.append({
      id: `evt-${Date.now()}`,
      activityId: id,
      type: EventType.ACTIVITY_RESUMED,
      timestamp: new Date().toISOString(),
      payload: { retry: true },
    });
    return createResponse(updated!);
  }

  async resumeActivity(id: string): Promise<ApiResponse<Activity>> {
    const updated = await this.activityRepo.update(id, {
      status: ActivityStatus.RUNNING,
      currentAction: 'Resumed remote agent daemon execution',
      blocker: null,
    });
    await this.eventRepo.append({
      id: `evt-${Date.now()}`,
      activityId: id,
      type: EventType.ACTIVITY_RECOVERED,
      timestamp: new Date().toISOString(),
      payload: { message: 'Recovered session from remote state' },
    });
    return createResponse(updated!);
  }

  async forkActivity(id: string): Promise<ApiResponse<Activity>> {
    const parent = await this.activityRepo.findById(id);
    if (!parent) throw new Error(`Activity ${id} not found`);

    const forkId = `act-${Date.now().toString().slice(-4)}`;
    const forked = await this.activityRepo.create({
      id: forkId,
      projectId: parent.projectId,
      title: `${parent.title} (Fork)`,
      description: `Forked from ${parent.id}: ${parent.description}`,
      status: ActivityStatus.RUNNING,
      phase: 'Forked session initialization',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEventSequence: 1,
      lastKnownState: `Forked from state of ${parent.id}`,
      currentAction: 'Initialized branch fork',
      nextAction: 'Ready for prompt',
      blocker: null,
      claudeSessionId: `sess-${Date.now().toString(36)}`,
      provider: parent.provider,
      model: parent.model,
      gitBranch: `${parent.gitBranch}-fork`,
      gitBaseCommit: parent.gitBaseCommit,
      filesChangedCount: parent.filesChangedCount,
      testsPassed: parent.testsPassed,
      testsFailed: 0,
      estimatedCost: 0.02,
      durationMs: 500,
      checkpointId: parent.checkpointId,
      handoffAvailable: true,
      recoverable: true,
      approvalCount: 0,
    });

    return createResponse(forked);
  }

  async rewindActivity(id: string, checkpointId: string): Promise<ApiResponse<Activity>> {
    const chk = await this.checkpointRepo.findById(checkpointId);
    const updated = await this.activityRepo.update(id, {
      status: ActivityStatus.PAUSED,
      checkpointId,
      lastKnownState: `Rewound to checkpoint ${checkpointId} (${chk?.description || 'snapshot'})`,
      currentAction: 'Rewound to checkpoint',
    });
    return createResponse(updated!);
  }
}

export class MockSessionsApi implements SessionsApi {
  constructor(private sessionRepo: InMemorySessionRepository) {}

  async getSessions(): Promise<ApiResponse<ClaudeSession[]>> {
    const list = await this.sessionRepo.findAll();
    return createResponse(list);
  }

  async getSession(id: string): Promise<ApiResponse<ClaudeSession>> {
    const list = await this.sessionRepo.findAll();
    const session = list.find((s) => s.id === id);
    if (!session) throw new Error(`Session ${id} not found`);
    return createResponse(session);
  }

  async sendPrompt(sessionId: string, prompt: string, options?: { planMode?: boolean }): Promise<ApiResponse<{ ack: boolean; promptEventId: string }>> {
    return createResponse({
      ack: true,
      promptEventId: `evt-ack-${Date.now()}`,
    });
  }
}

export class MockEventsApi implements EventsApi {
  constructor(
    private eventRepo: InMemoryEventRepository,
    private checkpointRepo: InMemoryCheckpointRepository
  ) {}

  async getActivityEvents(activityId: string, sinceSequence = 0): Promise<ApiResponse<ActivityEvent[]>> {
    const events = await this.eventRepo.findByActivityId(activityId);
    const filtered = events.filter((e) => e.sequence > sinceSequence);
    return createResponse(filtered);
  }

  async getCheckpoints(activityId: string): Promise<ApiResponse<Checkpoint[]>> {
    const list = await this.checkpointRepo.findByActivityId(activityId);
    return createResponse(list);
  }
}

export class MockFilesApi implements FilesApi {
  private filesByProject: Map<string, FileItem[]> = new Map();

  constructor() {
    Object.entries(INITIAL_FILE_ITEMS).forEach(([projId, items]) => {
      this.filesByProject.set(projId, [...items]);
    });
  }

  async getFiles(projectId: string, directoryPath?: string): Promise<ApiResponse<FileItem[]>> {
    const items = this.filesByProject.get(projectId) || [];
    if (!directoryPath || directoryPath === '/' || directoryPath === '.') {
      return createResponse(items);
    }
    const filtered = items.filter((f) => f.path.startsWith(directoryPath));
    return createResponse(filtered);
  }

  async getFileContent(projectId: string, filePath: string): Promise<ApiResponse<FileItem>> {
    const items = this.filesByProject.get(projectId) || [];
    const found = items.find((f) => f.path === filePath);
    if (!found) throw new Error(`File ${filePath} not found`);
    return createResponse(found);
  }

  async saveFileContent(projectId: string, filePath: string, content: string): Promise<ApiResponse<FileItem>> {
    const items = this.filesByProject.get(projectId) || [];
    const item = items.find((f) => f.path === filePath);
    if (!item) throw new Error(`File ${filePath} not found`);
    item.content = content;
    item.isModified = true;
    item.updatedAt = new Date().toISOString();
    item.sizeBytes = content.length;
    return createResponse(item);
  }

  async createFile(projectId: string, filePath: string, isDirectory: boolean): Promise<ApiResponse<FileItem>> {
    const items = this.filesByProject.get(projectId) || [];
    const name = filePath.split('/').pop() || filePath;
    const newItem: FileItem = {
      id: `f-${Date.now()}`,
      path: filePath,
      name,
      isDirectory,
      updatedAt: new Date().toISOString(),
      isModified: true,
      sizeBytes: isDirectory ? 0 : 0,
      content: isDirectory ? undefined : '',
      extension: isDirectory ? undefined : name.split('.').pop(),
    };
    items.push(newItem);
    this.filesByProject.set(projectId, items);
    return createResponse(newItem);
  }

  async renameFile(projectId: string, oldPath: string, newPath: string): Promise<ApiResponse<FileItem>> {
    const items = this.filesByProject.get(projectId) || [];
    const item = items.find((f) => f.path === oldPath);
    if (!item) throw new Error(`File ${oldPath} not found`);
    item.path = newPath;
    item.name = newPath.split('/').pop() || newPath;
    item.updatedAt = new Date().toISOString();
    return createResponse(item);
  }

  async deleteFile(projectId: string, filePath: string): Promise<ApiResponse<{ success: boolean; deletedPath: string }>> {
    const items = this.filesByProject.get(projectId) || [];
    const remaining = items.filter((f) => f.path !== filePath && !f.path.startsWith(`${filePath}/`));
    this.filesByProject.set(projectId, remaining);
    return createResponse({ success: true, deletedPath: filePath });
  }
}

export class MockTerminalApi implements TerminalApi {
  constructor(private adapter: MockRemoteTerminalAdapter) {}

  async createSession(options?: { cols?: number; rows?: number; cwd?: string }): Promise<ApiResponse<TerminalSession>> {
    const session = await this.adapter.createSession(options);
    return createResponse(session);
  }

  async sendInput(sessionId: string, input: string): Promise<ApiResponse<{ acknowledged: boolean }>> {
    await this.adapter.sendInput(sessionId, input);
    return createResponse({ acknowledged: true });
  }

  async getOutput(sessionId: string, sinceSequence = 0): Promise<ApiResponse<TerminalOutput[]>> {
    const outputs = await this.adapter.getOutput(sessionId, sinceSequence);
    return createResponse(outputs);
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<ApiResponse<{ cols: number; rows: number }>> {
    await this.adapter.resize(sessionId, cols, rows);
    return createResponse({ cols, rows });
  }

  async reconnect(sessionId: string): Promise<ApiResponse<TerminalSession>> {
    const session = await this.adapter.reconnect(sessionId);
    return createResponse(session);
  }

  async closeSession(sessionId: string): Promise<ApiResponse<{ closed: boolean }>> {
    await this.adapter.close(sessionId);
    return createResponse({ closed: true });
  }
}

export class MockGitHubApi implements GitHubApi {
  private status = { ...INITIAL_GITHUB_STATUS };

  async getStatus(): Promise<ApiResponse<GitHubRepoStatus>> {
    return createResponse(this.status);
  }

  async syncRepository(): Promise<ApiResponse<{ synced: boolean; latestCommitSha: string }>> {
    return createResponse({ synced: true, latestCommitSha: '9f83a21' });
  }
}

export class MockMcpApi implements McpApi {
  private servers = [...INITIAL_MCP_SERVERS];

  async getServers(): Promise<ApiResponse<McpServerItem[]>> {
    return createResponse(this.servers);
  }

  async toggleServer(id: string, enabled: boolean): Promise<ApiResponse<McpServerItem>> {
    const target = this.servers.find((s) => s.id === id);
    if (!target) throw new Error(`MCP server ${id} not found`);
    target.enabled = enabled;
    target.status = enabled ? HealthStatus.HEALTHY : HealthStatus.UNKNOWN;
    return createResponse(target);
  }

  async restartServer(id: string): Promise<ApiResponse<McpServerItem>> {
    const target = this.servers.find((s) => s.id === id);
    if (!target) throw new Error(`MCP server ${id} not found`);
    target.status = HealthStatus.HEALTHY;
    target.health = 'OK';
    target.lastError = null;
    return createResponse(target);
  }

  async addServer(server: Partial<McpServerItem>): Promise<ApiResponse<McpServerItem>> {
    const newServer: McpServerItem = {
      schemaVersion: 1,
      id: `mcp-${Date.now().toString(36)}`,
      name: server.name || 'custom-mcp-server',
      transport: server.transport || 'stdio',
      status: HealthStatus.HEALTHY,
      version: '1.0.0',
      enabled: true,
      health: 'OK',
      toolsCount: 0,
      lastError: null,
      command: server.command || '',
      description: server.description || 'Custom MCP tool suite',
    };
    this.servers.push(newServer);
    return createResponse(newServer);
  }
}

export class MockModelsApi implements ModelsApi {
  private profiles = [...INITIAL_MODEL_PROFILES];
  private policies = [...INITIAL_ROUTING_POLICIES];

  async getProfiles(): Promise<ApiResponse<ModelProfile[]>> {
    return createResponse(this.profiles);
  }

  async getRoutingPolicies(): Promise<ApiResponse<TaskRoutingPolicy[]>> {
    return createResponse(this.policies);
  }

  async updateRoutingPolicy(id: string, updates: Partial<TaskRoutingPolicy>): Promise<ApiResponse<TaskRoutingPolicy>> {
    const policy = this.policies.find((p) => p.id === id);
    if (!policy) throw new Error(`Policy ${id} not found`);
    Object.assign(policy, updates);
    return createResponse(policy);
  }
}

export class MockJobsApi implements JobsApi {
  private jobs = [...INITIAL_JOBS];

  async getJobs(): Promise<ApiResponse<BackgroundJob[]>> {
    return createResponse(this.jobs);
  }

  async triggerJob(type: string, title: string): Promise<ApiResponse<BackgroundJob>> {
    const newJob: BackgroundJob = {
      schemaVersion: 1,
      id: `job-${Date.now().toString().slice(-4)}`,
      type: type as any,
      title,
      status: 'RUNNING',
      progressPercent: 5,
      startedAt: new Date().toISOString(),
      durationMs: 500,
      command: `workstation-runner --task ${type.toLowerCase()}`,
    };
    this.jobs.unshift(newJob);
    return createResponse(newJob);
  }

  async cancelJob(id: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    const job = this.jobs.find((j) => j.id === id);
    if (job) job.status = 'FAILED';
    return createResponse({ cancelled: true });
  }
}

export class MockMonitoringApi implements MonitoringApi {
  async getMetrics(): Promise<ApiResponse<{
    resources: ServerResourceSummary;
    services: SystemServiceStatus[];
  }>> {
    return createResponse({
      resources: { ...INITIAL_RESOURCE_SUMMARY },
      services: [...INITIAL_SYSTEM_SERVICES],
    });
  }
}

export class MockBackupApi implements BackupApi {
  private status = { ...INITIAL_BACKUP_STATUS };

  async getStatus(): Promise<ApiResponse<BackupStatus>> {
    return createResponse(this.status);
  }

  async triggerBackup(): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return createResponse({ jobId: `job-bk-${Date.now()}`, status: 'STARTED' });
  }

  async verifyBackup(): Promise<ApiResponse<{ verified: boolean; message: string }>> {
    return createResponse({
      verified: true,
      message: 'All 3 snapshot blocks match sha256 checksums in Oracle Object Storage.',
    });
  }

  async testRestore(): Promise<ApiResponse<{ restored: boolean; message: string }>> {
    return createResponse({
      restored: true,
      message: 'Synthetic test sandbox spun up, snapshot unpacked, integrity verified in 1.4s.',
    });
  }
}

export class MockAdminApi implements AdminApi {
  async rebootServer(riskLevel: RiskLevel): Promise<ApiResponse<{ scheduled: boolean; message: string }>> {
    return createResponse({
      scheduled: true,
      message: 'Remote Oracle Linux VM reboot scheduled. Estimated offline duration: ~18 seconds.',
    });
  }

  async restartService(serviceName: string): Promise<ApiResponse<{ restarted: boolean }>> {
    return createResponse({ restarted: true });
  }

  async runDiagnostic(): Promise<ApiResponse<{ status: 'HEALTHY' | 'DEGRADED'; reports: string[] }>> {
    return createResponse({
      status: 'HEALTHY',
      reports: [
        'Kernel memory limits: healthy (no OOM events in 14 days)',
        'Cgroup v2 hierarchy: verified and isolated',
        'Claude daemon IPC socket: responsive (12ms ping)',
        'Storage I/O latency: 0.8ms p99',
      ],
    });
  }
}

export class MockApprovalsApi implements ApprovalsApi {
  constructor(private approvalRepo: InMemoryApprovalRepository) {}

  async getApprovals(activityId?: string): Promise<ApiResponse<PendingApproval[]>> {
    const list = await this.approvalRepo.findPending(activityId);
    return createResponse(list);
  }

  async getApproval(id: string): Promise<ApiResponse<PendingApproval>> {
    const a = await this.approvalRepo.findById(id);
    if (!a) throw new Error(`Approval ${id} not found`);
    return createResponse(a);
  }

  async createApproval(
    approval: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>
  ): Promise<ApiResponse<PendingApproval>> {
    const created = await this.approvalRepo.create({
      ...approval,
      id: `appr-${Date.now().toString().slice(-4)}`,
      status: ApprovalStatus.PENDING,
      requestedAt: new Date().toISOString(),
    });
    return createResponse(created);
  }

  async resolveApproval(id: string, status: ApprovalStatus): Promise<ApiResponse<PendingApproval>> {
    const resolved = await this.approvalRepo.resolve(id, status, 'demo-operator');
    if (!resolved) throw new Error(`Approval ${id} not found`);
    return createResponse(resolved);
  }
}

