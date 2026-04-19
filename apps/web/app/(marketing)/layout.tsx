import { cookies } from 'next/headers';
import { MarketingLayoutShell } from '@/components/marketing/marketing-layout-shell';
import {
  MARKETING_COOKIE_CONSENT_NAME,
  parseMarketingCookieConsent,
} from '@/lib/marketing/cookie-consent';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialConsent = parseMarketingCookieConsent(
    cookieStore.get(MARKETING_COOKIE_CONSENT_NAME)?.value
  );

  return <MarketingLayoutShell initialConsent={initialConsent}>{children}</MarketingLayoutShell>;
}
