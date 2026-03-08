import { db, users } from '@agentmou/db';
import { createToken, verifyToken, hashPassword, verifyPassword } from '@agentmou/auth';
import { eq } from 'drizzle-orm';

export class AuthService {
  async register(body: { email: string; password: string; name: string }) {
    const { email, password, name } = body;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    const passwordHash = hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name });

    const token = await createToken({ userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  async login(body: { email: string; password: string }) {
    const { email, password } = body;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const token = await createToken({ userId: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name },
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

    return user;
  }
}
