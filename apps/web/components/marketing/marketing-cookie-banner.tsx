'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { MarketingCookieConsent } from '@/lib/marketing/cookie-consent';

interface MarketingCookieBannerProps {
  onDecision: (consent: MarketingCookieConsent) => void;
}

export function MarketingCookieBanner({ onDecision }: MarketingCookieBannerProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-5xl border-border/70 bg-background/95 shadow-2xl backdrop-blur">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-editorial-tiny">Cookies</p>
            <p className="text-sm leading-6 text-foreground">
              Usamos cookies necesarias para que la web funcione y, si nos das permiso, analítica
              para entender mejor qué partes del sitio ayudan más a nuestros futuros clientes.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Puedes revisar el detalle en la{' '}
              <Link href="/cookies" className="underline underline-offset-4 hover:text-foreground">
                política de cookies
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-64 sm:items-stretch">
            <Button onClick={() => onDecision('accepted')}>Aceptar analítica</Button>
            <Button variant="outline" onClick={() => onDecision('rejected')}>
              Rechazar opcionales
            </Button>
            <Button asChild variant="ghost">
              <Link href="/cookies">Ver política de cookies</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
