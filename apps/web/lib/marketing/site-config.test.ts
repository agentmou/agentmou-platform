import { describe, expect, it } from 'vitest';
import { publicMarketingFooterColumns, publicMarketingNavLinks } from './site-config';

describe('publicMarketingNavLinks', () => {
  it('keeps the clinic marketing navigation focused on product, trust, and demo capture', () => {
    expect(publicMarketingNavLinks).toEqual([
      { label: 'Producto', href: '/#producto' },
      { label: 'Como funciona', href: '/#como-funciona' },
      { label: 'Modulos', href: '/#modulos' },
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
  it('points technical public links to /platform instead of /docs', () => {
    const platformColumn = publicMarketingFooterColumns.find(
      (column) => column.title === 'Plataforma'
    );

    expect(platformColumn?.links).toEqual([
      { label: 'Engine interno', href: '/platform' },
      { label: 'Docs tecnicos', href: '/platform' },
      { label: 'Iniciar sesion', href: '/login' },
    ]);
  });

  it('keeps footer links aligned with the clinic positioning', () => {
    const serialized = JSON.stringify(publicMarketingFooterColumns);

    expect(serialized).toContain('Recepcion IA');
    expect(serialized).toContain('WhatsApp');
    expect(serialized).not.toContain('/docs');
    expect(serialized).not.toContain('Marketplace');
  });
});
