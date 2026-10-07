import { Request, Response, NextFunction } from 'express';
import { ActivityTransitionError } from '../../src/domain/state-machine/activity-state-machine.ts';
import { FileSafetyError } from '../validation/path-validator.ts';

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.requestId || 'unknown';
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} does not exist`,
      retryable: false,
      service: 'control-plane-api',
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';
  const timestamp = new Date().toISOString();

  // Log error internally on server without exposing stack trace to client
  console.error(`[API Error] [${requestId}] ${req.method} ${req.path}:`, err?.message || err);

  if (err instanceof ActivityTransitionError) {
    res.status(409).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        retryable: false,
        service: 'activity-state-machine',
        details: { fromStatus: err.fromStatus, toStatus: err.toStatus },
      },
      requestId,
      timestamp,
    });
    return;
  }

  if (err instanceof FileSafetyError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        retryable: false,
        service: 'file-service',
      },
      requestId,
      timestamp,
    });
    return;
  }

  // Handle body-parser JSON syntax error
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST_JSON',
        message: 'Malformed JSON payload in request body',
        retryable: false,
        service: 'api-gateway',
      },
      requestId,
      timestamp,
    });
    return;
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected error occurred on the remote control plane',
      retryable: statusCode >= 500,
      service: err.service || 'control-plane-api',
    },
    requestId,
    timestamp,
  });
}
