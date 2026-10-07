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
} from '../domain/contracts/api-contracts.ts';
import {
  InMemoryProjectRepository,
  InMemoryActivityRepository,
  InMemoryEventRepository,
  InMemoryCheckpointRepository,
  InMemoryApprovalRepository,
  InMemorySessionRepository,
} from '../adapters/mock/mock-repositories.ts';
import {
  MockHealthApi,
  MockDashboardApi,
  MockProjectsApi,
  MockActivitiesApi,
  MockSessionsApi,
  MockEventsApi,
  MockFilesApi,
  MockTerminalApi,
  MockGitHubApi,
  MockMcpApi,
  MockModelsApi,
  MockJobsApi,
  MockMonitoringApi,
  MockBackupApi,
  MockAdminApi,
} from '../adapters/mock/mock-adapters.ts';
import { MockRemoteTerminalAdapter, RemoteTerminalAdapter } from '../adapters/mock/mock-terminal.ts';

export interface ServiceContainer {
  healthApi: HealthApi;
  dashboardApi: DashboardApi;
  projectsApi: ProjectsApi;
  activitiesApi: ActivitiesApi;
  sessionsApi: SessionsApi;
  eventsApi: EventsApi;
  filesApi: FilesApi;
  terminalApi: TerminalApi;
  gitHubApi: GitHubApi;
  mcpApi: McpApi;
  modelsApi: ModelsApi;
  jobsApi: JobsApi;
  monitoringApi: MonitoringApi;
  backupApi: BackupApi;
  adminApi: AdminApi;
  terminalAdapter: RemoteTerminalAdapter;
}

class ControlCenterServiceFactory {
  private static instance: ServiceContainer | null = null;

  public static getServices(): ServiceContainer {
    if (!this.instance) {
      const projectRepo = new InMemoryProjectRepository();
      const activityRepo = new InMemoryActivityRepository();
      const eventRepo = new InMemoryEventRepository();
      const checkpointRepo = new InMemoryCheckpointRepository();
      const approvalRepo = new InMemoryApprovalRepository();
      const sessionRepo = new InMemorySessionRepository();

      const terminalAdapter = new MockRemoteTerminalAdapter();

      this.instance = {
        healthApi: new MockHealthApi(),
        dashboardApi: new MockDashboardApi(activityRepo, approvalRepo),
        projectsApi: new MockProjectsApi(projectRepo),
        activitiesApi: new MockActivitiesApi(activityRepo, eventRepo, approvalRepo, checkpointRepo),
        sessionsApi: new MockSessionsApi(sessionRepo),
        eventsApi: new MockEventsApi(eventRepo, checkpointRepo),
        filesApi: new MockFilesApi(),
        terminalApi: new MockTerminalApi(terminalAdapter),
        gitHubApi: new MockGitHubApi(),
        mcpApi: new MockMcpApi(),
        modelsApi: new MockModelsApi(),
        jobsApi: new MockJobsApi(),
        monitoringApi: new MockMonitoringApi(),
        backupApi: new MockBackupApi(),
        adminApi: new MockAdminApi(),
        terminalAdapter,
      };
    }
    return this.instance;
  }
}

export const services = ControlCenterServiceFactory.getServices();
