import { describe, expect, it } from 'vitest';

import { cardVariants } from './card';

describe('cardVariants', () => {
  it('matches the legacy default look when called with no args', () => {
    const classes = cardVariants();
    // The legacy class string used `bg-card`, `rounded-xl`, `border`,
    // `shadow-sm`, `py-6`. The default variant must keep emitting the
    // same atoms so unmigrated call sites do not visually drift.
    expect(classes).toContain('bg-card');
    expect(classes).toContain('rounded-xl');
    expect(classes).toContain('border');
    expect(classes).toContain('shadow-sm');
    expect(classes).toContain('py-6');
  });

  it('switches to the subtle surface and subtle border for `subtle`', () => {
    const classes = cardVariants({ variant: 'subtle' });
    expect(classes).toContain('bg-surface-subtle');
    expect(classes).toContain('border-border-subtle');
    expect(classes).not.toContain('shadow-sm');
  });

  it('drops the fill but keeps the border on `outline`', () => {
    const classes = cardVariants({ variant: 'outline' });
    expect(classes).toContain('bg-transparent');
    expect(classes).toContain('border-border-default');
  });

  it('skips chrome entirely on `ghost`', () => {
    const classes = cardVariants({ variant: 'ghost' });
    expect(classes).toContain('bg-transparent');
    expect(classes).not.toContain('border-border-default');
    expect(classes).not.toContain('rounded-xl');
  });

  it('honours the padding scale', () => {
    expect(cardVariants({ padding: 'none' })).toContain('py-0');
    expect(cardVariants({ padding: 'sm' })).toContain('py-4');
    expect(cardVariants({ padding: 'lg' })).toContain('py-8');
  });
});
