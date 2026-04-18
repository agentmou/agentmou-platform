import { cn } from '@/lib/utils';

/**
 * Loading placeholder primitive.
 *
 * Uses `bg-muted` (a gentle grey) rather than `bg-accent` so skeletons no
 * longer pulse in the mint brand colour — that was visually noisy when
 * stacking 4-6 placeholder rows on a list view.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
