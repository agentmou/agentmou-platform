import { createHash, randomBytes } from 'node:crypto';
import { db, emailVerificationTokens } from '@agentmou/db';
import { and, eq, isNull } from 'drizzle-orm';

import { getApiConfig } from '../config.js';

export interface IssuedEmailVerificationToken {
  token: string;
  expiresAt: Date;
  link: string;
}

export async function issueEmailVerificationToken(
  userId: string
): Promise<IssuedEmailVerificationToken> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.consumedAt))
      );

    await tx.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  });

  const { appPublicBaseUrl } = getApiConfig();
  const link = `${appPublicBaseUrl.replace(/\/$/, '')}/verify-email?token=${token}`;

  return {
    token,
    expiresAt,
    link,
  };
}
