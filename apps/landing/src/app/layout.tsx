import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Navbar } from '@/components/sections/navbar'
import { ThemeProvider } from '@/components/theme-provider'
import { siteConfig } from '@/lib/site'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  themeColor: 'black',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  applicationName: siteConfig.name,
  description: siteConfig.description,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      {/* <head>
        <Script src="https://unpkg.com/react-scan/dist/auto.global.js" />
      </head> */}

      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background font-sans antialiased`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <div className='relative mx-auto max-w-7xl border-x'>
            <div className='absolute top-0 left-6 z-10 block h-full w-px border-border border-l' />
            <div className='absolute top-0 right-6 z-10 block h-full w-px border-border border-r' />
            <Navbar />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
