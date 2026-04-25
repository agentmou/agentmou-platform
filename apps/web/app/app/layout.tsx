import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthStoreBootstrap } from '@/components/auth/auth-store-bootstrap';
import { getServerAuthSnapshot } from '@/lib/auth/server-session';
import { getAppUrl } from '@/lib/runtime/public-origins';

import './app.css';

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppSurfaceLayout({ children }: { children: ReactNode }) {
  const snapshot = await getServerAuthSnapshot();

  return <AuthStoreBootstrap snapshot={snapshot}>{children}</AuthStoreBootstrap>;
}
