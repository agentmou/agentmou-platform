'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ClinicDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Width override; defaults to the prototype's min(420px, 92vw). */
  className?: string;
}

/**
 * Right-side detail drawer matching the Claude-Design prototype's
 * .drawer block. Backed by shadcn Sheet (Radix Dialog) for keyboard
 * and focus management, but applies the prototype's drawer chrome
 * (.drawer-hd / .drawer-body) and width.
 */
export function ClinicDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ClinicDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex w-[min(420px,92vw)] flex-col gap-0 border-l p-0 sm:max-w-[420px]',
          className
        )}
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-2xl)',
        }}
      >
        <SheetHeader className="drawer-hd flex flex-row items-center gap-3 space-y-0 border-0 p-0">
          <SheetTitle className="card-hd-title flex-1">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="sr-only">{description}</SheetDescription>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="icon-btn"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </SheetHeader>
        <div className="drawer-body">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
