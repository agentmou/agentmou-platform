import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MARKETING_PUBLIC_BASE_URL: process.env.MARKETING_PUBLIC_BASE_URL ?? '',
    APP_PUBLIC_BASE_URL: process.env.APP_PUBLIC_BASE_URL ?? '',
    API_PUBLIC_BASE_URL: process.env.API_PUBLIC_BASE_URL ?? '',
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Legacy /app/:tenantId/platform/* aliases. The routing layer in
      // lib/tenant-routing.ts treats /platform/* as a compat alias and the
      // canonical routes live at /app/:tenantId/*. Redirect permanently so
      // external deeplinks keep working while the physical pages are removed.
      {
        source: '/app/:tenantId/platform',
        destination: '/app/:tenantId/dashboard',
        permanent: true,
      },
      {
        source: '/app/:tenantId/platform/:path*',
        destination: '/app/:tenantId/:path*',
        permanent: true,
      },
      // Legacy /app/:tenantId/admin/* admin console — moved to top-level
      // /admin/* so the URL no longer carries the actor's tenantId. The actor
      // is resolved from the auth-store / cookie. Permanent redirects preserve
      // any external deeplinks an operator may have bookmarked.
      {
        source: '/app/:tenantId/admin',
        destination: '/admin/tenants',
        permanent: true,
      },
      {
        source: '/app/:tenantId/admin/:path*',
        destination: '/admin/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
