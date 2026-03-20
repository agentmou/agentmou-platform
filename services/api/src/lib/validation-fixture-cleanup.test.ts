import { describe, expect, it } from 'vitest';

import {
  buildUserDeletionDecision,
  isValidationFixtureCandidate,
} from './validation-fixture-cleanup.js';

describe('validation fixture cleanup helpers', () => {
  it('accepts the March 19 OAuth validation fixture identity markers', () => {
    expect(
      isValidationFixtureCandidate({
        tenantName: "OAuth Check's Workspace",
        tenantPlan: 'free',
        userEmail: 'oauth-check-1773956802@example.com',
        userName: 'OAuth Check',
      }),
    ).toBe(true);
  });

  it('rejects production-looking identities', () => {
    expect(
      isValidationFixtureCandidate({
        tenantName: 'Tim Workspace',
        tenantPlan: 'pro',
        userEmail: 'tim@agentmou.io',
        userName: 'Tim',
      }),
    ).toBe(false);
  });

  it('deletes the user only when no other references remain', () => {
    expect(
      buildUserDeletionDecision({
        otherOwnedTenants: 0,
        otherMemberships: 0,
        otherAuditEvents: 0,
        otherApprovalDecisions: 0,
      }),
    ).toEqual({
      willDelete: true,
      blockers: [],
    });
  });

  it('retains the user and reports the blocking references when other links remain', () => {
    expect(
      buildUserDeletionDecision({
        otherOwnedTenants: 1,
        otherMemberships: 2,
        otherAuditEvents: 0,
        otherApprovalDecisions: 1,
      }),
    ).toEqual({
      willDelete: false,
      blockers: [
        {
          label: 'other owned tenants',
          count: 1,
        },
        {
          label: 'other memberships',
          count: 2,
        },
        {
          label: 'other approval decisions',
          count: 1,
        },
      ],
    });
  });
});
