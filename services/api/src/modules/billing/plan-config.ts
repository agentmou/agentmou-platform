import type { PlanEntitlement, TenantPlan } from '@agentmou/contracts';

const PLAN_ENTITLEMENTS: Record<TenantPlan, PlanEntitlement> = {
  free: {
    plan: 'free',
    includedRuns: 100,
    includedAgents: 1,
    includedTeamMembers: 1,
    logRetentionDays: 7,
    monthlyBaseAmount: 0,
    overageRunPrice: 0.02,
    currency: 'usd',
    softLimit: true,
  },
  starter: {
    plan: 'starter',
    includedRuns: 1000,
    includedAgents: 3,
    includedTeamMembers: 3,
    logRetentionDays: 7,
    monthlyBaseAmount: 29,
    overageRunPrice: 0.01,
    currency: 'usd',
    softLimit: true,
  },
  pro: {
    plan: 'pro',
    includedRuns: 10000,
    includedAgents: 10,
    includedTeamMembers: 10,
    logRetentionDays: 30,
    monthlyBaseAmount: 99,
    overageRunPrice: 0.005,
    currency: 'usd',
    softLimit: true,
  },
  scale: {
    plan: 'scale',
    includedRuns: null,
    includedAgents: null,
    includedTeamMembers: null,
    logRetentionDays: 90,
    monthlyBaseAmount: 0,
    overageRunPrice: 0,
    currency: 'usd',
    softLimit: true,
  },
  enterprise: {
    plan: 'enterprise',
    includedRuns: null,
    includedAgents: null,
    includedTeamMembers: null,
    logRetentionDays: 90,
    monthlyBaseAmount: 0,
    overageRunPrice: 0,
    currency: 'usd',
    softLimit: true,
  },
};

export function getPlanEntitlements(plan: string): PlanEntitlement {
  return PLAN_ENTITLEMENTS[(plan as TenantPlan) || 'free'] ?? PLAN_ENTITLEMENTS.free;
}

export function normalizePlan(plan: string): TenantPlan {
  return (plan as TenantPlan) in PLAN_ENTITLEMENTS ? (plan as TenantPlan) : 'free';
}
