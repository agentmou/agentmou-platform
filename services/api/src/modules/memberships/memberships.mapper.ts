import { TenantMemberSchema, type TenantMember } from '@agentmou/contracts';
import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';

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
    role: normalizeTenantMembershipRole(membership.role),
    joinedAt: membership.joinedAt.toISOString(),
    lastActiveAt: membership.lastActiveAt.toISOString(),
  });
}
