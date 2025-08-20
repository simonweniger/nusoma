import type { NextConfig } from 'next';

const svgTestRegex = /\.svg$/i;
const jsTsxIssuerRegex = /\.[jt]sx?$/;

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v3.fal.media',
        port: '',
        pathname: '/files/**',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // biome-ignore lint/suspicious/useAwait: "rewrites is async"
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
  webpack(config) {
    // Simple SVGR configuration
    config.module.rules.push({
      test: svgTestRegex,
      issuer: jsTsxIssuerRegex,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;
