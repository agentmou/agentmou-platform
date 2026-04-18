import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminShell } from '@/components/admin/admin-shell';
import { AuthStoreBootstrap } from '@/components/auth/auth-store-bootstrap';
import { getServerAuthSnapshot } from '@/lib/auth/server-session';
import { getAppUrl } from '@/lib/runtime/public-origins';

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: 'Admin | Agentmou',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const snapshot = await getServerAuthSnapshot();

  return (
    <AuthStoreBootstrap snapshot={snapshot}>
      <AdminShell>{children}</AdminShell>
    </AuthStoreBootstrap>
  );
}
