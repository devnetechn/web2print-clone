import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { SITE_URL } from '@/lib/seo'
import './globals.css'

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2c327a',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      'Web2Print USA | Print That Means Business — Cards, Banners, Apparel & Business Services',
    template: '%s | Web2Print USA',
  },
  description:
    'Business cards, banners, custom apparel, and business services — LLC registration, web design, and getting found on Google. National print power, first-name service.',
  generator: 'v0.app',
  openGraph: {
    type: 'website',
    siteName: 'Web2Print USA',
    title: 'Web2Print USA | Print That Means Business',
    description:
      'Business cards, banners, custom apparel, and business services — national print power, first-name service.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Web2Print USA — Print That Means Business' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Web2Print USA | Print That Means Business',
    description:
      'Business cards, banners, custom apparel, and business services — national print power, first-name service.',
    images: ['/og-image.png'],
  },
  // Favicons are provided by the app/icon.png and app/apple-icon.png file
  // conventions (Web2Print "W2P" mark), which Next.js wires up automatically.
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans antialiased">
        {children}
        {/* Nothing rendered <Toaster />, so every toast() in the app resolved
            into an empty state update and the user saw nothing. The 4over
            transfer page raises nine of them - push succeeded, push rejected,
            sync failed - and all of them were silent, which reads exactly like
            a button that does nothing. */}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
