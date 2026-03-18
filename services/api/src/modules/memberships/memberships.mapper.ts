import {
  TenantMemberSchema,
  type TenantMember,
  type UserRole,
} from '@agentmou/contracts';

interface MembershipUser {
  id: string | null;
  email: string | null;
  name: string | null;
}

interface MembershipRow {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  lastActiveAt: Date;
  user: MembershipUser | null;
}

export function mapMembership(membership: MembershipRow): TenantMember {
  return TenantMemberSchema.parse({
    id: membership.id,
    tenantId: membership.tenantId,
    email: membership.user?.email ?? membership.userId,
    name: membership.user?.name ?? membership.user?.email ?? membership.userId,
    role: normalizeRole(membership.role),
    joinedAt: membership.joinedAt.toISOString(),
    lastActiveAt: membership.lastActiveAt.toISOString(),
  });
}

function normalizeRole(role: string): UserRole {
  return (role === 'member' ? 'operator' : role) as UserRole;
}
