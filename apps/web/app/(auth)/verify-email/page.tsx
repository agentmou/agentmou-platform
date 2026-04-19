'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { resendVerificationApi, verifyEmailApi } from '@/lib/auth/api';

type VerifyState = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') ?? '';
  const [email, setEmail] = React.useState(initialEmail);
  const [state, setState] = React.useState<VerifyState>(token ? 'loading' : 'idle');
  const [message, setMessage] = React.useState(
    token
      ? 'Estamos confirmando tu cuenta...'
      : 'Te enviaremos otro enlace de confirmación si todavía está pendiente.'
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setState('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await verifyEmailApi(token);
        if (cancelled) {
          return;
        }

        setState('success');
        setMessage('Tu email ya está confirmado. Ya puedes iniciar sesión.');
        toast.success('Email confirmado correctamente');
      } catch (error) {
        if (cancelled) {
          return;
        }

        const nextMessage =
          error instanceof Error
            ? error.message
            : 'No hemos podido confirmar el email. Prueba a pedir un nuevo enlace.';
        setState('error');
        setMessage(nextMessage);
        toast.error(nextMessage);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Introduce el email de la cuenta');
      return;
    }

    setIsSubmitting(true);
    try {
      await resendVerificationApi(email.trim());
      setState('idle');
      setMessage('Si la cuenta sigue pendiente, acabamos de reenviar el email de confirmación.');
      toast.success('Verificación reenviada');
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'No hemos podido reenviar el email.';
      setState('error');
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md border-border/70 bg-background/90 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">Verifica tu email</CardTitle>
        <CardDescription>
          {token
            ? 'Tu acceso con contraseña queda bloqueado hasta completar esta confirmación.'
            : 'El registro con email y contraseña requiere confirmación antes de abrir sesión.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          {state === 'loading' ? (
            <span className="flex items-center gap-2">
              <Spinner className="size-4" />
              {message}
            </span>
          ) : (
            message
          )}
        </div>

        {state !== 'success' ? (
          <form onSubmit={handleResend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email-address">Email</Label>
              <Input
                id="verify-email-address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@empresa.com"
                disabled={isSubmitting || state === 'loading'}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || state === 'loading'}>
              {isSubmitting ? 'Reenviando...' : 'Reenviar verificación'}
            </Button>
          </form>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            variant={state === 'success' ? 'default' : 'outline'}
            onClick={() => router.push('/login')}
          >
            Ir a iniciar sesión
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/register">Volver al registro</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

