'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowRight, Tag, Gift, Flame, ChevronRight, Layers } from 'lucide-react'
import { getActiveClubbings } from '@/lib/api/clubbings'
import { Button } from '@/components/ui/button'

export default function ClubbingFestiveBanner() {
  const [activeClubbings, setActiveClubbings] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadClubbings = async () => {
    try {
      try {
        const res = await fetch('http://localhost:5000/clubbing/active', { cache: 'no-store' })
        if (res.ok) {
          const rules = await res.json()
          if (Array.isArray(rules) && rules.length > 0) {
            const mapped = rules.filter(r => r && r.isActive !== false).map(r => ({
              id: r.id,
              name: r.name || 'Diwali Dhamaka Fest',
              tagline: r.tagline || 'Diwali Sale',
              description: r.description || `Special clubbing offer for ${r.name || 'Festive Season'}`,
              type: r.type || 'fixed_price_bundle',
              requiredQuantity: Number(r.requiredQuantity) || 3,
              fixedPrice: r.fixedPrice !== null && r.fixedPrice !== undefined ? Number(r.fixedPrice) : null,
              percentageOff: r.percentageOff !== null && r.percentageOff !== undefined ? Number(r.percentageOff) : null,
              bannerImage: r.bannerImage || 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
              isActive: true,
              featuredOnHomepage: true
            }))
            if (mapped.length > 0) {
              setActiveClubbings(mapped)
              setLoading(false)
              return
            }
          }
        }
      } catch {
        // Fallback to local
      }

      const data = await getActiveClubbings()
      const featured = (data || []).filter(c => c && c.featuredOnHomepage !== false && c.isActive)
      setActiveClubbings(featured.length > 0 ? featured : (data || []).filter(c => c && c.isActive))
    } catch (err) {
      console.warn('Failed to load active clubbings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClubbings()

    // Listen to live event dispatched when clubbing is created/updated in admin panel
    const handleUpdate = () => {
      loadClubbings()
    }

    window.addEventListener('sd:clubbings-updated', handleUpdate)
    return () => window.removeEventListener('sd:clubbings-updated', handleUpdate)
  }, [])

  // Auto-advance if multiple clubbings are active
  useEffect(() => {
    if (activeClubbings.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % activeClubbings.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [activeClubbings.length])

  if (loading || !Array.isArray(activeClubbings) || activeClubbings.length === 0) {
    return null
  }

  const current = activeClubbings[activeIndex] || activeClubbings[0]
  if (!current) return null

  const productCount = current.clubbingProducts?.length || 0
  const offerBadge = productCount > 0
    ? `${productCount} Special Deals Inside`
    : (current.tagline || 'Festive Clubbing')

  const desktopBanner = current.bannerImageDesktop || current.bannerImage || 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80'
  const mobileBanner = current.bannerImageMobile || desktopBanner

  return (
    <section className="relative z-20 py-4 sm:py-6 bg-gradient-to-b from-[#130306] via-[#1a0409] to-[#24060d] text-white overflow-hidden border-y border-[#D7A65B]/30 shadow-md">
      {/* Decorative Golden Ambient Sparks */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#D7A65B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4">
        {/* Banner Card Container */}
        <div className="relative rounded-2xl overflow-hidden border border-[#D7A65B]/40 shadow-2xl bg-[#2b050f]/80 backdrop-blur-md">
          {/* Background Image with Gradient Overlay: Desktop & Mobile */}
          <div className="absolute inset-0 z-0">
            {/* Desktop Banner Image */}
            <img
              src={desktopBanner}
              alt={current.name || 'Festive Campaign'}
              className="hidden md:block w-full h-full object-cover object-center scale-105 transition-all duration-1000 ease-out opacity-40 hover:scale-100"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80'
              }}
            />
            {/* Mobile Banner Image */}
            <img
              src={mobileBanner}
              alt={current.name || 'Festive Campaign'}
              className="block md:hidden w-full h-full object-cover object-center scale-105 transition-all duration-1000 ease-out opacity-40 hover:scale-100"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/90 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent md:hidden" />
          </div>

          {/* Banner Content Content Grid */}
          <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-xl">
              {/* Badge & Festival Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7A65B] text-[#4D0013] text-xs font-black uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 fill-current text-[#4D0013]" />
                  {current.tagline || 'Diwali Sale'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-amber-200 border border-amber-300/30 text-xs font-mono font-bold">
                  <Tag className="w-3 h-3 text-[#FF6B00]" />
                  {offerBadge}
                </span>
              </div>

              {/* Headline */}
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-wide leading-tight drop-shadow-sm">
                {current.name}
              </h3>

              {/* Description */}
              <p className="text-sm sm:text-base text-stone-200/90 font-light leading-relaxed drop-shadow-xs max-w-lg">
                {current.description || 'Special limited-time festival clubbing offer. Elevate your sacred rituals with handcrafted pure dhoop and sambrani.'}
              </p>

              {/* Quick Perks */}
              <div className="flex items-center gap-4 text-xs text-[#FFF3C1]/80 pt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#FF6B00]" /> 100% Charcoal-Free
                </span>
                <span className="text-[#D7A65B]">✦</span>
                <span className="flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-[#D7A65B]" /> Free Festive Gift Included
                </span>
              </div>
            </div>

            {/* CTA & Campaign Navigation */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 w-full md:w-auto">
              <Button
                asChild
                size="lg"
                className="bg-[#D7A65B] hover:bg-[#c49348] text-[#4D0013] font-bold px-7 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 w-full sm:w-auto text-sm tracking-wide"
              >
                <Link href="/clubbing" className="flex items-center justify-center gap-2">
                  <span>Shop Clubbing Deals</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              {/* If multiple active campaigns, display tab indicators */}
              {activeClubbings.length > 1 && (
                <div className="flex items-center gap-1.5 pt-2">
                  {activeClubbings.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeIndex === i
                          ? 'w-7 bg-[#D7A65B]'
                          : 'w-2 bg-white/30 hover:bg-white/60'
                      }`}
                      aria-label={`View ${c.name}`}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
