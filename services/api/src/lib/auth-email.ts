import { getApiConfig } from '../config.js';

interface BaseAuthEmailParams {
  email: string;
  link: string;
  expiresAt: Date;
  name?: string | null;
}

interface AuthEmailContent {
  subject: string;
  text: string;
  html: string;
}

function writeFallbackLog(kind: string, email: string, link: string) {
  process.stdout.write(`[auth] ${kind} link for ${email}: ${link}\n`);
}

async function deliverAuthEmail(
  kind: 'password_reset' | 'email_verification' | 'user_activation',
  params: BaseAuthEmailParams,
  content: AuthEmailContent
) {
  const config = getApiConfig();

  if (!config.resendApiKey || !config.resendFromEmail) {
    if (process.env.NODE_ENV !== 'production') {
      writeFallbackLog(kind, params.email, params.link);
      return { delivery: 'logged' as const };
    }

    throw new Error('Resend is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.resendApiKey}`,
    },
    body: JSON.stringify({
      from: config.resendFromEmail,
      to: params.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw Object.assign(new Error('Auth email delivery failed'), {
      statusCode: 502,
      responseStatus: response.status,
      responseText,
    });
  }

  return { delivery: 'resend' as const };
}

function buildPasswordResetEmailContent(params: BaseAuthEmailParams): AuthEmailContent {
  const expiryLabel = params.expiresAt.toISOString();
  return {
    subject: 'Restablece tu contrasena de Agentmou',
    text: [
      'Has solicitado restablecer tu contrasena en Agentmou.',
      '',
      'Usa este enlace para elegir una nueva contrasena:',
      params.link,
      '',
      `El enlace caduca en 1 hora (${expiryLabel}).`,
      'Si no has solicitado este cambio, puedes ignorar este email.',
    ].join('\n'),
    html: `
      <p>Has solicitado restablecer tu contrasena en Agentmou.</p>
      <p><a href="${params.link}">Restablecer contrasena</a></p>
      <p>El enlace caduca en 1 hora (${expiryLabel}).</p>
      <p>Si no has solicitado este cambio, puedes ignorar este email.</p>
    `.trim(),
  };
}

function buildEmailVerificationContent(params: BaseAuthEmailParams): AuthEmailContent {
  const expiryLabel = params.expiresAt.toISOString();
  const greeting = params.name?.trim() ? `Hola ${params.name.trim()},` : 'Hola,';

  return {
    subject: 'Confirma tu email en Agentmou',
    text: [
      greeting,
      '',
      'Confirma tu email para activar tu cuenta de Agentmou.',
      params.link,
      '',
      `El enlace caduca en 24 horas (${expiryLabel}).`,
      'Si no has creado una cuenta, puedes ignorar este email.',
    ].join('\n'),
    html: `
      <p>${greeting}</p>
      <p>Confirma tu email para activar tu cuenta de Agentmou.</p>
      <p><a href="${params.link}">Confirmar email</a></p>
      <p>El enlace caduca en 24 horas (${expiryLabel}).</p>
      <p>Si no has creado una cuenta, puedes ignorar este email.</p>
    `.trim(),
  };
}

function buildUserActivationContent(params: BaseAuthEmailParams): AuthEmailContent {
  const expiryLabel = params.expiresAt.toISOString();
  const greeting = params.name?.trim() ? `Hola ${params.name.trim()},` : 'Hola,';

  return {
    subject: 'Te han invitado a Agentmou',
    text: [
      greeting,
      '',
      'Se ha creado tu acceso a Agentmou.',
      'Usa este enlace para definir tu contrasena y activar tu cuenta:',
      params.link,
      '',
      `El enlace caduca en 1 hora (${expiryLabel}).`,
    ].join('\n'),
    html: `
      <p>${greeting}</p>
      <p>Se ha creado tu acceso a Agentmou.</p>
      <p><a href="${params.link}">Definir contrasena y activar cuenta</a></p>
      <p>El enlace caduca en 1 hora (${expiryLabel}).</p>
    `.trim(),
  };
}

export async function sendPasswordResetEmail(params: BaseAuthEmailParams) {
  return deliverAuthEmail('password_reset', params, buildPasswordResetEmailContent(params));
}

export async function sendEmailVerificationEmail(params: BaseAuthEmailParams) {
  return deliverAuthEmail('email_verification', params, buildEmailVerificationContent(params));
}

export async function sendUserActivationEmail(params: BaseAuthEmailParams) {
  return deliverAuthEmail('user_activation', params, buildUserActivationContent(params));
}
