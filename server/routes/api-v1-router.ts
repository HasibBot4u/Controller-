import { Router, Request, Response, NextFunction } from 'express';
import {
  DEMO_DASHBOARD_STATE,
  DEMO_FILES,
  DEMO_MCP_SERVERS,
  DEMO_MODEL_PROFILES,
  DEMO_ROUTING_POLICIES,
  DEMO_BACKUP_STATUS,
  DEMO_GITHUB_STATUS,
  DEMO_JOBS,
  DEMO_RESOURCE_SUMMARY,
  DEMO_SYSTEM_SERVICES,
} from '../adapters/mock/mock-data.ts';
import { ActivityStatus, ApprovalStatus, EventType, RiskLevel, HealthStatus } from '../../src/domain/enums/index.ts';
import { assertActivityTransition } from '../../src/domain/state-machine/activity-state-machine.ts';
import { validateRelativeFilePath, FileSafetyError } from '../validation/path-validator.ts';
import { requireRole } from '../middleware/auth.ts';
import { MemoryProjectRepository } from '../repositories/memory/project-repository.ts';
import { MemoryActivityRepository } from '../repositories/memory/activity-repository.ts';
import { MemoryEventRepository } from '../repositories/memory/event-repository.ts';
import { MemoryCheckpointRepository } from '../repositories/memory/checkpoint-repository.ts';
import { MemoryApprovalRepository } from '../repositories/memory/approval-repository.ts';
import { MemorySessionRepository } from '../repositories/memory/session-repository.ts';
import { FileItem, BackgroundJob, McpServerItem } from '../../src/domain/models/index.ts';

export const apiV1Router = Router();

// Server-side in-memory repository singletons (Source of truth for Phase 1)
const projectRepo = new MemoryProjectRepository();
const activityRepo = new MemoryActivityRepository();
const eventRepo = new MemoryEventRepository();
const checkpointRepo = new MemoryCheckpointRepository();
const approvalRepo = new MemoryApprovalRepository();
const sessionRepo = new MemorySessionRepository();

// Ephemeral server collections for files, MCP, models, jobs, backups, GitHub
const filesStore = new Map<string, FileItem[]>();
Object.entries(DEMO_FILES).forEach(([projId, list]) => {
  filesStore.set(projId, list.map((f) => ({ ...f })));
});

let mcpServersStore = DEMO_MCP_SERVERS.map((s) => ({ ...s }));
let routingPoliciesStore = DEMO_ROUTING_POLICIES.map((p) => ({ ...p }));
let jobsStore: BackgroundJob[] = DEMO_JOBS.map((j) => ({ ...j }));
let backupStatusStore = { ...DEMO_BACKUP_STATUS };
let githubStatusStore = { ...DEMO_GITHUB_STATUS };

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
// 1. HEALTH & DASHBOARD
// ==========================================

// GET /api/v1/health
apiV1Router.get('/health', (req: Request, res: Response) => {
  sendSuccess(res.req, res, {
    status: 'HEALTHY',
    version: '1.0.0-phase1-preview',
    persistence: 'IN-MEMORY',
    uptime: DEMO_RESOURCE_SUMMARY.uptimeSeconds,
    services: DEMO_SYSTEM_SERVICES,
  });
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

    sendSuccess(req, res, {
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
    });
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
apiV1Router.post('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, repository } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(req, res, 'INVALID_PROJECT_NAME', 'Project name is required', 400);
    }

    const id = `proj-${Date.now().toString(36)}`;
    const created = await projectRepo.create({
      id,
      name: name.trim(),
      description: description || '[PHASE 1 PREVIEW] Created project workspace',
      rootPath: `/home/demo/workspace/${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
      repository: repository || `github.com/demo/${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`,
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
        content: `# ${name}\n\nPhase 1 mock workspace project.`,
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
apiV1Router.post('/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, title, description, model, provider } = req.body;

    // 1. Validate project
    if (!projectId) {
      return sendError(req, res, 'MISSING_PROJECT_ID', 'Project ID is required', 400);
    }
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return sendError(req, res, 'PROJECT_NOT_FOUND', `Project ${projectId} not found`, 404);
    }

    // 2. Validate title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendError(req, res, 'INVALID_TITLE', 'Activity title is required and cannot be empty', 400);
    }

    const activityId = `act-${Date.now().toString().slice(-4)}`;
    const sessionId = `sess-${Date.now().toString(36)}`;
    const chosenModel = model || 'claude-3-7-sonnet';
    const chosenProvider = provider || 'Anthropic (Mock)';

    // 3. Create Activity
    const newActivity = await activityRepo.create({
      id: activityId,
      projectId,
      title: title.trim(),
      description: description || '[PHASE 1 PREVIEW] Remote activity dispatch simulated',
      status: ActivityStatus.RUNNING,
      phase: 'Activity scheduled in Phase 1 demo sandbox',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEventSequence: 1,
      lastKnownState: 'Initial session dispatch and workspace lock simulated',
      currentAction: 'Waiting for prompt execution',
      nextAction: 'Analyzing repository structure',
      blocker: null,
      claudeSessionId: sessionId,
      provider: chosenProvider,
      model: chosenModel,
      gitBranch: `feat/${title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 20)}`,
      gitBaseCommit: '9f83a21',
      filesChangedCount: 0,
      testsPassed: 0,
      testsFailed: 0,
      estimatedCost: 0.01,
      durationMs: 100,
      checkpointId: null,
      handoffAvailable: false,
      recoverable: true,
      approvalCount: 0,
    });

    // 4. Create Session
    await sessionRepo.create({
      id: sessionId,
      activityId,
      projectId,
      provider: chosenProvider,
      model: chosenModel,
      status: 'STREAMING',
      createdAt: new Date().toISOString(),
      tokensIn: 500,
      tokensOut: 120,
      cost: 0.01,
      planMode: true,
      approvalMode: 'STANDARD',
      contextUsagePercent: 1.2,
    });

    // 5. Append SESSION_STARTED event
    const event = await eventRepo.append({
      id: `evt-${Date.now()}-1`,
      activityId,
      timestamp: new Date().toISOString(),
      type: EventType.SESSION_STARTED,
      payload: {
        provider: chosenProvider,
        model: chosenModel,
        title: title.trim(),
        runtime: 'Phase 1 Mock Server Session',
      },
    });

    // 6. Update lastEventSequence
    await activityRepo.update(activityId, { lastEventSequence: event.sequence });
    newActivity.lastEventSequence = event.sequence;

    // Increment project activity count
    await projectRepo.update(projectId, { activityCount: project.activityCount + 1 });

    sendSuccess(req, res, newActivity, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/continue
apiV1Router.post('/activities/:id/continue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.RUNNING);

    const prompt = req.body?.prompt;
    const currentAction = prompt
      ? `Processing instruction: "${prompt.slice(0, 35)}..."`
      : 'Continuing execution from last checkpoint';

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.RUNNING,
      currentAction,
      nextAction: 'Evaluating changes and executing test harness',
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
apiV1Router.post('/activities/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
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
// Item 6: "Stop" does NOT automatically mean "Completed".
// It gracefully transitions to COMPLETED if active, or verifies valid transition.
apiV1Router.post('/activities/:id/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.COMPLETED);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.COMPLETED,
      currentAction: 'Cleanly terminated by operator',
      nextAction: 'Archived',
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_COMPLETED,
      payload: { reason: 'User requested stop and cleanup' },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/retry
apiV1Router.post('/activities/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.QUEUED);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.QUEUED,
      currentAction: 'Retrying failed step in fresh sandbox',
      blocker: null,
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
apiV1Router.post('/activities/:id/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    assertActivityTransition(act.status, ActivityStatus.RUNNING);

    const updated = await activityRepo.update(act.id, {
      status: ActivityStatus.RUNNING,
      currentAction: 'Resumed remote agent daemon execution',
      blocker: null,
    });

    const evt = await eventRepo.append({
      activityId: act.id,
      timestamp: new Date().toISOString(),
      type: EventType.ACTIVITY_RECOVERED,
      payload: { message: 'Recovered session from server state' },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/fork
// Item 14: Creates fork, returns new Activity, and associates new session and initial event.
apiV1Router.post('/activities/:id/fork', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parent = await activityRepo.findById(req.params.id);
    if (!parent) return sendError(req, res, 'NOT_FOUND', 'Parent activity not found', 404);

    const forkId = `act-${Date.now().toString().slice(-4)}`;
    const forkSessionId = `sess-${Date.now().toString(36)}`;

    const forked = await activityRepo.create({
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
      claudeSessionId: forkSessionId,
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

    await sessionRepo.create({
      id: forkSessionId,
      activityId: forkId,
      projectId: parent.projectId,
      provider: parent.provider,
      model: parent.model,
      status: 'STREAMING',
      createdAt: new Date().toISOString(),
      tokensIn: 800,
      tokensOut: 200,
      cost: 0.02,
      planMode: true,
      approvalMode: 'STANDARD',
      contextUsagePercent: 2.1,
    });

    const evt = await eventRepo.append({
      activityId: forkId,
      timestamp: new Date().toISOString(),
      type: EventType.SESSION_STARTED,
      payload: { forkedFrom: parent.id, branch: `${parent.gitBranch}-fork` },
    });
    await activityRepo.update(forkId, { lastEventSequence: evt.sequence });
    forked.lastEventSequence = evt.sequence;

    sendSuccess(req, res, forked, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities/:id/rewind
// Item 13: Structured operation rewind to checkpoint
apiV1Router.post('/api/v1/activities/:id/rewind', async (req: Request, res: Response, next: NextFunction) => {
  // mapped through router
});
apiV1Router.post('/activities/:id/rewind', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkpointId } = req.body;
    if (!checkpointId) {
      return sendError(req, res, 'MISSING_CHECKPOINT_ID', 'checkpointId is required', 400);
    }

    const act = await activityRepo.findById(req.params.id);
    if (!act) return sendError(req, res, 'NOT_FOUND', 'Activity not found', 404);

    const chk = await checkpointRepo.findById(checkpointId);
    if (!chk) return sendError(req, res, 'CHECKPOINT_NOT_FOUND', `Checkpoint ${checkpointId} not found`, 404);

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
      type: EventType.CHECKPOINT_CREATED,
      payload: { rewindToCheckpoint: checkpointId, description: chk.description },
    });
    await activityRepo.update(act.id, { lastEventSequence: evt.sequence });
    if (updated) updated.lastEventSequence = evt.sequence;

    sendSuccess(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/activities/:id/events
// Item 8: Safe event polling using sinceSequence
apiV1Router.get('/activities/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sinceSeqStr = req.query.sinceSequence as string | undefined;
    const sinceSequence = sinceSeqStr ? parseInt(sinceSeqStr, 10) : 0;
    const events = await eventRepo.getEventsSince(req.params.id, isNaN(sinceSequence) ? 0 : sinceSequence);
    sendSuccess(req, res, events);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/activities/:id/checkpoints
apiV1Router.get('/activities/:id/checkpoints', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await checkpointRepo.findByActivityId(req.params.id);
    sendSuccess(req, res, list);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. SESSIONS & PROMPT EXECUTION (Item 10 & 11)
// ==========================================

// GET /api/v1/sessions
apiV1Router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await sessionRepo.findAll();
    sendSuccess(req, res, list);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sessions/:id
apiV1Router.get('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await sessionRepo.findById(req.params.id);
    if (!s) return sendError(req, res, 'NOT_FOUND', 'Session not found', 404);
    sendSuccess(req, res, s);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/sessions/:id/prompt
// Item 10: Server-side mock execution pipeline
apiV1Router.post('/sessions/:id/prompt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, planMode } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return sendError(req, res, 'EMPTY_PROMPT', 'Prompt content cannot be empty', 400);
    }

    const session = await sessionRepo.findById(req.params.id);
    if (!session) return sendError(req, res, 'NOT_FOUND', 'Session not found', 404);

    // Append PROMPT_RECEIVED event
    const promptEvt = await eventRepo.append({
      activityId: session.activityId,
      timestamp: new Date().toISOString(),
      type: EventType.PROMPT_RECEIVED,
      payload: { prompt: prompt.trim(), planMode: Boolean(planMode) },
    });

    // Update tokens and activity action
    await sessionRepo.update(session.id, {
      tokensIn: session.tokensIn + prompt.length * 2,
      tokensOut: session.tokensOut + 180,
      cost: session.cost + 0.005,
    });

    await activityRepo.update(session.activityId, {
      status: ActivityStatus.RUNNING,
      currentAction: `Synthesizing prompt: "${prompt.slice(0, 30)}..."`,
      lastEventSequence: promptEvt.sequence,
    });

    // Deterministically simulate remote execution steps on server
    setTimeout(async () => {
      try {
        await eventRepo.append({
          activityId: session.activityId,
          timestamp: new Date().toISOString(),
          type: EventType.ASSISTANT_MESSAGE,
          payload: { content: `Acknowledged instruction: "${prompt.trim()}". Simulating execution plan on remote host.` },
        });

        await eventRepo.append({
          activityId: session.activityId,
          timestamp: new Date().toISOString(),
          type: EventType.TOOL_STARTED,
          payload: { tool: 'InspectWorkspace', target: session.projectId },
        });

        await eventRepo.append({
          activityId: session.activityId,
          timestamp: new Date().toISOString(),
          type: EventType.TOOL_COMPLETED,
          payload: { tool: 'InspectWorkspace', status: 'SUCCESS' },
        });

        const act = await activityRepo.findById(session.activityId);
        if (act && act.status === ActivityStatus.RUNNING) {
          const latestSeq = await eventRepo.getLatestSequence(act.id);
          await activityRepo.update(act.id, {
            currentAction: 'Idle (Mock execution step completed)',
            nextAction: 'Ready for operator instructions',
            lastEventSequence: latestSeq,
          });
        }
      } catch (e) {
        console.error('Async mock execution error:', e);
      }
    }, 100);

    sendSuccess(req, res, { ack: true, promptEventId: promptEvt.id, sequence: promptEvt.sequence });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. APPROVALS API & ENFORCEMENT (Item 15 & 16)
// ==========================================

// GET /api/v1/approvals
apiV1Router.get('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityId = req.query.activityId as string | undefined;
    const list = await approvalRepo.findAll(activityId);
    sendSuccess(req, res, list);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/approvals/:id
apiV1Router.get('/approvals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const a = await approvalRepo.findById(req.params.id);
    if (!a) return sendError(req, res, 'NOT_FOUND', 'Approval not found', 404);
    sendSuccess(req, res, a);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/approvals
apiV1Router.post('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, projectId, riskLevel, actionType, title, description, commandOrDiff, parameters } = req.body;
    if (!title || !actionType) {
      return sendError(req, res, 'INVALID_APPROVAL', 'Title and actionType are required', 400);
    }

    const created = await approvalRepo.create({
      id: `appr-${Date.now().toString().slice(-4)}`,
      activityId: activityId || 'act-generic',
      projectId: projectId || 'proj-01',
      riskLevel: riskLevel || RiskLevel.CONFIRM,
      actionType,
      title,
      description: description || '',
      commandOrDiff,
      parameters: parameters || {},
      status: ApprovalStatus.PENDING,
      requestedAt: new Date().toISOString(),
    });

    if (activityId) {
      await eventRepo.append({
        activityId,
        timestamp: new Date().toISOString(),
        type: EventType.APPROVAL_REQUESTED,
        payload: { approvalId: created.id, title, riskLevel: created.riskLevel },
      });
    }

    sendSuccess(req, res, created, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/approvals/:id/resolve
// Item 16: Resolves approval server-side and automatically unblocks activity if approved
apiV1Router.post('/approvals/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (status !== ApprovalStatus.APPROVED && status !== ApprovalStatus.REJECTED) {
      return sendError(req, res, 'INVALID_STATUS', 'Status must be APPROVED or REJECTED', 400);
    }

    const existing = await approvalRepo.findById(req.params.id);
    if (!existing) return sendError(req, res, 'NOT_FOUND', 'Approval not found', 404);
    if (existing.status !== ApprovalStatus.PENDING) {
      return sendError(req, res, 'ALREADY_RESOLVED', `Approval is already ${existing.status}`, 409);
    }

    const resolved = await approvalRepo.resolve(
      req.params.id,
      status,
      req.user?.id || 'demo-operator'
    );

    if (resolved?.activityId) {
      const evt = await eventRepo.append({
        activityId: resolved.activityId,
        timestamp: new Date().toISOString(),
        type: EventType.APPROVAL_RESOLVED,
        payload: { approvalId: resolved.id, status, actionType: resolved.actionType },
      });

      const act = await activityRepo.findById(resolved.activityId);
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
            currentAction: `Action aborted: ${resolved.actionType} was rejected by operator`,
            lastEventSequence: evt.sequence,
          });
        }
      }
    }

    sendSuccess(req, res, resolved);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. SAFE FILES API (Item 20)
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
apiV1Router.post('/projects/:id/files', async (req: Request, res: Response, next: NextFunction) => {
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
apiV1Router.patch('/projects/:id/files/*', async (req: Request, res: Response, next: NextFunction) => {
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
apiV1Router.delete('/projects/:id/files/*', async (req: Request, res: Response, next: NextFunction) => {
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
// 7. GITHUB, MCP, MODELS, MONITORING, BACKUPS, JOBS, ADMIN
// ==========================================

// GitHub
apiV1Router.get('/github/status', (req: Request, res: Response) => {
  sendSuccess(req, res, githubStatusStore);
});

apiV1Router.post('/github/sync', (req: Request, res: Response) => {
  sendSuccess(req, res, { synced: true, latestCommitSha: '9f83a21' });
});

// MCP
apiV1Router.get('/mcp', (req: Request, res: Response) => {
  sendSuccess(req, res, mcpServersStore);
});

apiV1Router.post('/mcp', (req: Request, res: Response) => {
  const { name, transport, command, description } = req.body;
  const newServer: McpServerItem = {
    schemaVersion: 1,
    id: `mcp-${Date.now().toString(36)}`,
    name: name || 'custom-mcp-server',
    transport: transport || 'stdio',
    status: HealthStatus.HEALTHY,
    version: '1.0.0',
    enabled: true,
    health: 'OK',
    toolsCount: 0,
    lastError: null,
    command: command || '',
    description: description || '[PHASE 1 MOCK] Custom MCP server',
  };
  mcpServersStore.push(newServer);
  sendSuccess(req, res, newServer, 201);
});

apiV1Router.post('/mcp/:id/toggle', (req: Request, res: Response) => {
  const target = mcpServersStore.find((s) => s.id === req.params.id);
  if (!target) return sendError(req, res, 'NOT_FOUND', 'MCP server not found', 404);

  const enabled = req.body.enabled ?? !target.enabled;
  target.enabled = enabled;
  target.status = enabled ? HealthStatus.HEALTHY : HealthStatus.UNKNOWN;
  sendSuccess(req, res, target);
});

apiV1Router.post('/mcp/:id/restart', (req: Request, res: Response) => {
  const target = mcpServersStore.find((s) => s.id === req.params.id);
  if (!target) return sendError(req, res, 'NOT_FOUND', 'MCP server not found', 404);

  target.status = HealthStatus.HEALTHY;
  target.health = 'OK';
  target.lastError = null;
  sendSuccess(req, res, target);
});

// Models & Routing
apiV1Router.get('/models', (req: Request, res: Response) => {
  sendSuccess(req, res, {
    profiles: DEMO_MODEL_PROFILES,
    routingPolicies: routingPoliciesStore,
  });
});

apiV1Router.get('/models/routing', (req: Request, res: Response) => {
  sendSuccess(req, res, routingPoliciesStore);
});

apiV1Router.patch('/models/routing/:id', (req: Request, res: Response) => {
  const pol = routingPoliciesStore.find((p) => p.id === req.params.id);
  if (!pol) return sendError(req, res, 'NOT_FOUND', 'Routing policy not found', 404);

  Object.assign(pol, req.body);
  sendSuccess(req, res, pol);
});

// Jobs
apiV1Router.get('/jobs', (req: Request, res: Response) => {
  sendSuccess(req, res, jobsStore);
});

apiV1Router.post('/jobs', (req: Request, res: Response) => {
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
  };
  jobsStore.unshift(newJob);
  sendSuccess(req, res, newJob, 201);
});

apiV1Router.post('/jobs/:id/cancel', (req: Request, res: Response) => {
  const job = jobsStore.find((j) => j.id === req.params.id);
  if (job) job.status = 'FAILED';
  sendSuccess(req, res, { cancelled: true });
});

// Monitoring
apiV1Router.get('/monitoring', (req: Request, res: Response) => {
  sendSuccess(req, res, {
    resources: DEMO_RESOURCE_SUMMARY,
    services: DEMO_SYSTEM_SERVICES,
  });
});

// Backups
apiV1Router.get('/backups', (req: Request, res: Response) => {
  sendSuccess(req, res, backupStatusStore);
});

apiV1Router.post('/backups', (req: Request, res: Response) => {
  sendSuccess(req, res, { jobId: `job-bk-${Date.now()}`, status: 'STARTED' });
});

apiV1Router.post('/backups/verify', (req: Request, res: Response) => {
  sendSuccess(req, res, { verified: true, message: 'All mock backup blocks verified against sha256 checksums.' });
});

apiV1Router.post('/backups/restore-test', (req: Request, res: Response) => {
  sendSuccess(req, res, { restored: true, message: 'Synthetic sandbox restore test passed in 1.4s.' });
});

// Admin (Privileged)
apiV1Router.post('/admin/reboot', requireRole('OWNER'), (req: Request, res: Response) => {
  sendSuccess(req, res, {
    scheduled: true,
    message: '[PHASE 1 PREVIEW] Remote host VM reboot simulated. Offline duration: ~15s.',
  });
});

apiV1Router.post('/admin/services/:name/restart', requireRole('OWNER', 'OPERATOR'), (req: Request, res: Response) => {
  sendSuccess(req, res, { restarted: true, service: req.params.name });
});

apiV1Router.post('/admin/diagnostic', (req: Request, res: Response) => {
  sendSuccess(req, res, {
    status: 'HEALTHY',
    reports: [
      'Phase 1 In-Memory Persistence: Healthy (6 active repositories)',
      'Event Journal Sequence: Continuous and monotonic',
      'Memory Cgroup Sandbox: Simulated isolation OK',
      'API Error Boundary: Operational with typed sanitization',
    ],
  });
});
