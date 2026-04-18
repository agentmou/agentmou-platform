import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Status / label badge.
 *
 * Two orthogonal axes (PR-05):
 *
 *  - `variant` (existing) controls the *fill style*: solid coloured
 *    `default`, soft `secondary`, hard-error `destructive`, or `outline`.
 *    Existing call sites keep working unchanged.
 *
 *  - `tone` (new) layers a semantic colour on top: `neutral` (default,
 *    no override), `info`, `success`, `warning`, `destructive`. When set,
 *    the tone fills the badge with the matching `*-subtle` background and
 *    paints the text in the saturated state colour. New code should
 *    prefer `tone` over hand-rolled `bg-*` / `text-*` overrides, which
 *    let the legacy badges (status-pill, risk badge, etc.) fork the
 *    palette in subtle ways.
 *
 * `variant="outline"` + `tone="..."` keeps the outline-only chrome and
 * adopts the tone for border + text — useful for chip-like summaries.
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
      tone: {
        neutral: '',
        info: 'border-transparent bg-info-subtle text-info',
        success: 'border-transparent bg-success-subtle text-success',
        warning: 'border-transparent bg-warning-subtle text-warning-foreground',
        destructive: 'border-transparent bg-destructive-subtle text-destructive',
      },
    },
    compoundVariants: [
      // Outline + tone keeps the empty fill and paints border + text.
      { variant: 'outline', tone: 'info', class: 'border-info/40 text-info bg-transparent' },
      {
        variant: 'outline',
        tone: 'success',
        class: 'border-success/40 text-success bg-transparent',
      },
      {
        variant: 'outline',
        tone: 'warning',
        class: 'border-warning/40 text-warning-foreground bg-transparent',
      },
      {
        variant: 'outline',
        tone: 'destructive',
        class: 'border-destructive/40 text-destructive bg-transparent',
      },
    ],
    defaultVariants: {
      variant: 'default',
      tone: 'neutral',
    },
  }
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

function Badge({
  className,
  variant,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      data-tone={tone ?? 'neutral'}
      className={cn(badgeVariants({ variant, tone }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
