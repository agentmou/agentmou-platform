'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand';
import { ChatWidget } from '@/components/chat';
import { ThemeToggle } from '@/components/theme-toggle';
import { MinimalButton } from '@/components/ui/minimal-button';
import { DataProviderContext } from '@/lib/providers/context';
import { mockProvider } from '@/lib/providers/demo';
import { PUBLIC_APP_LOGIN_HREF } from '@/lib/marketing/public-links';
import { publicMarketingFooterColumns, publicMarketingNavLinks } from '@/lib/marketing/site-config';

const primaryNavLinks = publicMarketingNavLinks.slice(0, -1);
const demoNavLink = publicMarketingNavLinks[publicMarketingNavLinks.length - 1] ?? {
  label: 'Solicitar demo',
  href: '/contact-sales',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProviderContext.Provider value={mockProvider}>
      <div
        data-surface="marketing"
        className="surface-marketing min-h-screen bg-[var(--marketing-bg-base)]"
      >
        <header className="fixed left-0 right-0 top-0 z-50 bg-[var(--marketing-bg-base)]/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
            <Link href="/" className="flex items-center transition-transform hover:scale-[1.02]">
              <Logo variant="header" />
            </Link>

            <nav className="hidden items-center gap-7 md:flex">
              {primaryNavLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-editorial-tiny transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle variant="icon" className="size-8" />
              <Link href={PUBLIC_APP_LOGIN_HREF}>
                <MinimalButton variant="text" size="sm" className="text-editorial-tiny">
                  Sign in
                </MinimalButton>
              </Link>
              <Link href={demoNavLink.href}>
                <MinimalButton size="sm" className="text-xs">
                  {demoNavLink.label}
                  <ArrowRight className="h-3 w-3" />
                </MinimalButton>
              </Link>
            </div>
          </div>
          <div className="h-px bg-border/50" />
        </header>

        <main className="pt-16">{children}</main>

        <footer className="mt-8 border-t border-border/50 bg-[var(--marketing-bg-base)]">
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-16 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_1.2fr_1fr]">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="flex items-center">
                  <Logo variant="footer" />
                </Link>
                <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Recepcion IA multicanal para clinicas dentales. WhatsApp, llamadas, agenda y
                  recuperacion de pacientes desde una misma superficie.
                </p>
              </div>

              {publicMarketingFooterColumns.map((column) => (
                <div key={column.title}>
                  <h4 className="mb-4 text-editorial-tiny">{column.title}</h4>
                  <ul className="space-y-2.5">
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.href}-${link.label}`}>
                        <Link
                          href={link.href}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-16 border-t border-border/30 pt-8">
              <p className="text-[11px] text-muted-foreground">
                &copy; {new Date().getFullYear()} Agentmou. Recepcion, agenda y recuperacion de
                ingresos para clinicas.
              </p>
            </div>
          </div>
        </footer>

        <footer className="footer bg-[var(--marketing-bg-base)]">
          <div className="footer-brand">Agentmou</div>
          <div className="footer-gradient" aria-hidden />
        </footer>

        <ChatWidget mode="public" />
      </div>
    </DataProviderContext.Provider>
  );
}
