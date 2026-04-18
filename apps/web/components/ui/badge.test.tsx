import { describe, expect, it } from 'vitest';

import { badgeVariants } from './badge';

/**
 * Pure CVA assertions — no DOM rendering needed. We're verifying the
 * variant matrix because Badge is now consumed by 36 files; a regression
 * in the class string is the kind of bug that hides until visual QA.
 */
describe('badgeVariants', () => {
  it('keeps the legacy default variant string when called with no args', () => {
    const classes = badgeVariants();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
  });

  it('preserves the `outline` variant when no tone is set', () => {
    const classes = badgeVariants({ variant: 'outline' });
    expect(classes).toContain('text-foreground');
    expect(classes).not.toContain('bg-info-subtle');
  });

  it('paints the info tone with the subtle background by default', () => {
    const classes = badgeVariants({ tone: 'info' });
    expect(classes).toContain('bg-info-subtle');
    expect(classes).toContain('text-info');
  });

  it('combines outline + tone into a transparent fill with tonal border', () => {
    const classes = badgeVariants({ variant: 'outline', tone: 'success' });
    expect(classes).toContain('border-success/40');
    expect(classes).toContain('text-success');
    expect(classes).toContain('bg-transparent');
  });

  it('treats neutral tone as a no-op layered on top of variant', () => {
    const explicit = badgeVariants({ variant: 'secondary', tone: 'neutral' });
    const implicit = badgeVariants({ variant: 'secondary' });
    expect(explicit).toBe(implicit);
  });
});
