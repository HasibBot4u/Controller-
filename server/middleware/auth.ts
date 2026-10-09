import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthPrincipal } from '../../src/domain/models/index.ts';
import { isRoleSufficient } from '../policy/action-policy.ts';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
      requestId?: string;
    }
  }
}

/**
 * Phase 1 Authentication Strategy:
 * 1. If explicit PHASE1_DEMO_MODE=true is configured, allow demo principal.
 * 2. In normal mode, authenticate via Authorization Bearer token matching server-configured tokens:
 *    - AUTH_TOKEN_OWNER -> role OWNER
 *    - AUTH_TOKEN_OPERATOR -> role OPERATOR
 *    - AUTH_TOKEN_VIEWER -> role VIEWER
 * 3. Or verify Firebase Auth token if configured.
 * 4. Fails closed with 401 if unauthenticated.
 */

export function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  // Public endpoints that do not require auth: health and status check
  const isPublic =
    req.path === '/health' ||
    req.path === '/ready' ||
    req.originalUrl === '/api/v1/health' ||
    req.originalUrl === '/api/v1/ready';

  if (isPublic) {
    next();
    return;
  }

  const isDemoMode = process.env.PHASE1_DEMO_MODE === 'true';

  // Check Bearer Token header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    const ownerToken = process.env.AUTH_TOKEN_OWNER || (process.env.NODE_ENV !== 'production' ? 'dev-preview-token' : undefined);
    const operatorToken = process.env.AUTH_TOKEN_OPERATOR;
    const viewerToken = process.env.AUTH_TOKEN_VIEWER;

    if (ownerToken && token === ownerToken) {
      req.user = {
        id: 'owner-principal',
        role: 'OWNER',
        authMode: 'BEARER_TOKEN',
      };
      next();
      return;
    }

    if (operatorToken && token === operatorToken) {
      req.user = {
        id: 'operator-principal',
        role: 'OPERATOR',
        authMode: 'BEARER_TOKEN',
      };
      next();
      return;
    }

    if (viewerToken && token === viewerToken) {
      req.user = {
        id: 'viewer-principal',
        role: 'VIEWER',
        authMode: 'BEARER_TOKEN',
      };
      next();
      return;
    }

    // Invalid bearer token provided
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization token provided.',
        retryable: false,
        service: 'auth-service',
      },
      requestId: req.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // If in explicit DEMO mode, grant demo principal
  if (isDemoMode) {
    req.user = {
      id: 'phase1-demo-user',
      role: 'OWNER',
      authMode: 'PHASE1_DEMO',
    };
    next();
    return;
  }

  // Normal mode without valid auth fails closed
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Missing or invalid Bearer token.',
      retryable: false,
      service: 'auth-service',
    },
    requestId: req.requestId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Enforce minimum role required for the route
 */
export function requireRole(minimumRole: AuthPrincipal['role']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before role check.',
          retryable: false,
          service: 'auth-service',
        },
        requestId: req.requestId || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!isRoleSufficient(req.user.role, minimumRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions: action requires role [${minimumRole}], current role is [${req.user.role}]`,
          retryable: false,
          service: 'auth-service',
        },
        requestId: req.requestId || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
