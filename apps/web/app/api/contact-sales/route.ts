import { NextRequest, NextResponse } from 'next/server';
import { ContactSalesLeadSchema } from '@/lib/marketing/contact-sales';

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value === 'undefined' || value === 'null') {
    return undefined;
  }

  return value;
}

function resolveContactSalesEnv() {
  return {
    webhookUrl: readOptionalEnv('CONTACT_SALES_WEBHOOK_URL'),
    webhookToken: readOptionalEnv('CONTACT_SALES_WEBHOOK_TOKEN'),
    nodeEnv: process.env.NODE_ENV,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Payload invalido.' }, { status: 400 });
  }

  const parsed = ContactSalesLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: 'Revisa los campos del formulario.',
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { webhookUrl, webhookToken, nodeEnv } = resolveContactSalesEnv();
  const lead = parsed.data;
  const payload = {
    ...lead,
    submittedAt: new Date().toISOString(),
    source: 'agentmou_web_contact_sales',
  };

  if (!webhookUrl) {
    if (nodeEnv !== 'production') {
      console.info('[contact-sales] webhook not configured, accepting lead in non-production', {
        clinicName: payload.clinicName,
        workEmail: payload.workEmail,
        sourcePath: payload.sourcePath,
      });
      return NextResponse.json({
        message: 'Solicitud recibida. En desarrollo la dejamos registrada sin webhook.',
      });
    }

    return NextResponse.json(
      { message: 'El canal comercial no esta configurado todavia.' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[contact-sales] webhook delivery failed', response.status, text);
      return NextResponse.json(
        { message: 'No hemos podido enviar tu solicitud ahora mismo.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: 'Gracias. Hemos recibido tu solicitud y te contactaremos pronto.',
    });
  } catch (error) {
    console.error('[contact-sales] webhook request failed', error);
    return NextResponse.json(
      { message: 'No hemos podido enviar tu solicitud ahora mismo.' },
      { status: 502 }
    );
  }
}
