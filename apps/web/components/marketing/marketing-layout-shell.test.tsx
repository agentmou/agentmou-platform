import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="analytics-marker" />,
}));

vi.mock('@/components/chat', () => ({
  ChatWidget: () => null,
}));

import { MarketingLayoutShell } from './marketing-layout-shell';

describe('MarketingLayoutShell', () => {
  it('shows the cookie banner and withholds analytics before consent', () => {
    const html = renderToStaticMarkup(
      <MarketingLayoutShell initialConsent={null}>
        <div>Contenido marketing</div>
      </MarketingLayoutShell>
    );

    expect(html).toContain('Aceptar analítica');
    expect(html).toContain('Rechazar opcionales');
    expect(html).not.toContain('analytics-marker');
  });

  it('renders analytics once consent is already accepted', () => {
    const html = renderToStaticMarkup(
      <MarketingLayoutShell initialConsent="accepted">
        <div>Contenido marketing</div>
      </MarketingLayoutShell>
    );

    expect(html).toContain('analytics-marker');
    expect(html).not.toContain('Aceptar analítica');
  });

  it('keeps analytics disabled when consent was rejected', () => {
    const html = renderToStaticMarkup(
      <MarketingLayoutShell initialConsent="rejected">
        <div>Contenido marketing</div>
      </MarketingLayoutShell>
    );

    expect(html).not.toContain('analytics-marker');
    expect(html).not.toContain('Aceptar analítica');
  });
});
