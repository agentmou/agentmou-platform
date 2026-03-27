'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { exchangeOAuthLoginCode } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import { Spinner } from '@/components/ui/spinner';

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applyOAuthExchange = useAuthStore((s) => s.applyOAuthExchange);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = searchParams.get('code');
    const err = searchParams.get('error');
    if (err) {
      toast.error('Sign-in was cancelled or failed.');
      router.replace('/login');
      return;
    }
    if (!code) {
      toast.error('Missing authorization code.');
      router.replace('/login');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await exchangeOAuthLoginCode(code);
        if (cancelled) return;
        const tenantId = applyOAuthExchange(res, false);
        const redirect = searchParams.get('redirect');
        router.replace(redirect || `/app/${tenantId}/dashboard`);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Could not complete sign-in.';
        toast.error(msg);
        router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyOAuthExchange, router, searchParams]);

  return (
    <div
      className="flex min-h-[200px] flex-col items-center justify-center gap-3"
      aria-busy="true"
      aria-label="Completing sign-in"
    >
      <Spinner className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
