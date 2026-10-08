import { RiskLevel } from '../../src/domain/enums/index.ts';
import { AuthPrincipal } from '../../src/domain/models/index.ts';

export type ActionType =
  | 'HEALTH_READ'
  | 'DASHBOARD_READ'
  | 'LOGS_READ'
  | 'PROJECT_READ'
  | 'PROJECT_CREATE'
  | 'ACTIVITY_READ'
  | 'ACTIVITY_CREATE'
  | 'ACTIVITY_DISPATCH'
  | 'ACTIVITY_PAUSE'
  | 'ACTIVITY_RESUME'
  | 'ACTIVITY_CANCEL'
  | 'ACTIVITY_REWOUND'
  | 'FILE_READ'
  | 'FILE_WRITE'
  | 'FILE_DELETE'
  | 'GITHUB_READ'
  | 'GITHUB_SYNC'
  | 'MCP_READ'
  | 'MCP_TOGGLE'
  | 'MCP_RESTART'
  | 'MCP_ADD'
  | 'MODEL_READ'
  | 'ROUTING_UPDATE'
  | 'JOB_READ'
  | 'JOB_CREATE'
  | 'JOB_CANCEL'
  | 'BACKUP_READ'
  | 'BACKUP_TRIGGER'
  | 'BACKUP_RESTORE'
  | 'TERMINAL_SESSION'
  | 'HOST_REBOOT'
  | 'HOST_SERVICE_RESTART'
  | 'APPROVAL_READ'
  | 'APPROVAL_RESOLVE';

export interface ActionPolicy {
  actionType: ActionType;
  riskLevel: RiskLevel;
  requiredRole: AuthPrincipal['role'];
  requiresApproval: boolean;
  description: string;
}

export const CENTRAL_ACTION_POLICIES: Record<ActionType, ActionPolicy> = {
  HEALTH_READ: {
    actionType: 'HEALTH_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read system health status',
  },
  DASHBOARD_READ: {
    actionType: 'DASHBOARD_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read system dashboard overview',
  },
  LOGS_READ: {
    actionType: 'LOGS_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read system logs',
  },
  PROJECT_READ: {
    actionType: 'PROJECT_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read project metadata',
  },
  PROJECT_CREATE: {
    actionType: 'PROJECT_CREATE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Create new project metadata',
  },
  ACTIVITY_READ: {
    actionType: 'ACTIVITY_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read activity details and events',
  },
  ACTIVITY_CREATE: {
    actionType: 'ACTIVITY_CREATE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Create new activity draft',
  },
  ACTIVITY_DISPATCH: {
    actionType: 'ACTIVITY_DISPATCH',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Dispatch or continue activity',
  },
  ACTIVITY_PAUSE: {
    actionType: 'ACTIVITY_PAUSE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Pause active activity',
  },
  ACTIVITY_RESUME: {
    actionType: 'ACTIVITY_RESUME',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Resume paused activity',
  },
  ACTIVITY_CANCEL: {
    actionType: 'ACTIVITY_CANCEL',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Stop or cancel activity',
  },
  ACTIVITY_REWOUND: {
    actionType: 'ACTIVITY_REWOUND',
    riskLevel: RiskLevel.STRONG_CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: true,
    description: 'Rewind activity to past checkpoint',
  },
  FILE_READ: {
    actionType: 'FILE_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read workspace files',
  },
  FILE_WRITE: {
    actionType: 'FILE_WRITE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Modify or create file',
  },
  FILE_DELETE: {
    actionType: 'FILE_DELETE',
    riskLevel: RiskLevel.STRONG_CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: true,
    description: 'Permanently delete file',
  },
  GITHUB_READ: {
    actionType: 'GITHUB_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read GitHub repository sync status',
  },
  GITHUB_SYNC: {
    actionType: 'GITHUB_SYNC',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Sync upstream Git repository',
  },
  MCP_READ: {
    actionType: 'MCP_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read MCP servers list',
  },
  MCP_TOGGLE: {
    actionType: 'MCP_TOGGLE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Enable or disable MCP tool server',
  },
  MCP_RESTART: {
    actionType: 'MCP_RESTART',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Restart MCP tool server',
  },
  MCP_ADD: {
    actionType: 'MCP_ADD',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OWNER',
    requiresApproval: false,
    description: 'Register new MCP server',
  },
  MODEL_READ: {
    actionType: 'MODEL_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read model profiles and routing policies',
  },
  ROUTING_UPDATE: {
    actionType: 'ROUTING_UPDATE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Update model routing task policy',
  },
  JOB_READ: {
    actionType: 'JOB_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read background job status',
  },
  JOB_CREATE: {
    actionType: 'JOB_CREATE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Spawn new background task',
  },
  JOB_CANCEL: {
    actionType: 'JOB_CANCEL',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Cancel background job',
  },
  BACKUP_READ: {
    actionType: 'BACKUP_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Inspect workstation backup status',
  },
  BACKUP_TRIGGER: {
    actionType: 'BACKUP_TRIGGER',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Trigger workspace backup snapshot',
  },
  BACKUP_RESTORE: {
    actionType: 'BACKUP_RESTORE',
    riskLevel: RiskLevel.STRONG_CONFIRM,
    requiredRole: 'OWNER',
    requiresApproval: true,
    description: 'Restore workstation snapshot',
  },
  TERMINAL_SESSION: {
    actionType: 'TERMINAL_SESSION',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Interactive shell session operation',
  },
  HOST_REBOOT: {
    actionType: 'HOST_REBOOT',
    riskLevel: RiskLevel.STRONG_CONFIRM,
    requiredRole: 'OWNER',
    requiresApproval: true,
    description: 'Reboot remote execution workstation',
  },
  HOST_SERVICE_RESTART: {
    actionType: 'HOST_SERVICE_RESTART',
    riskLevel: RiskLevel.STRONG_CONFIRM,
    requiredRole: 'OWNER',
    requiresApproval: true,
    description: 'Privileged service daemon restart',
  },
  APPROVAL_READ: {
    actionType: 'APPROVAL_READ',
    riskLevel: RiskLevel.SAFE,
    requiredRole: 'VIEWER',
    requiresApproval: false,
    description: 'Read pending approval requests',
  },
  APPROVAL_RESOLVE: {
    actionType: 'APPROVAL_RESOLVE',
    riskLevel: RiskLevel.CONFIRM,
    requiredRole: 'OPERATOR',
    requiresApproval: false,
    description: 'Resolve pending approval decision',
  },
};

const ROLE_RANK: Record<AuthPrincipal['role'], number> = {
  VIEWER: 1,
  OPERATOR: 2,
  OWNER: 3,
};

export function isRoleSufficient(currentRole: AuthPrincipal['role'], requiredRole: AuthPrincipal['role']): boolean {
  return ROLE_RANK[currentRole] >= ROLE_RANK[requiredRole];
}
