import './globals.css'
import { Yatra_One, Lora, Noto_Sans_Devanagari, Cormorant_Garamond, Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import CartProvider from '@/lib/cart-context'
import { AuthProvider } from '@/lib/auth-context'
import WhatsAppButton from '@/components/layout/whatsapp-button'

const yatra = Yatra_One({ subsets: ['latin'], weight: '400', variable: '--font-yatra', display: 'swap' })
const lora = Lora({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-lora', display: 'swap' })
const notoDev = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400','600','700'], variable: '--font-noto-dev', display: 'swap' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-cormorant', display: 'swap' })
const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter', display: 'swap' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SRIDATTAM — Premium Incense & Fragrance for Daily Rituals',
    template: '%s | SRIDATTAM',
  },
  description: 'Handcrafted premium incense sticks, natural resins, and essential oils. Authentic wellness fragrances rooted in ancient wisdom.',
  openGraph: {
    title: 'SRIDATTAM — Premium Incense & Fragrance',
    description: 'Elevate your everyday into a ritual with authentic botanical incense.',
    url: SITE_URL,
    siteName: 'SRIDATTAM',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SRIDATTAM — Premium Incense & Fragrance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SRIDATTAM — Premium Incense & Fragrance',
    description: 'Elevate your everyday into a ritual with authentic botanical incense.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#FFF3C1',
  colorScheme: 'light',
}

const siteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'SRIDATTAM',
      url: SITE_URL,
      logo: `${SITE_URL}/Mainlogo.svg`,
    },
    {
      '@type': 'WebSite',
      name: 'SRIDATTAM',
      url: SITE_URL,
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${yatra.variable} ${lora.variable} ${notoDev.variable} ${cormorant.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
      </head>
      <body className="min-h-screen bg-white text-midnight font-inter relative">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var registration of registrations) {
                    registration.unregister().then(function() {
                      console.log('Unregistered service worker successfully');
                    });
                  }
                });
              }
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  for (var name of names) {
                    caches.delete(name);
                  }
                });
              }
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('CSS chunk') !== -1)) {
                  window.location.reload();
                }
              });
            `
          }}
        />
        <CartProvider>
          <AuthProvider>
            {children}
            <WhatsAppButton />
            <Toaster position="top-center" richColors duration={2000} />
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  )
}
