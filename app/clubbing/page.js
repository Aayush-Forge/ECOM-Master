'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { getActiveClubbings } from '@/lib/api/clubbings'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  Flame,
  Gift,
  Truck,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  CheckCircle2
} from 'lucide-react'

// Component for a scrollable row of items with scroll buttons & touch scroll
function ClubbingScrollRow({ campaign, onAddToCart, onBuyNow, addingId }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const items = campaign.clubbingProducts || []

  const updateScrollButtons = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)
    return () => {
      el.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [items])

  const scrollBy = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
        <Package className="w-8 h-8 text-stone-300 mx-auto" />
        <p className="text-sm font-semibold text-stone-600">No products configured for this clubbing yet.</p>
        <Button asChild size="sm" variant="outline" className="mt-2 text-xs">
          <Link href="/products">Browse Store Catalog</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative group/carousel">
      {/* Scroll Navigation Buttons (Desktop) */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-320)}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-xl border border-stone-200 text-[#4D0013] hidden md:flex items-center justify-center hover:bg-[#FFF9EE] hover:scale-105 transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scrollBy(320)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-xl border border-stone-200 text-[#4D0013] hidden md:flex items-center justify-center hover:bg-[#FFF9EE] hover:scale-105 transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 px-1 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, idx) => {
          const orig = item.originalPrice || 0
          const club = item.clubbingPrice !== undefined ? item.clubbingPrice : orig
          const discount = item.discountPercentage || (orig > 0 && club < orig ? Math.round(((orig - club) / orig) * 100) : 0)
          const pId = item.productId || item.id || `cp_${idx}`

          return (
            <div
              key={pId}
              className="w-[240px] sm:w-[270px] shrink-0 snap-start bg-white rounded-2xl border-2 border-[#D7A65B]/40 hover:border-[#6B1024] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group/card"
            >
              {/* Product Thumbnail with discount badge */}
              <div className="relative aspect-square w-full overflow-hidden bg-stone-50 border-b border-stone-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                />

                {discount > 0 && (
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#6B1024] text-[#FFD700] border border-[#D7A65B] text-[10px] font-black uppercase tracking-wider shadow-md">
                    {discount}% OFF
                  </span>
                )}

                <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs text-[10px] font-bold">
                  {item.category || 'Incense'}
                </span>
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm sm:text-base text-stone-900 group-hover/card:text-[#6B1024] transition line-clamp-2">
                    {item.name}
                  </h4>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-stone-100 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-[#6B1024] font-display">
                      ₹{club}
                    </span>
                    {orig > club && (
                      <span className="text-xs text-stone-400 line-through font-semibold">
                        ₹{orig}
                      </span>
                    )}
                  </div>
                  {discount > 0 && (
                    <p className="text-[11px] text-emerald-700 font-bold">
                      Festive Savings: ₹{orig - club}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <Button
                    onClick={() => onAddToCart(item, campaign)}
                    disabled={addingId === pId}
                    size="sm"
                    className="w-full bg-[#D7A65B] hover:bg-[#c49348] text-[#4D0013] font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{addingId === pId ? 'Adding...' : 'Add at Clubbing Price'}</span>
                  </Button>

                  <Button
                    onClick={() => onBuyNow(item, campaign)}
                    size="sm"
                    variant="outline"
                    className="w-full border-stone-300 hover:border-[#6B1024] hover:bg-[#FFF9EE] text-[#4D0013] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Buy Now</span>
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ClubbingStorefrontPage() {
  const router = useRouter()
  const { addItem, openDrawer } = useCart()
  const [activeClubbings, setActiveClubbings] = useState([])
  const [loading, setLoading] = useState(true)
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

  // Add Item to Cart at exact Clubbing Price
  const handleAddToCart = (item, campaign) => {
    const pId = item.productId || item.id
    setAddingId(pId)
    try {
      const clubPrice = parseFloat(item.clubbingPrice) || parseFloat(item.originalPrice) || 0
      const origPrice = parseFloat(item.originalPrice) || clubPrice

      addItem({
        product_id: pId,
        name: item.name,
        slug: item.slug || pId,
        price: clubPrice,
        regular_price: origPrice,
        image: item.image || null,
        weight: 0.25,
        attrs: [],
      }, 1)

      toast.success(`✨ Added "${item.name}" to cart at festive clubbing price ₹${clubPrice}!`)
      openDrawer()
    } finally {
      setTimeout(() => setAddingId(null), 400)
    }
  }

  // Buy Now at exact Clubbing Price
  const handleBuyNow = (item, campaign) => {
    const pId = item.productId || item.id
    const clubPrice = parseFloat(item.clubbingPrice) || parseFloat(item.originalPrice) || 0
    const origPrice = parseFloat(item.originalPrice) || clubPrice

    addItem({
      product_id: pId,
      name: item.name,
      slug: item.slug || pId,
      price: clubPrice,
      regular_price: origPrice,
      image: item.image || null,
      weight: 0.25,
      attrs: [],
    }, 1)

    toast.success(`Proceeding to checkout with ${item.name}...`)
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#6B1024] font-inter">
      <Header />

      {/* Hero Header */}
      <section className="relative bg-[#1A0308] text-white py-12 md:py-16 overflow-hidden border-b border-[#D7A65B]/40">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-radial-gradient from-[#4D0013]/60 via-[#1A0308] to-[#0A0103] opacity-90" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#D7A65B]/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="container max-w-6xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7A65B]/20 text-[#FFF3C1] border border-[#D7A65B]/40 text-xs font-semibold uppercase tracking-widest animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#D7A65B]" />
            Exclusive Festive Clubbings • Special Promotional Pricing
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wide leading-tight drop-shadow-md">
            Sacred Festive Clubbing Collections
          </h1>
          <p className="text-sm sm:text-base text-amber-50 font-normal max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Hand-selected ceremonial incense, pure sambrani, and artisanal fragrances curated for sacred occasions.
            Enjoy special clubbing prices on each featured product.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-amber-100 font-semibold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#FF6B00]" /> 100% Temple-Grade Pure
            </span>
            <span className="text-[#D7A65B]">✦</span>
            <span className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#D7A65B]" /> Direct Festive Discount
            </span>
            <span className="text-[#D7A65B]">✦</span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-300" /> Free Express Delivery Above ₹499
            </span>
          </div>
        </div>
      </section>

      {/* Main Campaign List Section */}
      <main className="flex-1 py-10 md:py-14">
        <div className="container max-w-6xl mx-auto px-4 space-y-16">
          {loading ? (
            <div className="space-y-12">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                  <div className="flex gap-4 overflow-hidden">
                    <Skeleton className="h-80 w-64 rounded-2xl shrink-0" />
                    <Skeleton className="h-80 w-64 rounded-2xl shrink-0" />
                    <Skeleton className="h-80 w-64 rounded-2xl shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeClubbings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <Sparkles className="w-12 h-12 text-[#D7A65B] mx-auto animate-pulse" />
              <h3 className="font-display text-2xl font-bold text-[#4D0013]">No Active Clubbing Campaigns</h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Check back soon or explore our complete catalog of hand-rolled incense and fragrant dhoop sticks.
              </p>
              <Button asChild className="bg-[#6B1024] hover:bg-[#520c1b] text-white">
                <Link href="/products">Explore Catalog</Link>
              </Button>
            </div>
          ) : (
            activeClubbings.map((campaign) => {
              const desktopBanner = campaign.bannerImageDesktop || campaign.bannerImage
              const mobileBanner = campaign.bannerImageMobile || desktopBanner
              const productCount = campaign.clubbingProducts?.length || 0

              return (
                <section
                  key={campaign.id}
                  id={campaign.id}
                  className="space-y-6"
                >
                  {/* RESPONSIVE BANNER: Desktop Banner on desktop, Mobile Banner on mobile */}
                  <div className="relative rounded-3xl overflow-hidden border-2 border-[#D7A65B]/60 shadow-xl bg-[#1A0308] text-white group">
                    {/* Desktop Version Banner (Hidden on Mobile) */}
                    <div className="hidden md:block relative min-h-[220px] lg:min-h-[260px] w-full">
                      <img
                        src={desktopBanner}
                        alt={campaign.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-102 transition-transform duration-700"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/90 to-transparent" />
                    </div>

                    {/* Mobile Version Banner (Hidden on Desktop) */}
                    <div className="block md:hidden relative min-h-[260px] w-full">
                      <img
                        src={mobileBanner}
                        alt={campaign.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2B040B] via-[#4D0013]/85 to-transparent" />
                    </div>

                    {/* Banner Content Overlay */}
                    <div className="absolute inset-0 p-6 sm:p-8 md:p-10 flex flex-col justify-between z-10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-[#D7A65B] text-[#2D1515] text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 fill-current text-[#2D1515]" />
                            {campaign.tagline || 'Festive Offer'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase border border-white/30">
                            {productCount} Featured Item{productCount !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <Link
                          href={`/products?clubbing=${campaign.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 backdrop-blur-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D7A65B]" />
                          <span>View on Products Page</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="max-w-2xl space-y-2">
                        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide leading-tight drop-shadow-md">
                          {campaign.name}
                        </h2>
                        <p className="text-xs sm:text-sm text-amber-100 font-medium line-clamp-2 drop-shadow-sm leading-relaxed">
                          {campaign.description || 'Enjoy festive prices on these hand-selected divine fragrances and puja essentials.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* HORIZONTAL SCROLL SECTION FOR CLUBBING ITEMS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h3 className="font-display font-black text-lg sm:text-xl text-[#4D0013] flex items-center gap-2">
                          <Package className="w-5 h-5 text-[#FF6B00]" />
                          Featured Items in {campaign.name}
                        </h3>
                        <p className="text-xs text-stone-600 font-medium">
                          Scroll through the items below to explore special festive prices.
                        </p>
                      </div>

                      <Link
                        href={`/products?clubbing=${campaign.id}`}
                        className="text-xs font-bold text-[#6B1024] hover:text-[#4D0013] hover:underline flex items-center gap-1"
                      >
                        <span>See all {productCount} items</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <ClubbingScrollRow
                      campaign={campaign}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                      addingId={addingId}
                    />
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
