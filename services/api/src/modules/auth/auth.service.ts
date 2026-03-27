import { createHash, randomBytes } from 'node:crypto';
import { db, users, tenants, memberships, passwordResetTokens } from '@agentmou/db';
import { createToken, verifyToken, hashPassword, verifyPassword } from '@agentmou/auth';
import { eq } from 'drizzle-orm';

export class AuthService {
  /**
   * Registers a new user, creates their default tenant (workspace),
   * and assigns them as owner — all in a single transaction.
   */
  async register(body: { email: string; password: string; name: string }) {
    const { email, password, name } = body;

    if (!email || !password || !name) {
      throw Object.assign(new Error('Email, password, and name are required'), { statusCode: 400 });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    const result = await db.transaction(async (tx) => {
      const pwHash = hashPassword(password);
      const [user] = await tx
        .insert(users)
        .values({ email, name, passwordHash: pwHash })
        .returning({ id: users.id, email: users.email, name: users.name });

      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: `${name}'s Workspace`,
          type: 'business',
          plan: 'free',
          ownerId: user.id,
        })
        .returning({ id: tenants.id, name: tenants.name, plan: tenants.plan });

      await tx.insert(memberships).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      return { user, tenant };
    });

    const token = await createToken({ userId: result.user.id, email: result.user.email });

    return {
      user: result.user,
      tenant: result.tenant,
      token,
    };
  }

  async login(body: { email: string; password: string }) {
    const { email, password } = body;

    if (!email || !password) {
      throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const userTenants = await db
      .select({ id: tenants.id, name: tenants.name, plan: tenants.plan })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, user.id));

    const token = await createToken({ userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tenants: userTenants,
      token,
    };
  }

  async getCurrentUser(authorization?: string) {
    const token = authorization?.replace('Bearer ', '');
    if (!token) {
      throw Object.assign(new Error('Missing authorization'), { statusCode: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      throw Object.assign(new Error('Invalid token'), { statusCode: 401 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const userTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        plan: tenants.plan,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, user.id));

    return { ...user, tenants: userTenants };
  }

  /**
   * Creates a password-reset token if the user exists. Always succeeds from the
   * client perspective (no email enumeration). Email delivery is not wired;
   * in development the reset URL is logged when LOG_PASSWORD_RESET_LINK=1.
   */
  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (user) {
      const plain = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(plain, 'utf8').digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const webBase =
        process.env.WEB_APP_BASE_URL || 'http://localhost:3000';
      const link = `${webBase.replace(/\/$/, '')}/reset-password?token=${plain}`;

      if (process.env.LOG_PASSWORD_RESET_LINK === '1' || process.env.NODE_ENV !== 'production') {
        console.info(`[auth] password reset link for ${normalized}: ${link}`);
      }
    }

    return { ok: true as const };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid or expired reset token'), {
        statusCode: 400,
      });
    }

    const pwHash = hashPassword(password);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: pwHash, updatedAt: new Date() })
        .where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
    });

    return { ok: true as const };
  }
}
