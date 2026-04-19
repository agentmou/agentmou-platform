'use client';

import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FrozenTenantPage() {
  const searchParams = useSearchParams();
  const tenantName = searchParams.get('tenantName') ?? 'este tenant';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg border-border/70 bg-background/95 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">Cuenta congelada</CardTitle>
          <CardDescription>
            El acceso a {tenantName} está congelado temporalmente. La consola admin global sigue
            pudiendo gestionarlo, pero los usuarios del tenant no pueden entrar en el workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Si eres cliente, contacta con Agentmou para reactivar la cuenta. Si eres administrador
            global, descongela el tenant desde la sección Admin.
          </p>
          <form action="/logout" method="post">
            <Button type="submit" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
