import { ActivityStatus, EventType, RiskLevel, HealthStatus, ApprovalStatus } from '../enums/index.ts';

export interface BaseEntity {
  schemaVersion: number;
}

export interface Activity extends BaseEntity {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: ActivityStatus;
  phase: string;
  createdAt: string;
  updatedAt: string;
  lastEventSequence: number;
  lastKnownState: string;
  currentAction: string;
  nextAction: string;
  blocker: string | null;
  claudeSessionId: string;
  provider: string;
  model: string;
  gitBranch: string;
  gitBaseCommit: string;
  filesChangedCount: number;
  testsPassed: number;
  testsFailed: number;
  estimatedCost: number;
  durationMs: number;
  checkpointId: string | null;
  handoffAvailable: boolean;
  recoverable: boolean;
  approvalCount: number;
}

export interface Project extends BaseEntity {
  id: string;
  name: string;
  description: string;
  rootPath: string;
  repository: string;
  branch: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'SYNCING';
  updatedAt: string;
  activityCount: number;
  filesCount: number;
  isGitClean: boolean;
}

export interface ActivityEvent extends BaseEntity {
  id: string;
  activityId: string;
  sequence: number;
  timestamp: string;
  type: EventType;
  payload: Record<string, unknown>;
}

export interface Checkpoint extends BaseEntity {
  id: string;
  activityId: string;
  projectId: string;
  createdAt: string;
  description: string;
  gitCommitSha: string;
  filesSnapshotCount: number;
  trigger: 'AUTO_STEP' | 'MANUAL_SAVE' | 'PRE_APPROVAL' | 'RECOVERY_POINT';
  sizeBytes: number;
}

export interface PendingApproval extends BaseEntity {
  id: string;
  activityId: string;
  projectId: string;
  riskLevel: RiskLevel;
  actionType: string;
  title: string;
  description: string;
  commandOrDiff?: string;
  parameters: Record<string, unknown>;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ClaudeSession extends BaseEntity {
  id: string;
  activityId: string;
  projectId: string;
  provider: string;
  model: string;
  status: 'CONNECTED' | 'STREAMING' | 'IDLE' | 'DETACHED' | 'TERMINATED';
  createdAt: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  planMode: boolean;
  approvalMode: 'STRICT' | 'STANDARD' | 'PERMISSIVE';
  contextUsagePercent: number;
}

export interface SystemServiceStatus {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  lastChecked: string;
}

export interface ServerResourceSummary {
  cpuPercent: number;
  cpuCores: number;
  cpuLoadAvg: [number, number, number];
  memoryUsedGb: number;
  memoryTotalGb: number;
  memoryPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskPercent: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  osName: string;
  kernelVersion: string;
}

export interface WorkSummary {
  runningActivities: number;
  waitingApprovals: number;
  recoverableActivities: number;
  completedActivities: number;
  failedActivities: number;
}

export interface AISummary {
  currentProvider: string;
  currentModel: string;
  todayRequests: number;
  todayEstimatedCost: number;
  weeklyCost: number;
  monthlyCost: number;
}

export interface DashboardState extends BaseEntity {
  systemStatus: {
    cloud: HealthStatus;
    claude: HealthStatus;
    mcp: HealthStatus;
    liteLLM: HealthStatus;
    github: HealthStatus;
    backup: HealthStatus;
    monitoring: HealthStatus;
  };
  serverSummary: ServerResourceSummary;
  workSummary: WorkSummary;
  aiSummary: AISummary;
  recentActivities: Activity[];
  pendingApprovals: PendingApproval[];
}

export interface FileItem {
  id: string;
  path: string;
  name: string;
  isDirectory: boolean;
  sizeBytes?: number;
  updatedAt: string;
  isModified?: boolean;
  content?: string;
  extension?: string;
}

export interface TerminalSession {
  sessionId: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'TERMINATED';
  pty: string;
  cols: number;
  rows: number;
  cwd: string;
  connectedAt: string;
}

export interface TerminalOutput {
  sessionId: string;
  sequence: number;
  data: string;
  timestamp: string;
}

export interface McpServerItem extends BaseEntity {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'websocket';
  status: HealthStatus;
  version: string;
  enabled: boolean;
  health: 'OK' | 'WARN' | 'CRIT' | 'OFFLINE';
  toolsCount: number;
  lastError: string | null;
  command?: string;
  description: string;
}

export interface ModelProfile extends BaseEntity {
  id: string;
  provider: 'Anthropic' | 'LiteLLM' | 'Gemini' | 'OpenRouter' | 'Custom' | 'Local';
  model: string;
  baseUrl: string;
  availability: HealthStatus;
  toolCalling: boolean;
  streaming: boolean;
  thinkingSupport: boolean;
  tokenAccounting: boolean;
  estimatedCostPer1M: { input: number; output: number };
  priority: number;
}

export interface TaskRoutingPolicy extends BaseEntity {
  id: string;
  taskComplexity: 'SIMPLE' | 'NORMAL' | 'COMPLEX' | 'CRITICAL';
  description: string;
  targetProvider: string;
  targetModel: string;
  requiresApproval: boolean;
}

export interface BackupStatus extends BaseEntity {
  lastSuccessfulBackup: string;
  backupAge: string;
  destination: string;
  checksumState: 'VERIFIED' | 'PENDING' | 'CORRUPTED';
  lastRestoreTest: string;
  backupSize: string;
  nextScheduledBackup: string;
  history: Array<{
    id: string;
    timestamp: string;
    size: string;
    destination: string;
    checksum: string;
    status: 'SUCCESS' | 'FAILED';
  }>;
}

export interface GitHubRepoStatus extends BaseEntity {
  repository: string;
  currentBranch: string;
  isClean: boolean;
  issuesCount: number;
  prsCount: number;
  ciStatus: 'SUCCESS' | 'RUNNING' | 'FAILED' | 'UNKNOWN';
  recentCommits: Array<{
    sha: string;
    message: string;
    author: string;
    timestamp: string;
  }>;
  pullRequests: Array<{
    id: number;
    title: string;
    branch: string;
    author: string;
    status: 'OPEN' | 'MERGED' | 'DRAFT';
  }>;
}

export interface BackgroundJob extends BaseEntity {
  id: string;
  type: 'BUILD' | 'TEST' | 'BACKUP' | 'GIT_SYNC' | 'MCP_RESTART';
  title: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  progressPercent: number;
  startedAt: string;
  durationMs: number;
  command: string;
}

export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
  service: string;
  timestamp: string;
  requestId: string;
  details?: Record<string, unknown>;
}

export interface AuthPrincipal {
  id: string;
  role: 'OWNER' | 'OPERATOR' | 'VIEWER';
  authMode: 'PHASE1_DEMO';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  requestId: string;
  timestamp: string;
  durationMs?: number;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    service: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
}

