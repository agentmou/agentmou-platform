import type { UserRole } from '@agentmou/contracts';

export function normalizeTenantMembershipRole(role?: string): UserRole | undefined {
  if (!role) {
    return undefined;
  }

  return (role === 'member' ? 'operator' : role) as UserRole;
}
