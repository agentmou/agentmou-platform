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
};

export default nextConfig;
