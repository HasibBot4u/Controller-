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
} from '../domain/contracts/api-contracts.ts';
import {
  HttpHealthApi,
  HttpDashboardApi,
  HttpProjectsApi,
  HttpActivitiesApi,
  HttpSessionsApi,
  HttpEventsApi,
  HttpFilesApi,
  HttpTerminalApi,
  HttpGitHubApi,
  HttpMcpApi,
  HttpModelsApi,
  HttpJobsApi,
  HttpMonitoringApi,
  HttpBackupApi,
  HttpAdminApi,
  HttpApprovalsApi,
} from '../adapters/http/http-adapters.ts';
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
  MockApprovalsApi,
} from '../adapters/mock/mock-adapters.ts';
import { MockRemoteTerminalAdapter, RemoteTerminalAdapter } from '../adapters/mock/mock-terminal.ts';

export type ServiceMode = 'http' | 'mock';

export interface ServiceContainer {
  mode: ServiceMode;
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
  approvalsApi: ApprovalsApi;
  adminApi: AdminApi;
  terminalAdapter: RemoteTerminalAdapter;
}

class ControlCenterServiceFactory {
  private static httpInstance: ServiceContainer | null = null;
  private static mockInstance: ServiceContainer | null = null;
  private static currentMode: ServiceMode = 'http';

  public static getServices(mode: ServiceMode = this.currentMode): ServiceContainer {
    this.currentMode = mode;

    if (mode === 'http') {
      if (!this.httpInstance) {
        const terminalAdapter = new MockRemoteTerminalAdapter();
        this.httpInstance = {
          mode: 'http',
          healthApi: new HttpHealthApi(),
          dashboardApi: new HttpDashboardApi(),
          projectsApi: new HttpProjectsApi(),
          activitiesApi: new HttpActivitiesApi(),
          sessionsApi: new HttpSessionsApi(),
          eventsApi: new HttpEventsApi(),
          filesApi: new HttpFilesApi(),
          terminalApi: new HttpTerminalApi(),
          gitHubApi: new HttpGitHubApi(),
          mcpApi: new HttpMcpApi(),
          modelsApi: new HttpModelsApi(),
          jobsApi: new HttpJobsApi(),
          monitoringApi: new HttpMonitoringApi(),
          backupApi: new HttpBackupApi(),
          approvalsApi: new HttpApprovalsApi(),
          adminApi: new HttpAdminApi(),
          terminalAdapter,
        };
      }
      return this.httpInstance;
    }

    if (!this.mockInstance) {
      const projectRepo = new InMemoryProjectRepository();
      const activityRepo = new InMemoryActivityRepository();
      const eventRepo = new InMemoryEventRepository();
      const checkpointRepo = new InMemoryCheckpointRepository();
      const approvalRepo = new InMemoryApprovalRepository();
      const sessionRepo = new InMemorySessionRepository();
      const terminalAdapter = new MockRemoteTerminalAdapter();

      this.mockInstance = {
        mode: 'mock',
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
        approvalsApi: new MockApprovalsApi(approvalRepo),
        adminApi: new MockAdminApi(),
        terminalAdapter,
      };
    }
    return this.mockInstance;
  }

  public static setMode(mode: ServiceMode): ServiceContainer {
    this.currentMode = mode;
    return this.getServices(mode);
  }
}

// Default export uses HTTP adapter for normal application operation
export const services = ControlCenterServiceFactory.getServices('http');
export const setServiceMode = (mode: ServiceMode) => ControlCenterServiceFactory.setMode(mode);
