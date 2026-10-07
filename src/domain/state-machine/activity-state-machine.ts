import { ActivityStatus } from '../enums/index.ts';

/**
 * Single Activity State Machine
 * Centralized policy governing all valid Activity lifecycle transitions.
 */
export const VALID_ACTIVITY_TRANSITIONS: Readonly<Record<ActivityStatus, readonly ActivityStatus[]>> = {
  [ActivityStatus.DRAFT]: [
    ActivityStatus.QUEUED,
    ActivityStatus.STARTING,
    ActivityStatus.COMPLETED, // cancelled before start
  ],
  [ActivityStatus.QUEUED]: [
    ActivityStatus.STARTING,
    ActivityStatus.PAUSED,
    ActivityStatus.INTERRUPTED,
    ActivityStatus.FAILED,
  ],
  [ActivityStatus.STARTING]: [
    ActivityStatus.RUNNING,
    ActivityStatus.WAITING_APPROVAL,
    ActivityStatus.INTERRUPTED,
    ActivityStatus.FAILED,
  ],
  [ActivityStatus.RUNNING]: [
    ActivityStatus.WAITING_APPROVAL,
    ActivityStatus.PAUSED,
    ActivityStatus.DETACHED,
    ActivityStatus.INTERRUPTED,
    ActivityStatus.FAILED,
    ActivityStatus.COMPLETED,
  ],
  [ActivityStatus.WAITING_APPROVAL]: [
    ActivityStatus.RUNNING, // approved
    ActivityStatus.FAILED,  // rejected or expired
    ActivityStatus.PAUSED,
    ActivityStatus.INTERRUPTED,
  ],
  [ActivityStatus.PAUSED]: [
    ActivityStatus.RUNNING, // resumed
    ActivityStatus.INTERRUPTED,
    ActivityStatus.FAILED,
    ActivityStatus.COMPLETED, // user stopped while paused
  ],
  [ActivityStatus.DETACHED]: [
    ActivityStatus.RUNNING,     // client reconnected
    ActivityStatus.RECOVERABLE, // preserved by daemon
    ActivityStatus.INTERRUPTED,
    ActivityStatus.FAILED,
  ],
  [ActivityStatus.INTERRUPTED]: [
    ActivityStatus.RECOVERABLE,
    ActivityStatus.FAILED,
    ActivityStatus.COMPLETED,
  ],
  [ActivityStatus.RECOVERABLE]: [
    ActivityStatus.RUNNING, // resumed from checkpoint
    ActivityStatus.QUEUED,  // re-queued
    ActivityStatus.FAILED,
  ],
  [ActivityStatus.FAILED]: [
    ActivityStatus.RECOVERABLE, // can attempt recovery from last checkpoint
    ActivityStatus.QUEUED,      // retry
  ],
  [ActivityStatus.COMPLETED]: [],
};

export class ActivityTransitionError extends Error {
  public readonly code = 'INVALID_ACTIVITY_TRANSITION';
  public readonly fromStatus: ActivityStatus;
  public readonly toStatus: ActivityStatus;

  constructor(fromStatus: ActivityStatus, toStatus: ActivityStatus, message?: string) {
    super(
      message ||
        `Illegal activity status transition: cannot transition from ${fromStatus} to ${toStatus}`
    );
    this.name = 'ActivityTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * Checks whether an activity status transition is valid.
 */
export function canTransitionActivity(
  from: ActivityStatus,
  to: ActivityStatus
): boolean {
  if (from === to) return true; // idempotency
  const allowed = VALID_ACTIVITY_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that an activity status transition is valid, throwing ActivityTransitionError if not.
 */
export function assertActivityTransition(
  from: ActivityStatus,
  to: ActivityStatus
): void {
  if (!canTransitionActivity(from, to)) {
    throw new ActivityTransitionError(from, to);
  }
}
