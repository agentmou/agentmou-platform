import { getApiConfig } from '../config.js';

export interface SendPasswordResetEmailParams {
  email: string;
  link: string;
  expiresAt: Date;
}

function buildPasswordResetEmailContent(params: SendPasswordResetEmailParams) {
  const expiryLabel = params.expiresAt.toISOString();
  const subject = 'Restablece tu contrasena de Agentmou';
  const text = [
    'Has solicitado restablecer tu contrasena en Agentmou.',
    '',
    'Usa este enlace para elegir una nueva contrasena:',
    params.link,
    '',
    `El enlace caduca en 1 hora (${expiryLabel}).`,
    'Si no has solicitado este cambio, puedes ignorar este email.',
  ].join('\n');
  const html = `
    <p>Has solicitado restablecer tu contrasena en Agentmou.</p>
    <p>
      <a href="${params.link}">Restablecer contrasena</a>
    </p>
    <p>El enlace caduca en 1 hora (${expiryLabel}).</p>
    <p>Si no has solicitado este cambio, puedes ignorar este email.</p>
  `.trim();

  return {
    subject,
    text,
    html,
  };
}

export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams) {
  const config = getApiConfig();
  const { subject, text, html } = buildPasswordResetEmailContent(params);

  if (!config.passwordResetWebhookUrl) {
    if (process.env.LOG_PASSWORD_RESET_LINK === '1' || process.env.NODE_ENV !== 'production') {
      process.stdout.write(`[auth] password reset link for ${params.email}: ${params.link}\n`);
    }
    return { delivery: 'logged' as const };
  }

  const response = await fetch(config.passwordResetWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.passwordResetWebhookToken
        ? { Authorization: `Bearer ${config.passwordResetWebhookToken}` }
        : {}),
    },
    body: JSON.stringify({
      event: 'password_reset',
      to: params.email,
      subject,
      text,
      html,
      resetLink: params.link,
      expiresAt: params.expiresAt.toISOString(),
      source: 'agentmou_api_auth',
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw Object.assign(new Error('Password reset email delivery failed'), {
      statusCode: 502,
      responseStatus: response.status,
      responseText,
    });
  }

  return { delivery: 'webhook' as const };
}
