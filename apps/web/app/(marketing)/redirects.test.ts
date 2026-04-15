import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    expect(() => PlatformPage()).toThrow('redirect:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('redirects /docs back to the marketing home', () => {
    expect(() => DocsAliasPage()).toThrow('redirect:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });
});
