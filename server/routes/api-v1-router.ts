import { Router, Request, Response } from 'express';
import {
  INITIAL_DASHBOARD_STATE,
  INITIAL_PROJECTS,
  INITIAL_ACTIVITIES,
  INITIAL_EVENTS,
  INITIAL_FILE_ITEMS,
  INITIAL_MCP_SERVERS,
  INITIAL_MODEL_PROFILES,
  INITIAL_ROUTING_POLICIES,
  INITIAL_BACKUP_STATUS,
  INITIAL_GITHUB_STATUS,
  INITIAL_JOBS,
  INITIAL_RESOURCE_SUMMARY,
  INITIAL_SYSTEM_SERVICES,
  INITIAL_SESSIONS,
  INITIAL_CHECKPOINTS
} from '../../src/adapters/mock/mock-data.ts';
import { ActivityStatus, ApprovalStatus } from '../../src/domain/enums/index.ts';

export const apiV1Router = Router();

function sendJson<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: `srv-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
  });
}

// In-memory state for the Express dev server process
let activitiesState = [...INITIAL_ACTIVITIES];
let projectsState = [...INITIAL_PROJECTS];
let eventsState = [...INITIAL_EVENTS];
let filesState = { ...INITIAL_FILE_ITEMS };

// GET /api/v1/health
apiV1Router.get('/health', (req: Request, res: Response) => {
  sendJson(res, {
    status: 'HEALTHY',
    version: '1.0.0-phase1',
    uptime: INITIAL_RESOURCE_SUMMARY.uptimeSeconds,
    services: INITIAL_SYSTEM_SERVICES,
  });
});

// GET /api/v1/dashboard
apiV1Router.get('/dashboard', (req: Request, res: Response) => {
  const running = activitiesState.filter((a) => a.status === ActivityStatus.RUNNING).length;
  const waiting = activitiesState.filter((a) => a.status === ActivityStatus.WAITING_APPROVAL).length;
  const recoverable = activitiesState.filter((a) => a.status === ActivityStatus.RECOVERABLE).length;
  const completed = activitiesState.filter((a) => a.status === ActivityStatus.COMPLETED).length;
  const failed = activitiesState.filter((a) => a.status === ActivityStatus.FAILED).length;

  sendJson(res, {
    ...INITIAL_DASHBOARD_STATE,
    recentActivities: activitiesState,
    workSummary: {
      runningActivities: running,
      waitingApprovals: waiting,
      recoverableActivities: recoverable,
      completedActivities: completed,
      failedActivities: failed,
    },
  });
});

// GET /api/v1/projects
apiV1Router.get('/projects', (req: Request, res: Response) => {
  sendJson(res, projectsState);
});

// GET /api/v1/activities
apiV1Router.get('/activities', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  if (projectId) {
    return sendJson(res, activitiesState.filter((a) => a.projectId === projectId));
  }
  sendJson(res, activitiesState);
});

// GET /api/v1/activities/:id
apiV1Router.get('/activities/:id', (req: Request, res: Response) => {
  const item = activitiesState.find((a) => a.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Activity not found' });
  }
  sendJson(res, item);
});

// GET /api/v1/activities/:id/events
apiV1Router.get('/activities/:id/events', (req: Request, res: Response) => {
  const activityEvents = eventsState.filter((e) => e.activityId === req.params.id);
  sendJson(res, activityEvents);
});

// POST /api/v1/activities
apiV1Router.post('/activities', (req: Request, res: Response) => {
  const body = req.body;
  const newActivity = {
    schemaVersion: 1,
    id: `act-${Date.now().toString().slice(-4)}`,
    projectId: body.projectId || 'proj-01',
    title: body.title || 'New Remote Activity',
    description: body.description || '',
    status: ActivityStatus.RUNNING,
    phase: 'Remote agent scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastEventSequence: 1,
    lastKnownState: 'Initial session dispatch',
    currentAction: 'Waiting for prompt execution',
    nextAction: 'Analyzing repository structure',
    blocker: null,
    claudeSessionId: `sess-${Date.now().toString(36)}`,
    provider: body.provider || 'Anthropic',
    model: body.model || 'claude-3-7-sonnet',
    gitBranch: 'feat/new-activity',
    gitBaseCommit: '1a7c88b',
    filesChangedCount: 0,
    testsPassed: 0,
    testsFailed: 0,
    estimatedCost: 0.01,
    durationMs: 100,
    checkpointId: null,
    handoffAvailable: false,
    recoverable: true,
    approvalCount: 0,
  };
  activitiesState.unshift(newActivity);
  sendJson(res, newActivity, 201);
});

// POST /api/v1/activities/:id/continue
apiV1Router.post('/activities/:id/continue', (req: Request, res: Response) => {
  const item = activitiesState.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Activity not found' });
  item.status = ActivityStatus.RUNNING;
  item.currentAction = req.body?.prompt ? `Executing user direction: "${req.body.prompt}"` : 'Continuing execution';
  item.updatedAt = new Date().toISOString();
  sendJson(res, item);
});

// POST /api/v1/activities/:id/pause
apiV1Router.post('/activities/:id/pause', (req: Request, res: Response) => {
  const item = activitiesState.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Activity not found' });
  item.status = ActivityStatus.PAUSED;
  item.currentAction = 'Paused by operator';
  item.updatedAt = new Date().toISOString();
  sendJson(res, item);
});

// POST /api/v1/activities/:id/stop
apiV1Router.post('/activities/:id/stop', (req: Request, res: Response) => {
  const item = activitiesState.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Activity not found' });
  item.status = ActivityStatus.COMPLETED;
  item.currentAction = 'Cleanly terminated';
  item.updatedAt = new Date().toISOString();
  sendJson(res, item);
});

// POST /api/v1/activities/:id/retry
apiV1Router.post('/activities/:id/retry', (req: Request, res: Response) => {
  const item = activitiesState.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Activity not found' });
  item.status = ActivityStatus.RUNNING;
  item.currentAction = 'Retrying step';
  item.blocker = null;
  item.updatedAt = new Date().toISOString();
  sendJson(res, item);
});

// GET /api/v1/projects/:id/files
apiV1Router.get('/projects/:id/files', (req: Request, res: Response) => {
  const files = filesState[req.params.id] || filesState['proj-01'] || [];
  sendJson(res, files);
});

// GET /api/v1/projects/:id/files/*
apiV1Router.get('/projects/:id/files/*', (req: Request, res: Response) => {
  const filePath = req.params[0];
  const files = filesState[req.params.id] || filesState['proj-01'] || [];
  const found = files.find((f) => f.path === filePath);
  if (!found) return res.status(404).json({ success: false, error: 'File not found' });
  sendJson(res, found);
});

// POST /api/v1/projects/:id/files
apiV1Router.post('/projects/:id/files', (req: Request, res: Response) => {
  const { path: filePath, isDirectory } = req.body;
  const files = filesState[req.params.id] || [];
  const name = filePath?.split('/').pop() || filePath;
  const newFile = {
    id: `f-${Date.now()}`,
    path: filePath,
    name,
    isDirectory: Boolean(isDirectory),
    updatedAt: new Date().toISOString(),
    isModified: true,
    sizeBytes: 0,
    content: isDirectory ? undefined : '',
  };
  files.push(newFile);
  filesState[req.params.id] = files;
  sendJson(res, newFile, 201);
});

// PATCH /api/v1/projects/:id/files/*
apiV1Router.patch('/projects/:id/files/*', (req: Request, res: Response) => {
  const filePath = req.params[0];
  const { content, newPath } = req.body;
  const files = filesState[req.params.id] || filesState['proj-01'] || [];
  const found = files.find((f) => f.path === filePath);
  if (!found) return res.status(404).json({ success: false, error: 'File not found' });
  if (content !== undefined) {
    found.content = content;
    found.sizeBytes = content.length;
    found.isModified = true;
  }
  if (newPath) {
    found.path = newPath;
    found.name = newPath.split('/').pop() || newPath;
  }
  found.updatedAt = new Date().toISOString();
  sendJson(res, found);
});

// DELETE /api/v1/projects/:id/files/*
apiV1Router.delete('/projects/:id/files/*', (req: Request, res: Response) => {
  const filePath = req.params[0];
  const files = filesState[req.params.id] || [];
  filesState[req.params.id] = files.filter((f) => f.path !== filePath);
  sendJson(res, { success: true, deletedPath: filePath });
});

// GET /api/v1/sessions
apiV1Router.get('/sessions', (req: Request, res: Response) => {
  sendJson(res, INITIAL_SESSIONS);
});

// GET /api/v1/mcp
apiV1Router.get('/mcp', (req: Request, res: Response) => {
  sendJson(res, INITIAL_MCP_SERVERS);
});

// GET /api/v1/models
apiV1Router.get('/models', (req: Request, res: Response) => {
  sendJson(res, {
    profiles: INITIAL_MODEL_PROFILES,
    routingPolicies: INITIAL_ROUTING_POLICIES,
  });
});

// GET /api/v1/monitoring
apiV1Router.get('/monitoring', (req: Request, res: Response) => {
  sendJson(res, {
    resources: INITIAL_RESOURCE_SUMMARY,
    services: INITIAL_SYSTEM_SERVICES,
  });
});

// GET /api/v1/backups
apiV1Router.get('/backups', (req: Request, res: Response) => {
  sendJson(res, INITIAL_BACKUP_STATUS);
});

// GET /api/v1/jobs
apiV1Router.get('/jobs', (req: Request, res: Response) => {
  sendJson(res, INITIAL_JOBS);
});
