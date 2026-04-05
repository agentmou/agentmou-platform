export interface MarketingNavItem {
  label: string;
  href: string;
}

export interface MarketingFooterColumn {
  title: string;
  links: MarketingNavItem[];
}

export const publicMarketingNavLinks: readonly MarketingNavItem[] = [
  { label: 'Producto', href: '/#producto' },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Modulos', href: '/#modulos' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Seguridad', href: '/security' },
  { label: 'Solicitar demo', href: '/contact-sales' },
] as const;

export const publicMarketingFooterColumns: readonly MarketingFooterColumn[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Recepcion IA', href: '/#producto' },
      { label: 'Como funciona', href: '/#como-funciona' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Modulos',
    links: [
      { label: 'Core Reception', href: '/#modulos' },
      { label: 'Voice', href: '/#modulos' },
      { label: 'Growth', href: '/#modulos' },
    ],
  },
  {
    title: 'Integraciones',
    links: [
      { label: 'WhatsApp', href: '/#integraciones' },
      { label: 'Telefonia cloud', href: '/#integraciones' },
      { label: 'Agenda y PMS', href: '/#integraciones' },
    ],
  },
  {
    title: 'Seguridad',
    links: [
      { label: 'Seguridad', href: '/security' },
      { label: 'Privacidad por clinica', href: '/security#aislamiento' },
      { label: 'Revision humana', href: '/security#control' },
    ],
  },
  {
    title: 'Plataforma',
    links: [
      { label: 'Engine interno', href: '/platform' },
      { label: 'Docs tecnicos', href: '/platform' },
      { label: 'Iniciar sesion', href: '/login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '/security' },
      { label: 'Terminos', href: '/security' },
    ],
  },
] as const;
