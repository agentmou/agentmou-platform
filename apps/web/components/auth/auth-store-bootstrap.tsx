'use client';

import * as React from 'react';

import { bootstrapAuthStore, type AuthSnapshot } from '@/lib/auth/store';

export function AuthStoreBootstrap({
  snapshot,
  children,
}: {
  snapshot: AuthSnapshot;
  children: React.ReactNode;
}) {
  React.useLayoutEffect(() => {
    bootstrapAuthStore(snapshot);
  }, [snapshot]);

  return <>{children}</>;
}
