import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand';
import { AuthStoreBootstrap } from '@/components/auth/auth-store-bootstrap';
import { getServerAuthSnapshot } from '@/lib/auth/server-session';
import { getAppUrl } from '@/lib/runtime/public-origins';

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const snapshot = await getServerAuthSnapshot();

  return (
    <AuthStoreBootstrap snapshot={snapshot}>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 items-center px-6">
          <Link href="/" className="flex items-center group">
            <Logo variant="header" />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12 pb-16">
          {children}
        </main>
      </div>
    </AuthStoreBootstrap>
  );
}
