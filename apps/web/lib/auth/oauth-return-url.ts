import { getAppUrl } from '@/lib/runtime/public-origins';

export function buildOAuthReturnUrl(redirect: string | null) {
  const callbackUrl = new URL(getAppUrl('/auth/callback'));
  if (redirect) {
    callbackUrl.searchParams.set('redirect', redirect);
  }

  return callbackUrl.toString();
}
