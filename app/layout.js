import './globals.css'
import { Yatra_One, Lora, Noto_Sans_Devanagari, Cormorant_Garamond, Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import CartProvider from '@/lib/cart-context'
import MandalaBackground from '@/components/layout/mandala-background'
import { Suspense } from 'react'
import PageLoader from '@/components/layout/page-loader'

const yatra = Yatra_One({ subsets: ['latin'], weight: '400', variable: '--font-yatra', display: 'swap' })
const lora = Lora({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-lora', display: 'swap' })
const notoDev = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400','600','700'], variable: '--font-noto-dev', display: 'swap' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-cormorant', display: 'swap' })
const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter', display: 'swap' })

export const metadata = {
  title: 'SRIDATTAM — Premium Incense & Fragrance for Daily Rituals',
  description: 'Handcrafted premium incense sticks, natural resins, and essential oils. Authentic wellness fragrances rooted in ancient wisdom.',
  openGraph: {
    title: 'SRIDATTAM — Premium Incense & Fragrance',
    description: 'Elevate your everyday into a ritual with authentic botanical incense.',
    type: 'website'
  }
}

export const viewport = {
  themeColor: '#FFF3C1',
  colorScheme: 'light',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${yatra.variable} ${lora.variable} ${notoDev.variable} ${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white text-midnight font-inter relative">
        <MandalaBackground />
        <Suspense fallback={null}>
          <PageLoader />
        </Suspense>
        <CartProvider>
          {children}
          <Toaster position="top-center" richColors duration={2000} />
        </CartProvider>
      </body>
    </html>
  )
}
