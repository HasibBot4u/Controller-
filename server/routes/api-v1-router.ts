import { Router, Request, Response, NextFunction } from 'express';
import {
  DEMO_DASHBOARD_STATE,
  DEMO_FILES,
  DEMO_MCP_SERVERS,
  DEMO_ROUTING_POLICIES,
  DEMO_BACKUP_STATUS,
  DEMO_GITHUB_STATUS,
  DEMO_JOBS,
  DEMO_PROJECTS,
  DEMO_ACTIVITIES,
  DEMO_EVENTS,
  DEMO_CHECKPOINTS,
  DEMO_APPROVALS,
  DEMO_SESSIONS,
} from '../adapters/mock/mock-data.ts';
import { VERIFIED_REFERENCE_MODELS } from '../../src/domain/reference/models.ts';
import { ActivityStatus, ApprovalStatus, EventType, RiskLevel, HealthStatus } from '../../src/domain/enums/index.ts';
import { assertActivityTransition } from '../../src/domain/state-machine/activity-state-machine.ts';
import { validateRelativeFilePath } from '../validation/path-validator.ts';
import { requireRole } from '../middleware/auth.ts';
import { CENTRAL_ACTION_POLICIES, ActionType } from '../policy/action-policy.ts';
import { MemoryProjectRepository } from '../repositories/memory/project-repository.ts';
import { MemoryActivityRepository } from '../repositories/memory/activity-repository.ts';
import { MemoryEventRepository } from '../repositories/memory/event-repository.ts';
import { MemoryCheckpointRepository } from '../repositories/memory/checkpoint-repository.ts';
import { MemoryApprovalRepository } from '../repositories/memory/approval-repository.ts';
import { MemorySessionRepository } from '../repositories/memory/session-repository.ts';
import {
  FileItem,
  BackgroundJob,
  McpServerItem,
  TaskRoutingPolicy,
  BackupStatus,
  GitHubRepoStatus,
  HealthStatusResponse,
  DashboardState,
  TerminalSession,
  TerminalOutput,
} from '../../src/domain/models/index.ts';

export const apiV1Router = Router();

// Mode detection: Default is strictly FALSE (Empty / Unconfigured)
const isDemoMode = process.env.PHASE1_DEMO_MODE === 'true';

// Server-side repositories: Default start EMPTY unless PHASE1_DEMO_MODE is true
const projectRepo = new MemoryProjectRepository(isDemoMode ? DEMO_PROJECTS : []);
const activityRepo = new MemoryActivityRepository(isDemoMode ? DEMO_ACTIVITIES : []);
const eventRepo = new MemoryEventRepository(isDemoMode ? DEMO_EVENTS : []);
const checkpointRepo = new MemoryCheckpointRepository(isDemoMode ? DEMO_CHECKPOINTS : []);
const approvalRepo = new MemoryApprovalRepository(isDemoMode ? DEMO_APPROVALS : []);
const sessionRepo = new MemorySessionRepository(isDemoMode ? DEMO_SESSIONS : []);

// Ephemeral server stores
const filesStore = new Map<string, FileItem[]>();
if (isDemoMode) {
  Object.entries(DEMO_FILES).forEach(([projId, list]) => {
    filesStore.set(projId, list.map((f) => ({ ...f })));
  });
}

const mcpServersStore: McpServerItem[] = isDemoMode ? DEMO_MCP_SERVERS.map((s) => ({ ...s })) : [];
const routingPoliciesStore: TaskRoutingPolicy[] = isDemoMode ? DEMO_ROUTING_POLICIES.map((p) => ({ ...p })) : [];
const jobsStore: BackgroundJob[] = isDemoMode ? DEMO_JOBS.map((j) => ({ ...j })) : [];

const backupStatusStore: BackupStatus = isDemoMode
  ? { ...DEMO_BACKUP_STATUS }
  : {
      schemaVersion: 1,
      lastSuccessfulBackup: null,
      backupAge: null,
      destination: null,
      checksumState: 'NOT_CONFIGURED',
      lastRestoreTest: null,
      backupSize: null,
      nextScheduledBackup: null,
      history: [],
      origin: 'UNAVAILABLE',
    };

const githubStatusStore: GitHubRepoStatus = isDemoMode
  ? { ...DEMO_GITHUB_STATUS }
  : {
      schemaVersion: 1,
      repository: null,
      currentBranch: null,
      isConnected: false,
      isClean: null,
      issuesCount: null,
      prsCount: null,
      ciStatus: 'NOT_CONFIGURED',
      recentCommits: [],
      pullRequests: [],
      origin: 'UNAVAILABLE',
    };

// Terminal sessions in-memory store
const terminalSessionsStore = new Map<string, { session: TerminalSession; outputs: TerminalOutput[] }>();

function sendSuccess<T>(req: Request, res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: req.requestId || 'unknown-req',
    timestamp: new Date().toISOString(),
  });
}

function sendError(
  req: Request,
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
) {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      retryable: statusCode >= 500,
      service: 'control-plane-api',
      details,
    },
    requestId: req.requestId || 'unknown-req',
    timestamp: new Date().toISOString(),
  });
}

// ==========================================
// 1. HEALTH & DASHBOARD (Truthful State)
// ==========================================

// GET /api/v1/health
apiV1Router.get('/health', (req: Request, res: Response) => {
  const healthData: HealthStatusResponse = {
    controlPlane: {
      status: HealthStatus.HEALTHY,
      version: '1.0.0-phase1',
      uptimeSeconds: Math.floor(process.uptime()),
    },
    executionBackend: {
      status: isDemoMode ? HealthStatus.DEGRADED : HealthStatus.NOT_CONFIGURED,
      message: isDemoMode
        ? 'Simulated in-memory host active (PHASE1_DEMO_MODE=true)'
        : 'Remote workstation execution layer is not configured',
    },
    dataMode: isDemoMode ? 'DEMO' : 'EMPTY',
    persistence: 'IN_MEMORY',
    phase: 'PHASE_1',
    services: [
      {
        name: 'Control Plane HTTP Server',
        status: HealthStatus.HEALTHY,
        latencyMs: 1,
        message: 'Responsive',
        lastChecked: 'now',
        origin: 'LIVE',
      },
      {
        name: 'Remote Workstation Host',
        status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
        latencyMs: isDemoMode ? 14 : null,
        message: isDemoMode ? 'Simulated host' : 'Unconfigured',
        lastChecked: isDemoMode ? 'now' : 'never',
        origin: isDemoMode ? 'DEMO' : 'UNAVAILABLE',
      },
      {
        name: 'Claude Code Remote Daemon',
        status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
        latencyMs: isDemoMode ? 22 : null,
        message: isDemoMode ? 'Simulated daemon' : 'Unconfigured',
        lastChecked: isDemoMode ? 'now' : 'never',
        origin: isDemoMode ? 'DEMO' : 'UNAVAILABLE',
      },
      {
        name: 'MCP Gateway Daemon',
        status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
        latencyMs: isDemoMode ? 18 : null,
        message: isDemoMode ? 'Simulated MCP' : 'Unconfigured',
        lastChecked: isDemoMode ? 'now' : 'never',
        origin: isDemoMode ? 'DEMO' : 'UNAVAILABLE',
      },
      {
        name: 'LiteLLM Proxy Router',
        status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
        latencyMs: isDemoMode ? 29 : null,
        message: isDemoMode ? 'Simulated proxy' : 'Unconfigured',
        lastChecked: isDemoMode ? 'now' : 'never',
        origin: isDemoMode ? 'DEMO' : 'UNAVAILABLE',
      },
      {
        name: 'GitHub Remote Integration',
        status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
        latencyMs: isDemoMode ? 38 : null,
        message: isDemoMode ? 'Simulated git sync' : 'Unconfigured',
        lastChecked: isDemoMode ? 'now' : 'never',
        origin: isDemoMode ? 'DEMO' : 'UNAVAILABLE',
      },
      {
        name: 'Backup & Restore Agent',
        status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
        latencyMs: isDemoMode ? 42 : null,
        message: isDemoMode ? 'Simulated snapshot runner' : 'Unconfigured',
        lastChecked: isDemoMode ? 'now' : 'never',
        origin: isDemoMode ? 'DEMO' : 'UNAVAILABLE',
      },
    ],
  };

  sendSuccess(req, res, healthData);
});

// GET /api/v1/dashboard
apiV1Router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await activityRepo.findAll();
    const approvals = await approvalRepo.findPending();

    const running = activities.filter((a) => a.status === ActivityStatus.RUNNING).length;
    const waiting = activities.filter((a) => a.status === ActivityStatus.WAITING_APPROVAL).length;
    const recoverable = activities.filter((a) => a.status === ActivityStatus.RECOVERABLE).length;
    const completed = activities.filter((a) => a.status === ActivityStatus.COMPLETED).length;
    const failed = activities.filter((a) => a.status === ActivityStatus.FAILED).length;

    let dashboardState: DashboardState;

    if (isDemoMode) {
      dashboardState = {
        ...DEMO_DASHBOARD_STATE,
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
    } else {
      dashboardState = {
        schemaVersion: 1,
        systemStatus: {
          cloud: HealthStatus.NOT_CONFIGURED,
          claude: HealthStatus.NOT_CONFIGURED,
          mcp: HealthStatus.NOT_CONFIGURED,
          liteLLM: HealthStatus.NOT_CONFIGURED,
          github: HealthStatus.NOT_CONFIGURED,
          backup: HealthStatus.NOT_CONFIGURED,
          monitoring: HealthStatus.NOT_CONFIGURED,
        },
        serverSummary: {
          cpuPercent: null,
          cpuCores: null,
          cpuLoadAvg: null,
          memoryUsedGb: null,
          memoryTotalGb: null,
          memoryPercent: null,
          diskUsedGb: null,
          diskTotalGb: null,
          diskPercent: null,
          uptimeSeconds: null,
          uptimeFormatted: null,
          osName: null,
          kernelVersion: null,
          origin: 'UNAVAILABLE',
        },
        workSummary: {
          runningActivities: running,
          waitingApprovals: waiting,
          recoverableActivities: recoverable,
          completedActivities: completed,
          failedActivities: failed,
        },
        aiSummary: {
          currentProvider: null,
          currentModel: null,
          todayRequests: null,
          todayEstimatedCost: null,
          weeklyCost: null,
          monthlyCost: null,
          origin: 'UNAVAILABLE',
        },
        recentActivities: activities,
        pendingApprovals: approvals,
      };
    }

    sendSuccess(req, res, dashboardState);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. PROJECTS
// ==========================================

// GET /api/v1/projects
apiV1Router.get('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await projectRepo.findAll();
    sendSuccess(req, res, list);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id
apiV1Router.get('/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proj = await projectRepo.findById(req.params.id);
    if (!proj) {
      return sendError(req, res, 'PROJECT_NOT_FOUND', `Project ${req.params.id} does not exist`, 404);
    }
    sendSuccess(req, res, proj);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects
apiV1Router.post('/projects', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, repository } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(req, res, 'INVALID_PROJECT_NAME', 'Project name is required', 400);
    }

    const id = `proj-${Date.now().toString(36)}`;
    const created = await projectRepo.create({
      id,
      name: name.trim(),
      description: description || 'Created project workspace',
      rootPath: `/workspace/${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      repository: repository || `github.com/user/${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      branch: 'main',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
      activityCount: 0,
      filesCount: 1,
      isGitClean: true,
    });

    filesStore.set(id, [
      {
        id: `f-${Date.now()}`,
        path: 'README.md',
        name: 'README.md',
        isDirectory: false,
        updatedAt: new Date().toISOString(),
        sizeBytes: 80,
        content: `# ${name}\n\nProject workspace initialized.`,
        extension: 'md',
      },
    ]);

    sendSuccess(req, res, created, 201);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. ACTIVITIES (STATE MACHINE & LIFECYCLE)
// ==========================================

// GET /api/v1/activities
apiV1Router.get('/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const list = await activityRepo.findAll(projectId);
    sendSuccess(req, res, list);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/activities/:id
apiV1Router.get('/activities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) {
      return sendError(req, res, 'ACTIVITY_NOT_FOUND', `Activity ${req.params.id} does not exist`, 404);
    }
    sendSuccess(req, res, act);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities
apiV1Router.post('/activities', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, title, description, model, provider } = req.body;
    if (!projectId || !title) {
      return sendError(req, res, 'MISSING_FIELDS', 'projectId and title are required', 400);
    }

    const proj = await projectRepo.findById(projectId);
    if (!proj) {
      return sendError(req, res, 'PROJECT_NOT_FOUND', `Project ${projectId} does not exist`, 404);
    }

    const id = `act-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const created = await activityRepo.create({
      id,
      projectId,
      title: title.trim(),
      description: description || '',
      status: ActivityStatus.DRAFT,
      phase: 'Initial Draft',
      createdAt: now,
      updatedAt: now,
      lastEventSequence: 1,
      lastKnownState: 'Activity draft created. Awaiting execution backend configuration.',
      currentAction: 'Idle in draft state',
      nextAction: 'Configure execution host to start activity',
      blocker: isDemoMode ? null : 'EXECUTION_BACKEND_NOT_CONFIGURED',
      claudeSessionId: null,
      provider: provider || 'Anthropic',
      model: model || 'sonnet',
      gitBranch: null,
      gitBaseCommit: null,
      filesChangedCount: 0,
      testsPassed: 0,
      testsFailed: 0,
      estimatedCost: null,
      durationMs: 0,
      checkpointId: null,
      handoffAvailable: false,
      recoverable: false,
      approvalCount: 0,
    });

    await eventRepo.append({
      activityId: id,
      timestamp: now,
      type: EventType.ACTIVITY_CREATED,
      payload: { title, model: created.model, provider: created.provider },
    });

    sendSuccess(req, res, created, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/continue
apiV1Router.post('/activities/:id/continue', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    if (!isDemoMode) {
      return sendError(
        req,
        res,
        'EXECUTION_BACKEND_NOT_CONFIGURED',
        'Cannot execute activity: Remote execution backend is not configured.',
        400
      );
    }

    assertActivityTransition(act.status, ActivityStatus.RUNNING);

    const { prompt } = req.body;
    const currentAction = prompt
      ? `Executing operator instruction: ${prompt}`
      : 'Continuing execution from last checkpoint';

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.RUNNING,
      currentAction,
      nextAction: 'Evaluating changes in sandbox',
      blocker: null,
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_RESUMED,
      payload: { instruction: prompt || 'User continued session' },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/pause
apiV1Router.post('/activities/:id/pause', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.PAUSED);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.PAUSED,
      currentAction: 'Paused by operator',
      nextAction: 'Await resume signal',
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_PAUSED,
      payload: { pausedBy: req.user?.id || 'operator' },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/stop
apiV1Router.post('/activities/:id/stop', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.CANCELLED);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.CANCELLED,
      currentAction: 'Cancelled by operator',
      nextAction: 'None',
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_INTERRUPTED,
      payload: { reason: 'User requested cancellation' },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/retry
apiV1Router.post('/activities/:id/retry', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.QUEUED);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.QUEUED,
      currentAction: 'Re-queued for execution',
      blocker: isDemoMode ? null : 'EXECUTION_BACKEND_NOT_CONFIGURED',
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_RESUMED,
      payload: { retry: true },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/resume
apiV1Router.post('/activities/:id/resume', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    if (!isDemoMode) {
      return sendError(
        req,
        res,
        'EXECUTION_BACKEND_NOT_CONFIGURED',
        'Cannot resume activity: Remote execution backend is not configured.',
        400
      );
    }

    assertActivityTransition(act.status, ActivityStatus.RUNNING);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.RUNNING,
      currentAction: 'Resumed by operator',
      nextAction: 'Evaluating sandbox state',
      recoverable: false,
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_RECOVERED,
      payload: { message: 'Activity recovered from checkpoint' },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/fork
apiV1Router.post('/activities/:id/fork', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const source = await activityRepo.findById(req.params.id);
    if (!source) return sendError(req, res, 'NOT_FOUND', 'Source activity not found', 404);

    const newId = `act-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const forked = await activityRepo.create({
      ...source,
      id: newId,
      title: `${source.title} (Forked)`,
      status: ActivityStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
      lastEventSequence: 1,
      lastKnownState: `Forked from activity ${source.id}`,
      currentAction: 'Idle in draft state',
      nextAction: 'Configure execution host',
      blocker: isDemoMode ? null : 'EXECUTION_BACKEND_NOT_CONFIGURED',
      claudeSessionId: null,
      checkpointId: null,
    });

    await eventRepo.append({
      activityId: newId,
      timestamp: now,
      type: EventType.SESSION_STARTED,
      payload: { forkedFrom: source.id },
    });

    sendSuccess(req, res, forked, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/rewind (Single canonical route, no duplicate)
apiV1Router.post('/activities/:id/rewind', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkpointId } = req.body;
    if (!checkpointId) {
      return sendError(req, res, 'MISSING_CHECKPOINT_ID', 'checkpointId is required', 400);
    }

    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    const chk = await checkpointRepo.findById(checkpointId);
    if (!chk) return sendError(req, res, 'CHECKPOINT_NOT_FOUND', `Checkpoint ${checkpointId} not found`, 404);

    if (chk.activityId !== act.id) {
      return sendError(req, res, 'CHECKPOINT_ACTIVITY_MISMATCH', `Checkpoint ${checkpointId} belongs to activity ${chk.activityId}, not ${act.id}`, 400);
    }

    if (chk.projectId !== act.projectId) {
      return sendError(req, res, 'CHECKPOINT_PROJECT_MISMATCH', `Checkpoint ${checkpointId} belongs to project ${chk.projectId}, not ${act.projectId}`, 400);
    }

    assertActivityTransition(act.status, ActivityStatus.PAUSED);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.PAUSED,
      checkpointId,
      lastKnownState: `Rewound to checkpoint ${checkpointId} (${chk.description})`,
      currentAction: `Restored workspace to checkpoint snapshot ${checkpointId}`,
      nextAction: 'Review restored files and resume',
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_REWOUND,
      payload: { rewindToCheckpoint: checkpointId, description: chk.description },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. SESSIONS & EVENTS
// ==========================================

// GET /api/v1/sessions
apiV1Router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await sessionRepo.findAll();
    sendSuccess(req, res, sessions);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sessions/:id
apiV1Router.get('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionRepo.findById(req.params.id);
    if (!session) return sendError(req, res, 'NOT_FOUND', 'Session not found', 404);
    sendSuccess(req, res, session);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/sessions/:id/prompt
apiV1Router.post('/sessions/:id/prompt', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionRepo.findById(req.params.id);
    if (!session) return sendError(req, res, 'NOT_FOUND', 'Session not found', 404);

    if (!isDemoMode) {
      return sendError(
        req,
        res,
        'EXECUTION_BACKEND_NOT_CONFIGURED',
        'Claude execution backend is not configured.',
        400
      );
    }

    const { prompt, planMode } = req.body;
    if (!prompt) return sendError(req, res, 'MISSING_PROMPT', 'Prompt text is required', 400);

    const promptEvt = await eventRepo.append({
      activityId: session.activityId,
      timestamp: new Date().toISOString(),
      type: EventType.PROMPT_RECEIVED,
      payload: { prompt, planMode: Boolean(planMode) },
    });

    sendSuccess(req, res, { ack: true, promptEventId: promptEvt.id }, 202);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/activities/:id/events
apiV1Router.get('/activities/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryVal = (req.query.sinceSequence || req.query.since) as string;
    const sinceSeq = parseInt(queryVal, 10) || 0;
    const all = await eventRepo.findByActivityId(req.params.id);
    const filtered = all.filter((e) => e.sequence > sinceSeq).sort((a, b) => a.sequence - b.sequence);
    sendSuccess(req, res, filtered);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/activities/:id/checkpoints
apiV1Router.get('/activities/:id/checkpoints', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkpoints = await checkpointRepo.findByActivityId(req.params.id);
    sendSuccess(req, res, checkpoints);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. APPROVALS (Authoritative Enforcement)
// ==========================================

// GET /api/v1/approvals
apiV1Router.get('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityId = req.query.activityId as string | undefined;
    const list = await approvalRepo.findPending(activityId);
    sendSuccess(req, res, list);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/approvals/:id
apiV1Router.get('/approvals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const found = await approvalRepo.findById(req.params.id);
    if (!found) return sendError(req, res, 'NOT_FOUND', 'Approval not found', 404);
    sendSuccess(req, res, found);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/approvals
apiV1Router.post('/approvals', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, projectId, actionType, title, description, commandOrDiff, parameters } = req.body;
    if (!title || !actionType) {
      return sendError(req, res, 'MISSING_FIELDS', 'actionType and title are required', 400);
    }

    if (activityId) {
      const act = await activityRepo.findById(activityId);
      if (!act) {
        return sendError(req, res, 'ACTIVITY_NOT_FOUND', `Activity ${activityId} does not exist`, 404);
      }
      if (projectId && act.projectId !== projectId) {
        return sendError(req, res, 'CROSS_RESOURCE_MISMATCH', `Activity ${activityId} does not belong to project ${projectId}`, 400);
      }
    }

    if (projectId) {
      const proj = await projectRepo.findById(projectId);
      if (!proj) {
        return sendError(req, res, 'PROJECT_NOT_FOUND', `Project ${projectId} does not exist`, 404);
      }
    }

    // Authoritative Server-side Risk Policy (client cannot lower required riskLevel)
    const policy = CENTRAL_ACTION_POLICIES[actionType as ActionType];
    const authoritativeRisk = policy ? policy.riskLevel : RiskLevel.STRONG_CONFIRM;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const created = await approvalRepo.create({
      id: `appr-${Date.now().toString(36)}`,
      activityId,
      projectId,
      riskLevel: authoritativeRisk,
      actionType,
      title,
      description: description || '',
      commandOrDiff,
      parameters: parameters || {},
      status: ApprovalStatus.PENDING,
      requestedAt: new Date().toISOString(),
      expiresAt,
    });

    sendSuccess(req, res, created, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/approvals/:id/resolve
apiV1Router.post('/approvals/:id/resolve', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status || (status !== ApprovalStatus.APPROVED && status !== ApprovalStatus.REJECTED)) {
      return sendError(req, res, 'INVALID_STATUS', 'Valid resolution status (APPROVED or REJECTED) is required', 400);
    }

    const existing = await approvalRepo.findById(req.params.id);
    if (!existing) {
      return sendError(req, res, 'APPROVAL_NOT_FOUND', 'Approval record does not exist', 404);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      return sendError(req, res, 'APPROVAL_ALREADY_RESOLVED', `Approval is already in status '${existing.status}' and cannot be resolved again.`, 409);
    }

    if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
      return sendError(req, res, 'APPROVAL_EXPIRED', 'Approval has expired and cannot be resolved', 400);
    }

    const resolved = await approvalRepo.resolve(req.params.id, status, req.user?.id || 'operator');
    if (!resolved) {
      return sendError(req, res, 'NOT_FOUND', 'Approval could not be resolved', 404);
    }

    const evt = await eventRepo.append({
      activityId: resolved.activityId || 'system',
      timestamp: new Date().toISOString(),
      type: EventType.APPROVAL_RESOLVED,
      payload: { approvalId: resolved.id, status, actionType: resolved.actionType },
    });

    const act = resolved.activityId ? await activityRepo.findById(resolved.activityId) : null;
    if (act) {
      if (status === ApprovalStatus.APPROVED && act.status === ActivityStatus.WAITING_APPROVAL) {
        await activityRepo.update(act.id, {
          status: ActivityStatus.RUNNING,
          currentAction: `Executing authorized action: ${resolved.actionType}`,
          blocker: null,
          lastEventSequence: evt.sequence,
        });
      } else if (status === ApprovalStatus.REJECTED) {
        await activityRepo.update(act.id, {
          currentAction: `Action aborted: ${resolved.actionType} was rejected`,
          lastEventSequence: evt.sequence,
        });
      }
    }

    sendSuccess(req, res, resolved);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. SAFE FILES API (Strict Path Safety)
// ==========================================

// GET /api/v1/projects/:id/files
apiV1Router.get('/projects/:id/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proj = await projectRepo.findById(req.params.id);
    if (!proj) return sendError(req, res, 'NOT_FOUND', `Project ${req.params.id} not found`, 404);

    const files = filesStore.get(req.params.id) || [];
    sendSuccess(req, res, files);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/projects/:id/files/*
apiV1Router.get('/projects/:id/files/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proj = await projectRepo.findById(req.params.id);
    if (!proj) return sendError(req, res, 'NOT_FOUND', `Project ${req.params.id} not found`, 404);

    const rawPath = req.params[0];
    const safePath = validateRelativeFilePath(rawPath);

    const files = filesStore.get(req.params.id) || [];
    const found = files.find((f) => f.path === safePath);
    if (!found) {
      return sendError(req, res, 'FILE_NOT_FOUND', `File ${safePath} does not exist in project ${req.params.id}`, 404);
    }

    sendSuccess(req, res, found);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/projects/:id/files
apiV1Router.post('/projects/:id/files', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proj = await projectRepo.findById(req.params.id);
    if (!proj) return sendError(req, res, 'NOT_FOUND', `Project ${req.params.id} not found`, 404);

    const { path: rawPath, isDirectory } = req.body;
    const safePath = validateRelativeFilePath(rawPath);

    const files = filesStore.get(req.params.id) || [];
    const name = safePath.split('/').pop() || safePath;

    const newFile: FileItem = {
      id: `f-${Date.now()}`,
      path: safePath,
      name,
      isDirectory: Boolean(isDirectory),
      updatedAt: new Date().toISOString(),
      isModified: true,
      sizeBytes: isDirectory ? 0 : 0,
      content: isDirectory ? undefined : '',
      extension: isDirectory ? undefined : name.split('.').pop(),
    };

    files.push(newFile);
    filesStore.set(req.params.id, files);
    sendSuccess(req, res, newFile, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/projects/:id/files/*
apiV1Router.patch('/projects/:id/files/*', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proj = await projectRepo.findById(req.params.id);
    if (!proj) return sendError(req, res, 'NOT_FOUND', `Project ${req.params.id} not found`, 404);

    const safePath = validateRelativeFilePath(req.params[0]);
    const { content, newPath } = req.body;

    const files = filesStore.get(req.params.id) || [];
    const found = files.find((f) => f.path === safePath);
    if (!found) return sendError(req, res, 'FILE_NOT_FOUND', `File ${safePath} not found`, 404);

    if (content !== undefined) {
      found.content = content;
      found.sizeBytes = content.length;
      found.isModified = true;
    }
    if (newPath) {
      found.path = validateRelativeFilePath(newPath);
      found.name = found.path.split('/').pop() || found.path;
    }
    found.updatedAt = new Date().toISOString();

    sendSuccess(req, res, found);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/projects/:id/files/*
apiV1Router.delete('/projects/:id/files/*', requireRole('OPERATOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const proj = await projectRepo.findById(req.params.id);
    if (!proj) return sendError(req, res, 'NOT_FOUND', `Project ${req.params.id} not found`, 404);

    const safePath = validateRelativeFilePath(req.params[0]);
    const files = filesStore.get(req.params.id) || [];
    const remaining = files.filter((f) => f.path !== safePath && !f.path.startsWith(`${safePath}/`));

    filesStore.set(req.params.id, remaining);
    sendSuccess(req, res, { success: true, deletedPath: safePath });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. TERMINAL (Truthful & Remote-Ready)
// ==========================================

// POST /api/v1/terminal/session
apiV1Router.post('/terminal/session', requireRole('OPERATOR'), (req: Request, res: Response) => {
  if (!isDemoMode) {
    return sendError(
      req,
      res,
      'NOT_CONFIGURED',
      'Remote terminal execution backend is not configured.',
      400
    );
  }

  const sessionId = `term-sess-${Date.now().toString(36)}`;
  const session: TerminalSession = {
    sessionId,
    status: 'CONNECTED',
    pty: '/dev/pts/3 (Simulated)',
    cols: req.body.cols || 80,
    rows: req.body.rows || 24,
    cwd: '/workspace/demo',
    connectedAt: new Date().toISOString(),
  };

  const initialOutputs: TerminalOutput[] = [
    {
      sessionId,
      sequence: 1,
      data: '\x1b[33m[PHASE 1 DEMO]\x1b[0m Remote terminal simulated PTY connected.\r\n',
      timestamp: new Date().toISOString(),
    },
  ];

  terminalSessionsStore.set(sessionId, { session, outputs: initialOutputs });
  sendSuccess(req, res, session, 201);
});

// POST /api/v1/terminal/input
apiV1Router.post('/terminal/input', requireRole('OPERATOR'), (req: Request, res: Response) => {
  const { sessionId, input } = req.body;
  if (!sessionId) return sendError(req, res, 'MISSING_SESSION_ID', 'sessionId is required', 400);

  const entry = terminalSessionsStore.get(sessionId);
  if (!entry) {
    if (!isDemoMode) {
      return sendError(req, res, 'NOT_CONFIGURED', 'Remote terminal is not configured', 400);
    }
  } else {
    const nextSeq = entry.outputs.length + 1;
    entry.outputs.push({
      sessionId,
      sequence: nextSeq,
      data: `$ ${input}\r\n[simulated command output]\r\n`,
      timestamp: new Date().toISOString(),
    });
  }

  sendSuccess(req, res, { acknowledged: true });
});

// GET /api/v1/terminal/:sessionId/output
apiV1Router.get('/terminal/:sessionId/output', (req: Request, res: Response) => {
  const entry = terminalSessionsStore.get(req.params.sessionId);
  const sinceSeq = parseInt(req.query.since as string, 10) || 0;

  if (!entry) {
    return sendSuccess(req, res, []);
  }

  const filtered = entry.outputs.filter((o) => o.sequence > sinceSeq);
  sendSuccess(req, res, filtered);
});

// POST /api/v1/terminal/:sessionId/resize
apiV1Router.post('/terminal/:sessionId/resize', requireRole('OPERATOR'), (req: Request, res: Response) => {
  const { cols, rows } = req.body;
  sendSuccess(req, res, { cols: cols || 80, rows: rows || 24 });
});

// POST /api/v1/terminal/:sessionId/close
apiV1Router.post('/terminal/:sessionId/close', requireRole('OPERATOR'), (req: Request, res: Response) => {
  terminalSessionsStore.delete(req.params.sessionId);
  sendSuccess(req, res, { closed: true });
});

// ==========================================
// 8. GITHUB, MCP, MODELS, MONITORING, BACKUPS, JOBS, ADMIN
// ==========================================

// GitHub
apiV1Router.get('/github/status', (req: Request, res: Response) => {
  sendSuccess(req, res, githubStatusStore);
});

apiV1Router.post('/github/sync', requireRole('OPERATOR'), (req: Request, res: Response) => {
  if (!isDemoMode) {
    return sendError(req, res, 'NOT_CONFIGURED', 'GitHub integration is not configured', 400);
  }
  sendSuccess(req, res, { synced: true, latestCommitSha: '9f83a21' });
});

// MCP
apiV1Router.get('/mcp', (req: Request, res: Response) => {
  sendSuccess(req, res, mcpServersStore);
});

apiV1Router.post('/mcp', requireRole('OWNER'), (req: Request, res: Response) => {
  const { name, transport, command, description } = req.body;
  const newServer: McpServerItem = {
    schemaVersion: 1,
    id: `mcp-${Date.now().toString(36)}`,
    name: name || 'custom-mcp-server',
    transport: transport === 'legacy-sse' ? 'legacy-sse' : transport === 'streamable-http' ? 'streamable-http' : 'stdio',
    status: isDemoMode ? HealthStatus.HEALTHY : HealthStatus.NOT_CONFIGURED,
    version: '1.0.0',
    enabled: true,
    health: isDemoMode ? 'OK' : 'NOT_CONFIGURED',
    toolsCount: 0,
    lastError: null,
    command: command || '',
    description: description || 'Configured MCP server',
    origin: isDemoMode ? 'DEMO' : 'LIVE',
  };
  mcpServersStore.push(newServer);
  sendSuccess(req, res, newServer, 201);
});

apiV1Router.post('/mcp/:id/toggle', requireRole('OPERATOR'), (req: Request, res: Response) => {
  const target = mcpServersStore.find((s) => s.id === req.params.id);
  if (!target) return sendError(req, res, 'NOT_FOUND', 'MCP server not found', 404);

  const enabled = req.body.enabled ?? !target.enabled;
  target.enabled = enabled;
  sendSuccess(req, res, target);
});

apiV1Router.post('/mcp/:id/restart', requireRole('OPERATOR'), (req: Request, res: Response) => {
  const target = mcpServersStore.find((s) => s.id === req.params.id);
  if (!target) return sendError(req, res, 'NOT_FOUND', 'MCP server not found', 404);

  target.lastError = null;
  sendSuccess(req, res, target);
});

// Models & Routing
apiV1Router.get('/models', (req: Request, res: Response) => {
  sendSuccess(req, res, {
    profiles: VERIFIED_REFERENCE_MODELS,
    routingPolicies: routingPoliciesStore,
  });
});

apiV1Router.get('/models/routing', (req: Request, res: Response) => {
  sendSuccess(req, res, routingPoliciesStore);
});

apiV1Router.patch('/models/routing/:id', requireRole('OPERATOR'), (req: Request, res: Response) => {
  const pol = routingPoliciesStore.find((p) => p.id === req.params.id);
  if (!pol) return sendError(req, res, 'NOT_FOUND', 'Routing policy not found', 404);

  const { taskComplexity, targetProvider, targetModel, requiresApproval, description } = req.body;
  if (taskComplexity !== undefined) pol.taskComplexity = taskComplexity;
  if (targetProvider !== undefined) pol.targetProvider = targetProvider;
  if (targetModel !== undefined) pol.targetModel = targetModel;
  if (requiresApproval !== undefined) pol.requiresApproval = Boolean(requiresApproval);
  if (description !== undefined) pol.description = description;

  sendSuccess(req, res, pol);
});

// Jobs
apiV1Router.get('/jobs', (req: Request, res: Response) => {
  sendSuccess(req, res, jobsStore);
});

apiV1Router.post('/jobs', requireRole('OPERATOR'), (req: Request, res: Response) => {
  if (!isDemoMode) {
    return sendError(req, res, 'NOT_CONFIGURED', 'Execution host is not configured to run jobs', 400);
  }

  const { type, title, command } = req.body;
  const newJob: BackgroundJob = {
    schemaVersion: 1,
    id: `job-${Date.now().toString().slice(-4)}`,
    type: type || 'TEST',
    title: title || 'Simulated Host Job',
    status: 'RUNNING',
    progressPercent: 10,
    startedAt: new Date().toISOString(),
    durationMs: 500,
    command: command || 'workstation-runner --task test',
    origin: 'DEMO',
  };
  jobsStore.unshift(newJob);
  sendSuccess(req, res, newJob, 201);
});

apiV1Router.post('/jobs/:id/cancel', requireRole('OPERATOR'), (req: Request, res: Response) => {
  const job = jobsStore.find((j) => j.id === req.params.id);
  if (!job) {
    return sendError(req, res, 'NOT_FOUND', `Job ${req.params.id} not found`, 404);
  }
  job.status = 'CANCELLED';
  job.cancelledAt = new Date().toISOString();
  sendSuccess(req, res, { cancelled: true, job });
});

// Monitoring
apiV1Router.get('/monitoring', (req: Request, res: Response) => {
  if (isDemoMode) {
    return sendSuccess(req, res, {
      resources: {
        cpuPercent: 28.4,
        cpuCores: 4,
        cpuLoadAvg: [1.12, 0.94, 0.81],
        memoryUsedGb: 6.8,
        memoryTotalGb: 24.0,
        memoryPercent: 28.3,
        diskUsedGb: 44.2,
        diskTotalGb: 200.0,
        diskPercent: 22.1,
        uptimeSeconds: 1248920,
        uptimeFormatted: '14 days, 11 hours',
        osName: 'Oracle Linux 9.4 (ARM)',
        kernelVersion: '5.15.0',
        origin: 'DEMO',
      },
      services: [
        { name: 'Simulated Host', status: HealthStatus.HEALTHY, latencyMs: 14, lastChecked: 'now', origin: 'DEMO' },
      ],
    });
  }

  sendSuccess(req, res, {
    resources: {
      cpuPercent: null,
      cpuCores: null,
      cpuLoadAvg: null,
      memoryUsedGb: null,
      memoryTotalGb: null,
      memoryPercent: null,
      diskUsedGb: null,
      diskTotalGb: null,
      diskPercent: null,
      uptimeSeconds: null,
      uptimeFormatted: null,
      osName: null,
      kernelVersion: null,
      origin: 'UNAVAILABLE',
    },
    services: [
      { name: 'Control Plane Server', status: HealthStatus.HEALTHY, latencyMs: 1, lastChecked: 'now', origin: 'LIVE' },
      { name: 'Remote Workstation Host', status: HealthStatus.NOT_CONFIGURED, latencyMs: null, message: 'Unconfigured', lastChecked: 'never', origin: 'UNAVAILABLE' },
    ],
  });
});

// Backups
apiV1Router.get('/backups', (req: Request, res: Response) => {
  sendSuccess(req, res, backupStatusStore);
});

apiV1Router.post('/backups', requireRole('OPERATOR'), (req: Request, res: Response) => {
  if (!isDemoMode) {
    return sendError(req, res, 'NOT_CONFIGURED', 'Backup system is not configured', 400);
  }
  sendSuccess(req, res, { jobId: `job-bk-${Date.now()}`, status: 'STARTED' });
});

apiV1Router.post('/backups/verify', requireRole('OPERATOR'), (req: Request, res: Response) => {
  if (!isDemoMode) {
    return sendError(req, res, 'NOT_CONFIGURED', 'Backup system is not configured', 400);
  }
  sendSuccess(req, res, { verified: true, message: 'Phase 1 simulated backup verification passed.' });
});

apiV1Router.post('/backups/restore-test', requireRole('OWNER'), (req: Request, res: Response) => {
  if (!isDemoMode) {
    return sendError(req, res, 'NOT_CONFIGURED', 'Backup system is not configured', 400);
  }
  sendSuccess(req, res, { restored: true, message: 'Phase 1 simulated restore test passed.' });
});

// Admin (Privileged)
apiV1Router.post('/admin/reboot', requireRole('OWNER'), (req: Request, res: Response) => {
  sendSuccess(req, res, {
    scheduled: true,
    message: '[PHASE 1 PREVIEW] Remote host VM reboot simulated.',
  });
});

apiV1Router.post('/admin/services/:name/restart', requireRole('OPERATOR'), (req: Request, res: Response) => {
  sendSuccess(req, res, { restarted: true, service: req.params.name });
});

apiV1Router.post('/admin/diagnostic', (req: Request, res: Response) => {
  sendSuccess(req, res, {
    status: 'HEALTHY',
    reports: [
      `Control Plane HTTP Gateway: Operational (${process.uptime().toFixed(1)}s uptime)`,
      `Phase 1 In-Memory Persistence: ${isDemoMode ? 'Demo Mode Active' : 'Empty Mode Active'}`,
      'API Error Boundary: Operational with typed sanitization',
    ],
  });
});
