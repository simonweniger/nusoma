import path from 'path'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import { env } from '@/lib/env'

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'oaidalleapiprodscus.blob.core.windows.net',
      'api.stability.ai',
    ],
  },
  output: 'standalone',
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  experimental: {
    optimizeCss: true,
  },
  ...(env.NODE_ENV === 'development' && {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }),
  webpack: (config, { isServer, dev }) => {
    // Skip webpack configuration in development when using Turbopack
    if (dev && env.NEXT_RUNTIME === 'turbopack') {
      return config
    }

    // Configure webpack to use filesystem cache for faster incremental builds
    if (config.cache) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: path.resolve(process.cwd(), '.next/cache/webpack'),
      }
    }

    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.join(__dirname, '../../node_modules/react'),
        'react-dom': path.join(__dirname, '../../node_modules/react-dom'),
      }
    }

    return config
  },
  transpilePackages: ['@react-email/components', '@react-email/render'],
  async headers() {
    return [
      {
        // API routes CORS headers
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,OPTIONS,PUT,DELETE',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key',
          },
        ],
      },
      // For worker execution API endpoints
      {
        source: '/api/workers/:id/execute',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,OPTIONS,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key',
          },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval'; connect-src *;",
          },
        ],
      },
      {
        // Apply Cross-Origin Isolation headers to all routes except those that use the Google Drive Picker
        source: '/((?!w/.*|api/tools/drive).*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // For routes that use the Google Drive Picker, only apply COOP but not COEP
        source: '/(w/.*|api/tools/drive)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      // Apply security headers to all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://apis.google.com https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://*.vercel.live https://vercel.com https://*.vercel.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.googleusercontent.com https://*.google.com https://*.atlassian.com https://cdn.discordapp.com https://*.githubusercontent.com; media-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${process.env.NEXT_PUBLIC_APP_URL || ''} ${env.OLLAMA_URL || 'http://localhost:11434'} ws://127.0.0.1:54321 http://127.0.0.1:54321 ws://localhost:54321 http://localhost:54321 https://api.browser-use.com https://*.googleapis.com https://*.amazonaws.com https://*.s3.amazonaws.com https://*.blob.core.windows.net https://*.vercel-insights.com https://*.atlassian.com https://vercel.live https://*.vercel.live https://vercel.com https://*.vercel.app https://api.liveblocks.io https://*.liveblocks.io wss://*.liveblocks.io; frame-src https://drive.google.com https://*.google.com; frame-ancestors 'self'; form-action 'self'; base-uri 'self'; object-src 'none'`,
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
    ]
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
}

const sentryConfig = {
  silent: true,
  org: env.SENTRY_ORG || '',
  project: env.SENTRY_PROJECT || '',
  authToken: env.SENTRY_AUTH_TOKEN || undefined,
  disableSourceMapUpload: env.NODE_ENV !== 'production',
  autoInstrumentServerFunctions: env.NODE_ENV === 'production',
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludePerformanceMonitoring: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
}

export default env.NODE_ENV === 'development'
  ? nextConfig
  : withSentryConfig(nextConfig, sentryConfig)
