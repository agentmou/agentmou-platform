import { createHash, randomBytes } from 'node:crypto';
import { db, passwordResetTokens } from '@agentmou/db';
import { and, eq, isNull } from 'drizzle-orm';

import { getApiConfig } from '../config.js';

export interface IssuedPasswordResetToken {
  token: string;
  expiresAt: Date;
  link: string;
}

export async function issuePasswordResetToken(userId: string): Promise<IssuedPasswordResetToken> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.consumedAt)));

    await tx.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  });

  const { appPublicBaseUrl } = getApiConfig();
  const link = `${appPublicBaseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

  return {
    token,
    expiresAt,
    link,
  };
}
