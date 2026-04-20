import { describe, expect, it } from 'vitest';
import { publicMarketingFooterColumns, publicMarketingNavLinks } from './site-config';
import { PUBLIC_APP_LOGIN_HREF, PUBLIC_DEMO_CLINIC_HREF } from './public-links';

describe('publicMarketingNavLinks', () => {
  it('keeps the clinic marketing navigation focused on product, trust, and demo capture', () => {
    expect(publicMarketingNavLinks).toEqual([
      { label: 'Producto', href: '/#producto' },
      { label: 'Cómo funciona', href: '/#como-funciona' },
      { label: 'Módulos', href: '/#modulos' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Seguridad', href: '/security' },
      { label: 'Solicitar demo', href: '/contact-sales' },
    ]);
  });

  it('does not expose marketplace or runs in the primary public navigation', () => {
    const serialized = JSON.stringify(publicMarketingNavLinks);

    expect(serialized).not.toContain('Marketplace');
    expect(serialized.toLowerCase()).not.toContain('runs');
  });
});

describe('publicMarketingFooterColumns', () => {
  it('keeps the last footer column focused on access instead of platform storytelling', () => {
    const accessColumn = publicMarketingFooterColumns.find((column) => column.title === 'Acceso');

    expect(accessColumn?.links).toEqual([
      { label: 'Ver demo clinic', href: PUBLIC_DEMO_CLINIC_HREF },
      { label: 'Solicitar demo', href: '/contact-sales' },
      { label: 'Iniciar sesión', href: PUBLIC_APP_LOGIN_HREF },
    ]);
  });

  it('keeps footer links aligned with the clinic positioning and legal pages', () => {
    const serialized = JSON.stringify(publicMarketingFooterColumns);
    const legalColumn = publicMarketingFooterColumns.find((column) => column.title === 'Legal');

    expect(serialized).toContain('Recepción IA');
    expect(serialized).toContain('WhatsApp');
    expect(serialized).not.toContain('/platform');
    expect(serialized).not.toContain('Marketplace');
    expect(legalColumn?.links).toEqual([
      { label: 'Cookies', href: '/cookies' },
      { label: 'Privacidad', href: '/privacy' },
      { label: 'Términos', href: '/terms' },
    ]);
  });
});
