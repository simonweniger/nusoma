import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CoreProviders } from "./core-providers";
import { focal, hal, halMono, commitMono, inconsolata } from "@/lib/fonts";
import { BotIdClient } from "botid/client";
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Creative Canvas for GenAI | nusoma",
    template: "%s | nusoma",
  },
  description: "Create and share on your own creative canvas with GenAI.",
  keywords: [
    "AI style transfer",
    "image transformation",
    "flux model",
    "LoRA",
    "AI art",
    "nusoma",
    "creative canvas",
    "fal.ai",
    "photo styling",
    "artificial intelligence",
    "machine learning",
    "image generation",
  ],
  authors: [{ name: "fal.ai" }],
  creator: "fal.ai",
  publisher: "fal.ai",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Creative GenAI Canvas for Designers | nusoma",
    description: "Build your vision! With an GenAI canvas made for Designers.",
    siteName: "nusoma",
    images: [
      {
        url: "/og-img.png",
        width: 1200,
        height: 630,
        alt: "Creative GenAI Canvas for Designers | nusoma",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creative GenAI Canvas for Designers | nusoma",
    description: "Build your vision! With an GenAI canvas made for Designers.",
    creator: "@fal_ai",
    site: "@fal_ai",
    images: [
      {
        url: "/og-img.png",
        width: 1200,
        height: 630,
        alt: "Flux Kontext Dev - AI Style Transfer Demo",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={[
        hal.variable,
        halMono.variable,
        focal.variable,
        inconsolata.variable,
        commitMono.variable,
      ].join(" ")}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <script
          type="text/javascript"
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          async
        />
        <BotIdClient
          protect={[
            {
              path: "/api/trpc/*",
              method: "POST",
            },
            {
              path: "/api/fal",
              method: "POST",
            },
          ]}
        />
      </head>
      <body className={`font-sans bg-background text-foreground min-h-screen`}>
        <CoreProviders>
          <div className="root">{children}</div>
        </CoreProviders>
      </body>
      <Analytics />
    </html>
  );
}
