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
 * Note: Does not trust client-supplied role headers (e.g. x-demo-role) for privilege escalation.
 * Phase 1 uses a fixed verified demo principal: phase1-demo-user (OWNER).
 * This represents Phase 1 Demo Authentication, not production security.
 */
export function authenticateRequest(req: Request, _res: Response, next: NextFunction): void {
  req.user = {
    id: 'phase1-demo-user',
    role: 'OWNER',
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
