import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_DEMO_CLINIC_HREF, TECHNICAL_ENGINE_HREF } from '@/lib/marketing/public-links';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

import DocsAliasPage from './docs/page';
import PlatformPage from './platform/page';

describe('marketing route redirects', () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it('redirects /platform to the clinic demo', () => {
    expect(() => PlatformPage()).toThrow(`redirect:${PUBLIC_DEMO_CLINIC_HREF}`);
    expect(redirectMock).toHaveBeenCalledWith(PUBLIC_DEMO_CLINIC_HREF);
  });

  it('redirects /docs to the relocated technical engine page', () => {
    expect(() => DocsAliasPage()).toThrow(`redirect:${TECHNICAL_ENGINE_HREF}`);
    expect(redirectMock).toHaveBeenCalledWith(TECHNICAL_ENGINE_HREF);
  });
});
