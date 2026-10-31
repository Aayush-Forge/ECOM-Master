'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { getActiveClubbings } from '@/lib/api/clubbings'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles,
  ShoppingBag,
  CreditCard,
  Plus,
  Minus,
  Flame,
  Gift,
  Truck,
  ShieldCheck,
  Package,
} from 'lucide-react'

export default function ClubbingStorefrontPage() {
  const router = useRouter()
  const { addItem, openDrawer } = useCart()
  const [activeClubbings, setActiveClubbings] = useState([])
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState({})
  const [addingId, setAddingId] = useState(null)

  useEffect(() => {
    let mounted = true
    getActiveClubbings()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setActiveClubbings(data.filter((c) => c && c.isActive !== false))
        }
      })
      .catch((err) => console.error('Failed to load clubbings:', err))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const updateQuantity = (productId, delta) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1
      const next = Math.max(1, current + delta)
      return { ...prev, [productId]: next }
    })
  }

  const handleAddToCart = (product, campaign) => {
    const pId = product.productId || product.id
    const qty = quantities[pId] || 1
    setAddingId(pId)

    try {
      const clubPrice = Number(product.clubbingPrice || product.price || 0)
      const origPrice = Number(product.originalPrice || clubPrice)

      addItem(
        {
          product_id: pId,
          id: pId,
          title: product.name || product.title,
          name: product.name || product.title,
          slug: product.slug || pId,
          price: clubPrice,
          regular_price: origPrice,
          image: product.image || null,
          weight: 0.25,
        },
        qty,
      )

      toast.success(`✨ Added ×${qty} "${product.name || product.title}" at clubbing price ₹${clubPrice}!`)
      openDrawer()
    } finally {
      setTimeout(() => setAddingId(null), 300)
    }
  }

  const handleBuyNow = (product, campaign) => {
    const pId = product.productId || product.id
    const qty = quantities[pId] || 1
    const clubPrice = Number(product.clubbingPrice || product.price || 0)
    const origPrice = Number(product.originalPrice || clubPrice)

    addItem(
      {
        product_id: pId,
        id: pId,
        title: product.name || product.title,
        name: product.name || product.title,
        slug: product.slug || pId,
        price: clubPrice,
        regular_price: origPrice,
        image: product.image || null,
        weight: 0.25,
      },
      qty,
    )

    toast.success(`Proceeding to checkout with ${product.name || product.title}...`)
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#6B1024] font-inter selection:bg-[#6B1024] selection:text-white">
      <Header />

      {/* Hero Header */}
      <section className="relative bg-[#130306] text-white py-14 md:py-20 overflow-hidden border-b border-[#D7A65B]/30">
        <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(#D7A65B_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#D7A65B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container max-w-5xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-[#D7A65B]/15 text-[#D7A65B] border border-[#D7A65B]/30 text-[10px] font-semibold uppercase tracking-[0.25em]">
            <Sparkles className="w-3 h-3 text-[#D7A65B]" />
            <span>SACRED FESTIVE CLUBBINGS • EXCLUSIVE SAVINGS</span>
          </div>

          <h1 className="font-cormorant text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-widest uppercase leading-tight">
            Sacred Festive Collections
          </h1>

          <p className="text-xs sm:text-sm text-stone-300 font-light max-w-xl mx-auto leading-relaxed">
            Handcrafted temple-grade agarbatti, fragrant woods, and pure bamboo-free dhoop prepared with authentic botanicals at celebratory prices.
          </p>

          <div className="w-16 h-px bg-[#D7A65B] mx-auto mt-4" />

          {/* Trust Highlights */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-[11px] text-[#D7A65B] font-light">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D7A65B]" /> 100% Charcoal-Free
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#D7A65B]" /> Pure Temple Resins
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#D7A65B]" /> Direct Festive Discount
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#D7A65B]" /> Free Express Shipping Over ₹499
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-6xl mx-auto px-4 space-y-16">
          {loading ? (
            <div className="space-y-12">
              <Skeleton className="h-64 w-full bg-stone-200 rounded-none animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="aspect-square bg-stone-200 rounded-none animate-pulse" />
                ))}
              </div>
            </div>
          ) : activeClubbings.length === 0 ? (
            <div className="text-center py-20 bg-white border border-stone-200 max-w-md mx-auto space-y-4 shadow-sm p-8">
              <Sparkles className="w-10 h-10 text-[#D7A65B] mx-auto opacity-75" />
              <h3 className="font-cormorant text-2xl font-light tracking-wide text-[#6B1024] uppercase">
                No Active Campaigns
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                Check back soon for upcoming auspicious festival specials, or explore our full collection.
              </p>
              <Button asChild className="bg-[#6B1024] hover:bg-[#4D0013] text-white text-xs uppercase tracking-wider rounded-none">
                <Link href="/products">Explore Catalog</Link>
              </Button>
            </div>
          ) : (
            activeClubbings.map((campaign) => {
              const desktopBanner = campaign.bannerImageDesktop || campaign.bannerImage || '/HD1.png'
              const mobileBanner = campaign.bannerImageMobile || desktopBanner
              const products = Array.isArray(campaign.clubbingProducts) && campaign.clubbingProducts.length > 0
                ? campaign.clubbingProducts
                : Array.isArray(campaign.products)
                  ? campaign.products
                  : []

              return (
                <section key={campaign.id} className="space-y-8">
                  {/* Festival Hero Banner */}
                  <div className="relative w-full aspect-[16/6] md:aspect-[21/7] overflow-hidden border border-[#D7A65B]/30 bg-[#130306] shadow-sm">
                    <Image
                      src={desktopBanner}
                      alt={campaign.name}
                      fill
                      sizes="100vw"
                      priority
                      className="object-cover"
                      unoptimized={desktopBanner.startsWith('http')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent flex flex-col justify-end p-6 md:p-10 text-white">
                      <div className="space-y-2 max-w-lg">
                        <span className="inline-block px-2.5 py-0.5 bg-[#D7A65B] text-[#130306] text-[9px] font-bold tracking-[0.2em] uppercase rounded-none">
                          {campaign.tagline || 'FESTIVE SPECIAL'}
                        </span>
                        <h2 className="font-cormorant text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide leading-tight drop-shadow-sm">
                          {campaign.name}
                        </h2>
                        <p className="text-xs text-stone-200 line-clamp-2 font-light">
                          {campaign.description || 'Celebrate with our hand-selected temple-grade agarbatti at celebratory prices.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Title */}
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-stone-200 pb-3">
                    <div>
                      <h3 className="font-cormorant text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#6B1024]">
                        Featured Products
                      </h3>
                      <p className="text-xs text-stone-500 font-light mt-0.5">
                        Available at exclusive festive clubbing prices for a limited time.
                      </p>
                    </div>
                    <span className="text-xs text-[#D7A65B] font-semibold tracking-wider uppercase">
                      {products.length} Festive Items
                    </span>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {products.map((item) => {
                      const pId = item.productId || item.id
                      const title = item.title || item.name || 'Sacred Incense'
                      const image = item.image || (Array.isArray(item.images) ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.src) : '/HD1.png')
                      const orig = Number(item.originalPrice || 180)
                      const deal = Number(item.clubbingPrice || orig)
                      const hasDiscount = orig > deal
                      const discountPercent = item.discountPercentage || (hasDiscount ? Math.round(((orig - deal) / orig) * 100) : 0)
                      const cardQty = quantities[pId] || 1

                      return (
                        <div
                          key={pId}
                          className="group relative flex flex-col justify-between bg-white border border-stone-200/90 rounded-none p-3 sm:p-4 hover:shadow-xl hover:border-[#6B1024]/40 transition-all duration-300"
                        >
                          <div className="space-y-3">
                            {/* Badges */}
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#6B1024] bg-[#6B1024]/5 px-2 py-0.5 border border-[#6B1024]/15">
                                <Sparkles size={10} className="text-[#D7A65B]" />
                                {item.category || 'Incense'}
                              </span>
                              {hasDiscount && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                                  SAVE ₹{orig - deal} ({discountPercent}% OFF)
                                </span>
                              )}
                            </div>

                            {/* Product Image */}
                            <Link
                              href={`/products/${item.slug || pId}`}
                              className="relative aspect-square w-full block overflow-hidden bg-stone-50"
                            >
                              <Image
                                src={image}
                                alt={title}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                unoptimized={image.startsWith('http')}
                              />
                            </Link>

                            {/* Title and details */}
                            <div className="space-y-1 text-left">
                              <Link
                                href={`/products/${item.slug || pId}`}
                                className="block font-cormorant text-base sm:text-lg font-bold text-[#6B1024] hover:underline line-clamp-1"
                              >
                                {title}
                              </Link>
                              <p className="text-[10px] text-stone-500 line-clamp-2 h-7 font-light">
                                Pure temple agarbatti crafted for daily prayers and peace.
                              </p>

                              <div className="flex items-center gap-2 pt-1">
                                <span className="font-cormorant font-bold text-[#6B1024] text-base sm:text-lg">
                                  ₹{deal}
                                </span>
                                {hasDiscount && (
                                  <span className="text-xs text-stone-400 line-through">
                                    ₹{orig}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Add to Cart Actions */}
                          <div className="pt-3 mt-3 border-t border-stone-100 space-y-2">
                            <div className="flex items-center justify-center border border-stone-200 bg-stone-50/70 h-8 gap-2 w-full">
                              <button
                                type="button"
                                onClick={() => updateQuantity(pId, -1)}
                                className="p-1 hover:bg-stone-200 text-stone-600 transition"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-xs text-stone-800 min-w-[20px] text-center">
                                {cardQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(pId, 1)}
                                className="p-1 hover:bg-stone-200 text-stone-600 transition"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <Button
                              onClick={() => handleAddToCart(item, campaign)}
                              disabled={addingId === pId}
                              className="w-full bg-[#6B1024] hover:bg-[#4D0013] text-white border border-[#6B1024] rounded-none font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5 h-10 transition-colors"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
                              <span>{addingId === pId ? 'Adding...' : 'Add at Clubbing Price'}</span>
                            </Button>

                            <Button
                              onClick={() => handleBuyNow(item, campaign)}
                              variant="outline"
                              className="w-full border-stone-300 hover:border-[#6B1024] hover:bg-[#FFF9EE] text-[#6B1024] font-bold text-[9px] uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 h-8 transition-colors"
                            >
                              <CreditCard className="w-3.5 h-3.5 stroke-[1.5]" />
                              <span>Buy Now</span>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
