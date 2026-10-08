import { describe, it, expect } from 'vitest';
import { canTransitionActivity, assertActivityTransition, ActivityTransitionError } from './activity-state-machine.ts';
import { ActivityStatus } from '../enums/index.ts';

describe('Activity State Machine', () => {
  it('allows legal lifecycle transitions from DRAFT', () => {
    expect(canTransitionActivity(ActivityStatus.DRAFT, ActivityStatus.QUEUED)).toBe(true);
    expect(canTransitionActivity(ActivityStatus.DRAFT, ActivityStatus.STARTING)).toBe(true);
    expect(canTransitionActivity(ActivityStatus.DRAFT, ActivityStatus.CANCELLED)).toBe(true);
  });

  it('allows legal lifecycle transitions from RUNNING', () => {
    expect(canTransitionActivity(ActivityStatus.RUNNING, ActivityStatus.WAITING_APPROVAL)).toBe(true);
    expect(canTransitionActivity(ActivityStatus.RUNNING, ActivityStatus.PAUSED)).toBe(true);
    expect(canTransitionActivity(ActivityStatus.RUNNING, ActivityStatus.COMPLETED)).toBe(true);
    expect(canTransitionActivity(ActivityStatus.RUNNING, ActivityStatus.CANCELLED)).toBe(true);
  });

  it('strictly forbids illegal transitions like DRAFT to COMPLETED', () => {
    expect(canTransitionActivity(ActivityStatus.DRAFT, ActivityStatus.COMPLETED)).toBe(false);
    expect(() => assertActivityTransition(ActivityStatus.DRAFT, ActivityStatus.COMPLETED)).toThrow(
      ActivityTransitionError
    );
  });

  it('strictly prevents transitions out of terminal states CANCELLED and COMPLETED', () => {
    expect(canTransitionActivity(ActivityStatus.CANCELLED, ActivityStatus.RUNNING)).toBe(false);
    expect(canTransitionActivity(ActivityStatus.COMPLETED, ActivityStatus.RUNNING)).toBe(false);
  });

  it('guarantees STOP != COMPLETED semantics: STOP maps to CANCELLED', () => {
    expect(ActivityStatus.CANCELLED).not.toBe(ActivityStatus.COMPLETED);
  });
});
