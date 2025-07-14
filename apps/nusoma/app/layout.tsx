import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { PublicEnvScript } from 'next-runtime-env'
import { createLogger } from '@/lib/logger/console-logger'
import Providers from './(dashboard)/workspace/components/providers/providers'
import './styles/global.css'
import './styles/text-editor.css'
import './styles/posemirrow.css'
import { DesignSystemProvider } from '@nusoma/design-system'
import { fonts } from '@nusoma/design-system/lib/fonts'
import { ZoomPrevention } from './zoom-prevention'

const logger = createLogger('RootLayout')

// Add browser extension attributes that we want to ignore
const BROWSER_EXTENSION_ATTRIBUTES = [
  'data-new-gr-c-s-check-loaded',
  'data-gr-ext-installed',
  'data-gr-ext-disabled',
  'data-grammarly',
  'data-fgm',
  'data-lt-installed',
  // Add other known extension attributes here
]

if (typeof window !== 'undefined') {
  const originalError = console.error
  console.error = (...args) => {
    if (args[0].includes('Hydration')) {
      const isExtensionError = BROWSER_EXTENSION_ATTRIBUTES.some((attr) =>
        args.some((arg) => typeof arg === 'string' && arg.includes(attr))
      )

      if (!isExtensionError) {
        logger.error('Hydration Error', {
          details: args,
          componentStack: args.find(
            (arg) => typeof arg === 'string' && arg.includes('component stack')
          ),
        })
      }
    }
    originalError.apply(console, args)
  }
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'nusoma',
  description:
    'Build agents in seconds with a drag and drop worker builder. Streamline your automation processes, boost productivity, and create custom workers.',
  applicationName: 'nusoma',
  authors: [{ name: 'Simplicity' }],
  generator: 'Next.js',
  keywords: [
    'worker automation',
    'drag and drop',
    'agents',
    'Simplicity',
    'worker builder',
    'automation tools',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Simplicity',
  publisher: 'Simplicity',
  metadataBase: new URL('https://nusoma.app'), // Replace with your actual domain
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nusoma',
    title: 'nusoma | Create Workers with Drag and Drop Agents',
    description:
      'Build agents in seconds with a drag and drop worker builder. Streamline your automation processes, boost productivity, and create custom workers.',
    siteName: 'nusoma',
    images: [
      {
        url: 'https://nusoma/social/facebook.png',
        width: 1200,
        height: 600,
        alt: 'nusoma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nusoma',
    description:
      'Build agents in seconds with a drag and drop worker builder. Streamline your automation processes, boost productivity, and create custom workers.',
    images: ['https://nusoma/social/twitter.png'],
    creator: '@simplicity',
    site: '@nusoma',
  },
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      {
        url: '/favicon/favicon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/favicon/favicon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      { url: '/nusoma.png', sizes: 'any', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
    shortcut: '/favicon/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'nusoma',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#ffffff',
    'msapplication-config': '/favicon/browserconfig.xml',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className={fonts} suppressHydrationWarning>
      <head>
        {/* Additional meta tags for sharing */}
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='600' />
        <meta name='twitter:image:width' content='1200' />
        <meta name='twitter:image:height' content='675' />
        <meta name='twitter:image:alt' content='nusoma' />
        <meta name='twitter:image' content='https://nusoma/social/twitter.png' />
        <meta name='twitter:url' content='https://nusoma' />
        <meta property='og:image:alt' content='nusoma' />
        <link rel='image_src' href='https://nusoma/social/facebook.png' />
        {/* Instagram image meta */}
        <meta property='og:image' content='https://nusoma/social/instagram.png' />
        <meta property='og:image:width' content='1080' />
        <meta property='og:image:height' content='1080' />
        <PublicEnvScript />
      </head>
      <body>
        <DesignSystemProvider>
          <ZoomPrevention />
          <Providers>{children}</Providers>
          <SpeedInsights />
        </DesignSystemProvider>
      </body>
    </html>
  )
}
