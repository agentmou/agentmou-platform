import { PUBLIC_APP_LOGIN_HREF, PUBLIC_DEMO_CLINIC_HREF } from './public-links';

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
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Módulos', href: '/#modulos' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Seguridad', href: '/security' },
  { label: 'Solicitar demo', href: '/contact-sales' },
] as const;

export const publicMarketingFooterColumns: readonly MarketingFooterColumn[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Recepción IA', href: '/#producto' },
      { label: 'Cómo funciona', href: '/#como-funciona' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Módulos',
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
      { label: 'Telefonía cloud', href: '/#integraciones' },
      { label: 'Agenda y PMS', href: '/#integraciones' },
    ],
  },
  {
    title: 'Seguridad',
    links: [
      { label: 'Seguridad', href: '/security' },
      { label: 'Privacidad por clínica', href: '/security#aislamiento' },
      { label: 'Revisión humana', href: '/security#control' },
    ],
  },
  {
    title: 'Acceso',
    links: [
      { label: 'Ver demo clinic', href: PUBLIC_DEMO_CLINIC_HREF },
      { label: 'Solicitar demo', href: '/contact-sales' },
      { label: 'Iniciar sesión', href: PUBLIC_APP_LOGIN_HREF },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Cookies', href: '/cookies' },
      { label: 'Privacidad', href: '/privacy' },
      { label: 'Términos', href: '/terms' },
    ],
  },
] as const;
