import { Request, Response, NextFunction } from 'express';
import { AuthPrincipal } from '../../src/domain/models/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
      requestId?: string;
    }
  }
}

/**
 * Phase 1 Authentication Middleware
 * Explicitly labeled as PHASE1_DEMO auth mode.
 * Does not expose or require production secrets.
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  // Check optional demo role header, default to OWNER for full Phase 1 testability
  const roleHeader = req.headers['x-demo-role'] as string | undefined;
  let role: AuthPrincipal['role'] = 'OWNER';

  if (roleHeader === 'OPERATOR') {
    role = 'OPERATOR';
  } else if (roleHeader === 'VIEWER') {
    role = 'VIEWER';
  }

  req.user = {
    id: 'demo-user-01',
    role,
    authMode: 'PHASE1_DEMO',
  };

  next();
}

/**
 * Role-Based Access Control Middleware
 */
export function requireRole(...allowedRoles: Array<AuthPrincipal['role']>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions: action requires one of [${allowedRoles.join(', ')}], current role is ${req.user?.role || 'NONE'}`,
          retryable: false,
          service: 'auth-service',
        },
        requestId: req.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}
