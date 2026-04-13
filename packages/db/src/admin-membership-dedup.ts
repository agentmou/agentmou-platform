const ROLE_PRIORITY: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  operator: 3,
  viewer: 4,
};

export interface MembershipDedupCandidate {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface MembershipDedupResult {
  canonicalMembershipId: string;
  role: string;
  lastActiveAt: Date;
  deleteMembershipIds: string[];
}

function getRolePriority(role: string) {
  return ROLE_PRIORITY[role] ?? Number.MAX_SAFE_INTEGER;
}

export function resolveMembershipDeduplication(
  rows: MembershipDedupCandidate[]
): MembershipDedupResult {
  if (rows.length === 0) {
    throw new Error('resolveMembershipDeduplication requires at least one membership');
  }

  const canonical = [...rows].sort((left, right) => {
    const joinedAtDelta = left.joinedAt.getTime() - right.joinedAt.getTime();
    if (joinedAtDelta !== 0) {
      return joinedAtDelta;
    }

    return left.id.localeCompare(right.id);
  })[0];

  const bestRole = [...rows].sort((left, right) => {
    const roleDelta = getRolePriority(left.role) - getRolePriority(right.role);
    if (roleDelta !== 0) {
      return roleDelta;
    }

    const joinedAtDelta = left.joinedAt.getTime() - right.joinedAt.getTime();
    if (joinedAtDelta !== 0) {
      return joinedAtDelta;
    }

    return left.id.localeCompare(right.id);
  })[0];

  const latestLastActiveAt = [...rows].sort(
    (left, right) => right.lastActiveAt.getTime() - left.lastActiveAt.getTime()
  )[0];

  return {
    canonicalMembershipId: canonical.id,
    role: bestRole.role,
    lastActiveAt: latestLastActiveAt.lastActiveAt,
    deleteMembershipIds: rows
      .filter((row) => row.id !== canonical.id)
      .map((row) => row.id)
      .sort((left, right) => left.localeCompare(right)),
  };
}
