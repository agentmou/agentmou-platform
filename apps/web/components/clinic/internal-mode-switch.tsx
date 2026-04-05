'use client';

import Link from 'next/link';
import { LayoutPanelTop } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function InternalModeSwitch({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Button variant="outline" size="sm" className="gap-2">
        <LayoutPanelTop className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}
