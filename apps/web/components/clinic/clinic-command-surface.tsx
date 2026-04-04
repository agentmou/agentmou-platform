'use client';

import * as React from 'react';

import { CommandPalette } from '@/components/control-plane/command-palette';

export function ClinicCommandSurface({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return <CommandPalette open={open} onOpenChange={onOpenChange} mode="clinic" />;
}
