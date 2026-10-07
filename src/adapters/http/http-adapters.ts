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
  ApiResponse,
  HealthStatusResponse,
} from '../../domain/models/index.ts';
import { ApprovalStatus, RiskLevel } from '../../domain/enums/index.ts';
import { requestJson } from './http-client.ts';

export class HttpHealthApi implements HealthApi {
  async getHealth(): Promise<ApiResponse<HealthStatusResponse>> {
    return requestJson('/health');
  }
}

export class HttpDashboardApi implements DashboardApi {
  async getDashboardState(): Promise<ApiResponse<DashboardState>> {
    return requestJson('/dashboard');
  }
}

export class HttpProjectsApi implements ProjectsApi {
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return requestJson('/projects');
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return requestJson(`/projects/${encodeURIComponent(id)}`);
  }

  async createProject(data: { name: string; description: string; repository: string }): Promise<ApiResponse<Project>> {
    return requestJson('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export class HttpActivitiesApi implements ActivitiesApi {
  async getActivities(projectId?: string): Promise<ApiResponse<Activity[]>> {
    const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return requestJson(`/activities${q}`);
  }

  async getActivity(id: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}`);
  }

  async createActivity(data: {
    projectId: string;
    title: string;
    description: string;
    model: string;
    provider: string;
  }): Promise<ApiResponse<Activity>> {
    return requestJson('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async continueActivity(id: string, prompt?: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/continue`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async pauseActivity(id: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
    });
  }

  async stopActivity(id: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/stop`, {
      method: 'POST',
    });
  }

  async retryActivity(id: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
  }

  async resumeActivity(id: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
    });
  }

  async forkActivity(id: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/fork`, {
      method: 'POST',
    });
  }

  async rewindActivity(id: string, checkpointId: string): Promise<ApiResponse<Activity>> {
    return requestJson(`/activities/${encodeURIComponent(id)}/rewind`, {
      method: 'POST',
      body: JSON.stringify({ checkpointId }),
    });
  }
}

export class HttpSessionsApi implements SessionsApi {
  async getSessions(): Promise<ApiResponse<ClaudeSession[]>> {
    return requestJson('/sessions');
  }

  async getSession(id: string): Promise<ApiResponse<ClaudeSession>> {
    return requestJson(`/sessions/${encodeURIComponent(id)}`);
  }

  async sendPrompt(
    sessionId: string,
    prompt: string,
    options?: { planMode?: boolean }
  ): Promise<ApiResponse<{ ack: boolean; promptEventId: string }>> {
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ prompt, planMode: options?.planMode }),
    });
  }
}

export class HttpEventsApi implements EventsApi {
  async getActivityEvents(activityId: string, sinceSequence = 0): Promise<ApiResponse<ActivityEvent[]>> {
    const q = sinceSequence ? `?sinceSequence=${sinceSequence}` : '';
    return requestJson(`/activities/${encodeURIComponent(activityId)}/events${q}`);
  }

  async getCheckpoints(activityId: string): Promise<ApiResponse<Checkpoint[]>> {
    return requestJson(`/activities/${encodeURIComponent(activityId)}/checkpoints`);
  }
}

export class HttpFilesApi implements FilesApi {
  async getFiles(projectId: string, directoryPath?: string): Promise<ApiResponse<FileItem[]>> {
    const res = await requestJson<FileItem[]>(`/projects/${encodeURIComponent(projectId)}/files`);
    if (directoryPath && directoryPath !== '/' && directoryPath !== '.') {
      return {
        ...res,
        data: res.data.filter((f: FileItem) => f.path.startsWith(directoryPath)),
      };
    }
    return res;
  }

  async getFileContent(projectId: string, filePath: string): Promise<ApiResponse<FileItem>> {
    return requestJson(`/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(filePath)}`);
  }

  async saveFileContent(
    projectId: string,
    filePath: string,
    content: string
  ): Promise<ApiResponse<FileItem>> {
    return requestJson(`/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(filePath)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async createFile(projectId: string, filePath: string, isDirectory: boolean): Promise<ApiResponse<FileItem>> {
    return requestJson(`/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      body: JSON.stringify({ path: filePath, isDirectory }),
    });
  }

  async renameFile(projectId: string, oldPath: string, newPath: string): Promise<ApiResponse<FileItem>> {
    return requestJson(`/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(oldPath)}`, {
      method: 'PATCH',
      body: JSON.stringify({ newPath }),
    });
  }

  async deleteFile(projectId: string, filePath: string): Promise<ApiResponse<{ success: boolean; deletedPath: string }>> {
    return requestJson(`/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    });
  }
}

export class HttpTerminalApi implements TerminalApi {
  async createSession(options?: { cols?: number; rows?: number; cwd?: string }): Promise<ApiResponse<TerminalSession>> {
    return requestJson('/terminal/session', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async sendInput(sessionId: string, input: string): Promise<ApiResponse<{ acknowledged: boolean }>> {
    return requestJson('/terminal/input', {
      method: 'POST',
      body: JSON.stringify({ sessionId, input }),
    });
  }

  async getOutput(sessionId: string, sinceSequence = 0): Promise<ApiResponse<TerminalOutput[]>> {
    return requestJson(`/terminal/${encodeURIComponent(sessionId)}/output?since=${sinceSequence}`);
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<ApiResponse<{ cols: number; rows: number }>> {
    return requestJson(`/terminal/${encodeURIComponent(sessionId)}/resize`, {
      method: 'POST',
      body: JSON.stringify({ cols, rows }),
    });
  }

  async reconnect(sessionId: string): Promise<ApiResponse<TerminalSession>> {
    return requestJson('/terminal/session', {
      method: 'POST',
      body: JSON.stringify({ reconnectSessionId: sessionId }),
    });
  }

  async closeSession(sessionId: string): Promise<ApiResponse<{ closed: boolean }>> {
    return requestJson(`/terminal/${encodeURIComponent(sessionId)}/close`, {
      method: 'POST',
    });
  }
}

export class HttpGitHubApi implements GitHubApi {
  async getStatus(): Promise<ApiResponse<GitHubRepoStatus>> {
    return requestJson('/github/status');
  }

  async syncRepository(): Promise<ApiResponse<{ synced: boolean; latestCommitSha: string }>> {
    return requestJson('/github/sync', { method: 'POST' });
  }
}

export class HttpMcpApi implements McpApi {
  async getServers(): Promise<ApiResponse<McpServerItem[]>> {
    return requestJson('/mcp');
  }

  async toggleServer(id: string, enabled: boolean): Promise<ApiResponse<McpServerItem>> {
    return requestJson(`/mcp/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async restartServer(id: string): Promise<ApiResponse<McpServerItem>> {
    return requestJson(`/mcp/${encodeURIComponent(id)}/restart`, {
      method: 'POST',
    });
  }

  async addServer(server: Partial<McpServerItem>): Promise<ApiResponse<McpServerItem>> {
    return requestJson('/mcp', {
      method: 'POST',
      body: JSON.stringify(server),
    });
  }
}

export class HttpModelsApi implements ModelsApi {
  async getProfiles(): Promise<ApiResponse<ModelProfile[]>> {
    const res = await requestJson<{ profiles: ModelProfile[]; routingPolicies: TaskRoutingPolicy[] }>('/models');
    return {
      ...res,
      data: res.data.profiles,
    };
  }

  async getRoutingPolicies(): Promise<ApiResponse<TaskRoutingPolicy[]>> {
    return requestJson('/models/routing');
  }

  async updateRoutingPolicy(id: string, policy: Partial<TaskRoutingPolicy>): Promise<ApiResponse<TaskRoutingPolicy>> {
    return requestJson(`/models/routing/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(policy),
    });
  }
}

export class HttpJobsApi implements JobsApi {
  async getJobs(): Promise<ApiResponse<BackgroundJob[]>> {
    return requestJson('/jobs');
  }

  async triggerJob(type: string, title: string): Promise<ApiResponse<BackgroundJob>> {
    return requestJson('/jobs', {
      method: 'POST',
      body: JSON.stringify({ type, title }),
    });
  }

  async cancelJob(id: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    return requestJson(`/jobs/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
  }
}

export class HttpMonitoringApi implements MonitoringApi {
  async getMetrics(): Promise<ApiResponse<{
    resources: ServerResourceSummary;
    services: SystemServiceStatus[];
  }>> {
    return requestJson('/monitoring');
  }
}

export class HttpBackupApi implements BackupApi {
  async getStatus(): Promise<ApiResponse<BackupStatus>> {
    return requestJson('/backups');
  }

  async triggerBackup(): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return requestJson('/backups', { method: 'POST' });
  }

  async verifyBackup(): Promise<ApiResponse<{ verified: boolean; message: string }>> {
    return requestJson('/backups/verify', { method: 'POST' });
  }

  async testRestore(): Promise<ApiResponse<{ restored: boolean; message: string }>> {
    return requestJson('/backups/restore-test', { method: 'POST' });
  }
}

export class HttpApprovalsApi implements ApprovalsApi {
  async getApprovals(activityId?: string): Promise<ApiResponse<PendingApproval[]>> {
    const q = activityId ? `?activityId=${encodeURIComponent(activityId)}` : '';
    return requestJson(`/approvals${q}`);
  }

  async getApproval(id: string): Promise<ApiResponse<PendingApproval>> {
    return requestJson(`/approvals/${encodeURIComponent(id)}`);
  }

  async createApproval(
    approval: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>
  ): Promise<ApiResponse<PendingApproval>> {
    return requestJson('/approvals', {
      method: 'POST',
      body: JSON.stringify(approval),
    });
  }

  async resolveApproval(id: string, status: ApprovalStatus): Promise<ApiResponse<PendingApproval>> {
    return requestJson(`/approvals/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }
}

export class HttpAdminApi implements AdminApi {
  async rebootServer(riskLevel: RiskLevel): Promise<ApiResponse<{ scheduled: boolean; message: string }>> {
    return requestJson('/admin/reboot', {
      method: 'POST',
      body: JSON.stringify({ riskLevel }),
    });
  }

  async restartService(serviceName: string): Promise<ApiResponse<{ restarted: boolean }>> {
    return requestJson(`/admin/services/${encodeURIComponent(serviceName)}/restart`, {
      method: 'POST',
    });
  }

  async runDiagnostic(): Promise<ApiResponse<{ status: 'HEALTHY' | 'DEGRADED'; reports: string[] }>> {
    return requestJson('/admin/diagnostic', {
      method: 'POST',
    });
  }
}
