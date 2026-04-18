import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Card surface primitive.
 *
 * The `variant` and `padding` props are additive (PR-05): existing call
 * sites that pass only `className` keep their previous look, because the
 * legacy classes are folded into the `default` variant. New code should
 * prefer the `variant` API to opt into the semantic surface tokens.
 */
const cardVariants = cva('flex flex-col gap-6 transition-colors', {
  variants: {
    variant: {
      // Legacy default — preserved bit for bit so unmigrated call sites
      // keep their elevated white card with a subtle shadow.
      default: 'bg-card text-card-foreground rounded-xl border shadow-sm',
      // Same elevation as `default` but explicit about being a surface,
      // and uses the semantic border token. Use this for new admin pages.
      raised:
        'bg-surface-raised text-card-foreground rounded-xl border border-border-default shadow-sm',
      // Lighter surface for grouping inside a `default` container — e.g.
      // a filters bar that should read as "secondary depth".
      subtle: 'bg-surface-subtle text-card-foreground rounded-xl border border-border-subtle',
      // Outline-only — no fill. Useful for empty states and dashed groupings.
      outline: 'bg-transparent text-card-foreground rounded-xl border border-border-default',
      // No chrome at all — keeps the layout primitives so consumers can
      // wrap a fully-custom surface without losing CardHeader/Content.
      ghost: 'bg-transparent text-card-foreground',
    },
    padding: {
      none: 'py-0',
      sm: 'py-4',
      md: 'py-6',
      lg: 'py-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

export type CardVariant = NonNullable<VariantProps<typeof cardVariants>['variant']>;
export type CardPadding = NonNullable<VariantProps<typeof cardVariants>['padding']>;

function Card({
  className,
  variant,
  padding,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-card-variant={variant ?? 'default'}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};
