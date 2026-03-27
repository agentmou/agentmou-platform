import { db, users, tenants, memberships, userIdentities } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';

export type OAuthProfile = {
  provider: 'google' | 'microsoft';
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

/**
 * Resolves or creates a user from an OIDC profile (B2C).
 * - Existing identity: return that user.
 * - Same email as an existing user: link identity (account consolidation).
 * - Otherwise: new user + default workspace (same as email register).
 */
export async function findOrCreateUserFromOAuthProfile(
  profile: OAuthProfile
): Promise<{ userId: string; email: string; isNew: boolean }> {
  if (!profile.emailVerified) {
    throw Object.assign(new Error('Email from identity provider is not verified'), {
      statusCode: 403,
    });
  }

  const email = profile.email.trim().toLowerCase();

  const [existingIdentity] = await db
    .select({ userId: userIdentities.userId })
    .from(userIdentities)
    .where(
      and(
        eq(userIdentities.provider, profile.provider),
        eq(userIdentities.providerSubject, profile.subject)
      )
    )
    .limit(1);

  if (existingIdentity) {
    const [u] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, existingIdentity.userId))
      .limit(1);
    if (!u) {
      throw Object.assign(new Error('User not found for identity'), {
        statusCode: 500,
      });
    }
    return { userId: u.id, email: u.email, isNew: false };
  }

  const [byEmail] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (byEmail) {
    await db.insert(userIdentities).values({
      userId: byEmail.id,
      provider: profile.provider,
      providerSubject: profile.subject,
      emailSnapshot: email,
      metadata: { linkedVia: 'oauth_email_match' },
    });
    return { userId: byEmail.id, email: byEmail.email, isNew: false };
  }

  const displayName = profile.name?.trim() || email.split('@')[0] || 'User';

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        name: displayName,
        passwordHash: null,
      })
      .returning({ id: users.id, email: users.email });

    await tx.insert(userIdentities).values({
      userId: user.id,
      provider: profile.provider,
      providerSubject: profile.subject,
      emailSnapshot: email,
      metadata: {},
    });

    const [tenant] = await tx
      .insert(tenants)
      .values({
        name: `${displayName}'s Workspace`,
        type: 'business',
        plan: 'free',
        ownerId: user.id,
      })
      .returning({ id: tenants.id });

    await tx.insert(memberships).values({
      tenantId: tenant.id,
      userId: user.id,
      role: 'owner',
    });

    return user;
  });

  return { userId: result.id, email: result.email, isNew: true };
}
