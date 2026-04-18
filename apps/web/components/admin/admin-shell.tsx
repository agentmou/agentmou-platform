'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Minimal chrome for the canonical `/admin/*` console.
 *
 * The admin console is intentionally separate from the tenant shell:
 * - URLs do not carry an `actorTenantId` — the actor lives in the auth-store.
 * - The chrome only carries enough navigation to bounce back to the actor's
 *   tenant workspace and to sign out. Visual polish lands in PR-06.
 *
 * Non-platform-admin users that reach this surface get a friendly redirect to
 * `/app` rather than a 403 wall — `requirePlatformAdmin` on the API will
 * still reject any data calls, so the worst case is an empty list.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const activeTenantId = useAuthStore((state) => state.activeTenantId);
  const tenants = useAuthStore((state) => state.tenants);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!user) {
      router.replace('/login?redirect=/admin');
    }
  }, [isHydrated, router, user]);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    return null;
  }

  const actorTenant = tenants.find((tenant) => tenant.id === activeTenantId) ?? tenants[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background" data-surface="app">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/tenants" className="flex items-center" aria-label="Admin home">
            <Logo variant="header" />
          </Link>
          <span className="text-text-muted text-xs uppercase tracking-[0.12em]" aria-hidden>
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {actorTenant ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/app/${actorTenant.id}`} aria-label="Volver al workspace">
                Volver a {actorTenant.name}
              </Link>
            </Button>
          ) : null}
          <span className="text-text-muted hidden text-xs sm:inline">{user.email}</span>
          <form action="/logout" method="post">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              aria-label="Cerrar sesión y volver a la página de login"
            >
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
