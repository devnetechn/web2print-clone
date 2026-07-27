import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
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
  metadataBase: new URL('https://web2printusa.com'),
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
    images: [{ url: '/images/cat/business-cards/foil-worx.jpg', width: 600, height: 600, alt: 'Web2Print USA' }],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
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
