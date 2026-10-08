import { describe, it, expect } from 'vitest';
import { CENTRAL_ACTION_POLICIES, isRoleSufficient } from './action-policy.ts';
import { RiskLevel } from '../../src/domain/enums/index.ts';

describe('Central Action & Risk Policy', () => {
  it('correctly maps file deletion to STRONG_CONFIRM and requires approval', () => {
    const policy = CENTRAL_ACTION_POLICIES['FILE_DELETE'];
    expect(policy.riskLevel).toBe(RiskLevel.STRONG_CONFIRM);
    expect(policy.requiresApproval).toBe(true);
  });

  it('correctly maps host reboot to STRONG_CONFIRM and OWNER role', () => {
    const policy = CENTRAL_ACTION_POLICIES['HOST_REBOOT'];
    expect(policy.riskLevel).toBe(RiskLevel.STRONG_CONFIRM);
    expect(policy.requiredRole).toBe('OWNER');
    expect(policy.requiresApproval).toBe(true);
  });

  it('correctly evaluates role sufficiency hierarchy', () => {
    expect(isRoleSufficient('OWNER', 'VIEWER')).toBe(true);
    expect(isRoleSufficient('OWNER', 'OPERATOR')).toBe(true);
    expect(isRoleSufficient('OPERATOR', 'VIEWER')).toBe(true);
    expect(isRoleSufficient('OPERATOR', 'OWNER')).toBe(false);
    expect(isRoleSufficient('VIEWER', 'OPERATOR')).toBe(false);
  });
});
