import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthPrincipal } from '../../src/domain/models/index.ts';
import { isRoleSufficient } from '../policy/action-policy.ts';
import { getAdminAuth } from '../services/firebase-admin.ts';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
      requestId?: string;
    }
  }
}

/**
 * Derives user role from trusted server-side sources:
 * 1. Admin-issued Firebase custom claims ('role')
 * 2. Explicit server environment user ID / email whitelist (OWNER_USER_IDS, OWNER_EMAILS, OPERATOR_EMAILS, etc.)
 * 3. Default fallback for authenticated users with no assigned privileged role is VIEWER.
 * Never trusts role claims from client request bodies or headers.
 */
function resolveServerAssignedRole(
  uid: string,
  email?: string,
  customClaimsRole?: string
): AuthPrincipal['role'] {
  // 1. Check validated custom claims
  if (customClaimsRole === 'OWNER' || customClaimsRole === 'OPERATOR' || customClaimsRole === 'VIEWER') {
    return customClaimsRole;
  }

  const ownerUids = (process.env.OWNER_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ownerEmails = (process.env.OWNER_EMAILS || 'mdhasibul4u@gmail.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (ownerUids.includes(uid) || (email && ownerEmails.includes(email.toLowerCase()))) {
    return 'OWNER';
  }

  const operatorUids = (process.env.OPERATOR_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const operatorEmails = (process.env.OPERATOR_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (operatorUids.includes(uid) || (email && operatorEmails.includes(email.toLowerCase()))) {
    return 'OPERATOR';
  }

  // Authenticated user with no assigned privileged role defaults strictly to VIEWER
  return 'VIEWER';
}

/**
 * Phase 1 Authentication Strategy:
 * 1. If explicit PHASE1_DEMO_MODE=true is configured in NON-PRODUCTION, allow demo principal.
 *    (Rejects demo mode in production).
 * 2. If Bearer token is provided:
 *    a) Verify against server-configured system tokens (AUTH_TOKEN_OWNER, AUTH_TOKEN_OPERATOR, AUTH_TOKEN_VIEWER).
 *       NO hardcoded dev-preview-token fallback exists.
 *    b) If not a system token, verify as Firebase ID token using Firebase Admin SDK.
 * 3. Denies access by default (401 Unauthorized) when identity verification fails.
 */
export async function authenticateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Public endpoints: health, readiness, and status checks
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
  const isProduction = process.env.NODE_ENV === 'production';

  // Security Gate: Reject demo mode masquerading as production login
  if (isProduction && isDemoMode) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INCOMPATIBLE_CONFIGURATION',
        message: 'PHASE1_DEMO_MODE cannot be enabled in a production environment.',
        retryable: false,
        service: 'auth-service',
      },
      requestId: req.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    // 1. Check server-configured system tokens (strict exact match, no dev backdoors)
    const ownerToken = process.env.AUTH_TOKEN_OWNER;
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

    // 2. Verify as Firebase ID token using Firebase Admin SDK
    try {
      const adminAuth = getAdminAuth();
      const decoded = await adminAuth.verifyIdToken(token);
      const role = resolveServerAssignedRole(decoded.uid, decoded.email, decoded.role as string | undefined);

      req.user = {
        id: decoded.uid,
        email: decoded.email,
        role,
        authMode: 'FIREBASE_AUTH',
      };
      next();
      return;
    } catch (firebaseErr: any) {
      const isExpired = firebaseErr?.code === 'auth/id-token-expired';
      const errorCode = isExpired ? 'EXPIRED_ID_TOKEN' : 'INVALID_ID_TOKEN';
      const errorMessage = isExpired
        ? 'Firebase ID token has expired. Please refresh credentials.'
        : 'Invalid authorization token provided.';

      res.status(401).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          retryable: isExpired,
          service: 'auth-service',
        },
        requestId: req.requestId || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  // Explicit demo mode in non-production
  if (isDemoMode && !isProduction) {
    req.user = {
      id: 'phase1-demo-user',
      role: 'OWNER',
      authMode: 'PHASE1_DEMO',
    };
    next();
    return;
  }

  // Normal mode without valid credentials fails closed
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
