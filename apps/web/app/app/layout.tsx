import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getAppUrl } from '@/lib/runtime/public-origins';

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppSurfaceLayout({ children }: { children: ReactNode }) {
  return children;
}
