import { createHash, randomBytes } from 'node:crypto';
import {
  db,
  users,
  tenants,
  memberships,
  userOauthStates,
  oauthLoginCodes,
} from '@agentmou/db';
import { createToken } from '@agentmou/auth';
import { eq, and, lt } from 'drizzle-orm';
import { findOrCreateUserFromOAuthProfile, type OAuthProfile } from './identity.service.js';
import { isAllowedAuthCallbackUrl, parseWebOriginAllowlist } from './oauth-allowlist.js';

const CODE_TTL_MS = 5 * 60 * 1000;
const STATE_TTL_MS = 15 * 60 * 1000;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function randomOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export type B2CProvider = 'google' | 'microsoft';

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

function getMicrosoftConfig() {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function isOAuthProviderConfigured(provider: B2CProvider): boolean {
  return provider === 'google'
    ? getGoogleConfig() !== null
    : getMicrosoftConfig() !== null;
}

export async function purgeExpiredOauthStates(): Promise<void> {
  const cutoff = new Date(Date.now() - STATE_TTL_MS);
  await db.delete(userOauthStates).where(lt(userOauthStates.expiresAt, cutoff));
}

export async function startB2cOAuth(
  provider: B2CProvider,
  returnUrl: string,
): Promise<{ redirectUrl: string; state: string }> {
  const allowlist = parseWebOriginAllowlist(process.env.AUTH_WEB_ORIGIN_ALLOWLIST);
  if (!isAllowedAuthCallbackUrl(returnUrl, allowlist)) {
    throw Object.assign(new Error('Invalid or disallowed return_url'), {
      statusCode: 400,
    });
  }

  if (provider === 'google' && !getGoogleConfig()) {
    throw Object.assign(new Error('Google OAuth is not configured'), {
      statusCode: 503,
    });
  }
  if (provider === 'microsoft' && !getMicrosoftConfig()) {
    throw Object.assign(new Error('Microsoft OAuth is not configured'), {
      statusCode: 503,
    });
  }

  await purgeExpiredOauthStates();

  const state = randomOpaqueToken();
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);

  await db.insert(userOauthStates).values({
    state,
    provider,
    returnUrl,
    expiresAt,
  });

  if (provider === 'google') {
    const { clientId, redirectUri } = getGoogleConfig()!;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { redirectUrl, state };
  }

  const { clientId, redirectUri } = getMicrosoftConfig()!;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid email profile offline_access https://graph.microsoft.com/User.Read',
    state,
    response_mode: 'query',
  });
  const redirectUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  return { redirectUrl, state };
}

async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const cfg = getGoogleConfig();
  if (!cfg) throw new Error('Google OAuth not configured');
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw Object.assign(new Error(`Google token exchange failed: ${t}`), {
      statusCode: 502,
    });
  }
  const tokens = (await tokenRes.json()) as { access_token: string };
  const ui = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!ui.ok) {
    throw Object.assign(new Error('Google userinfo failed'), { statusCode: 502 });
  }
  const j = (await ui.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!j.sub || !j.email) {
    throw Object.assign(new Error('Google profile missing email'), { statusCode: 502 });
  }
  return {
    provider: 'google',
    subject: j.sub,
    email: j.email,
    emailVerified: Boolean(j.email_verified),
    name: j.name ?? null,
  };
}

async function exchangeMicrosoftCode(code: string): Promise<OAuthProfile> {
  const cfg = getMicrosoftConfig();
  if (!cfg) throw new Error('Microsoft OAuth not configured');
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: cfg.redirectUri,
    grant_type: 'authorization_code',
    scope: 'openid email profile offline_access https://graph.microsoft.com/User.Read',
  });
  const tokenRes = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
  );
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw Object.assign(new Error(`Microsoft token exchange failed: ${t}`), {
      statusCode: 502,
    });
  }
  const tokens = (await tokenRes.json()) as { access_token: string };
  const me = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!me.ok) {
    throw Object.assign(new Error('Microsoft Graph profile failed'), {
      statusCode: 502,
    });
  }
  const j = (await me.json()) as {
    id: string;
    mail?: string | null;
    userPrincipalName?: string | null;
    displayName?: string | null;
  };
  const email = (j.mail || j.userPrincipalName || '').trim();
  if (!j.id || !email) {
    throw Object.assign(new Error('Microsoft profile missing email'), {
      statusCode: 502,
    });
  }
  return {
    provider: 'microsoft',
    subject: j.id,
    email,
    emailVerified: true,
    name: j.displayName ?? null,
  };
}

export async function completeB2cOAuthCallback(
  provider: B2CProvider,
  code: string,
  state: string,
): Promise<{ redirectTo: string }> {
  const [row] = await db
    .select()
    .from(userOauthStates)
    .where(
      and(
        eq(userOauthStates.state, state),
        eq(userOauthStates.provider, provider),
      ),
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired OAuth state'), {
      statusCode: 400,
    });
  }

  await db.delete(userOauthStates).where(eq(userOauthStates.state, state));

  const allowlist = parseWebOriginAllowlist(process.env.AUTH_WEB_ORIGIN_ALLOWLIST);
  if (!isAllowedAuthCallbackUrl(row.returnUrl, allowlist)) {
    throw Object.assign(new Error('Stored return_url is no longer allowed'), {
      statusCode: 400,
    });
  }

  const profile =
    provider === 'google'
      ? await exchangeGoogleCode(code)
      : await exchangeMicrosoftCode(code);

  if (profile.provider !== provider) {
    throw Object.assign(new Error('Provider mismatch'), { statusCode: 400 });
  }

  const { userId } = await findOrCreateUserFromOAuthProfile(profile);

  const plainCode = randomOpaqueToken();
  const codeHash = sha256Hex(plainCode);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.insert(oauthLoginCodes).values({
    codeHash,
    userId,
    expiresAt,
  });

  const redirect = new URL(row.returnUrl);
  redirect.searchParams.set('code', plainCode);
  return { redirectTo: redirect.toString() };
}

export async function exchangeOAuthLoginCode(plainCode: string): Promise<{
  token: string;
  user: { id: string; email: string; name: string | null };
  tenants: { id: string; name: string; plan: string }[];
}> {
  const codeHash = sha256Hex(plainCode);
  const [row] = await db
    .select()
    .from(oauthLoginCodes)
    .where(eq(oauthLoginCodes.codeHash, codeHash))
    .limit(1);

  if (!row || row.consumedAt || row.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired login code'), {
      statusCode: 401,
    });
  }

  await db
    .update(oauthLoginCodes)
    .set({ consumedAt: new Date() })
    .where(eq(oauthLoginCodes.id, row.id));

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const userTenants = await db
    .select({ id: tenants.id, name: tenants.name, plan: tenants.plan })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, user.id));

  const token = await createToken({ userId: user.id, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
    },
    tenants: userTenants,
  };
}
