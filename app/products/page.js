'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductCard from '@/components/products/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  AlertCircle, 
  Sparkles, 
  Package, 
  ArrowRight,
  Eye,
  CheckCircle2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  ShoppingBag,
  CreditCard
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'
import { getActiveClubbings, extractFestivalNavLabel, DEFAULT_CLUBBINGS } from '@/lib/api/clubbings'

function ClubbingItemCard({ item, campaign }) {
  const { addItem, openDrawer } = useCart()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const orig = Number(item.originalPrice) || Number(item.price) || 0
  const club = Number(item.clubbingPrice !== undefined ? item.clubbingPrice : item.price) || orig
  const discount = item.discountPercentage || (orig > 0 && club < orig ? Math.round(((orig - club) / orig) * 100) : 0)
  const pId = item.productId || item.id

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      product_id: pId,
      name: item.name,
      slug: item.slug || pId,
      price: club,
      regular_price: orig,
      image: item.image || (item.images?.[0]?.src) || null,
      weight: 0.25,
      attrs: []
    }, qty)
    toast.success(`✨ Added ×${qty} "${item.name}" to cart at ${campaign?.eventName || 'Diwali'} deal price ₹${club}!`)
    openDrawer()
  }

  const handleBuy = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      product_id: pId,
      name: item.name,
      slug: item.slug || pId,
      price: club,
      regular_price: orig,
      image: item.image || (item.images?.[0]?.src) || null,
      weight: 0.25,
      attrs: []
    }, qty)
    router.push('/checkout')
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#D7A65B]/40 hover:border-[#6B1024] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group/card h-full">
      <Link href={`/products/${item.slug || pId}`} className="block relative aspect-square w-full overflow-hidden bg-stone-50 border-b border-stone-100 group-hover/card:opacity-95">
        <img
          src={item.image || (item.images?.[0]?.src) || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'}
          alt={item.name}
          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
        />
        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#6B1024] text-[#FFD700] border border-[#D7A65B] text-[10px] font-black uppercase tracking-wider shadow-md">
            {discount}% OFF
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs text-[10px] font-bold">
          {item.category || 'Sacred Collection'}
        </span>
      </Link>

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/products/${item.slug || pId}`}>
            <h4 className="font-display font-bold text-sm sm:text-base text-stone-900 group-hover/card:text-[#6B1024] transition line-clamp-2">
              {item.name}
            </h4>
          </Link>
        </div>

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

        <div className="pt-2 space-y-2">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between border border-stone-200 rounded-lg bg-stone-50/70 py-1 px-3">
            <span className="text-[11px] font-semibold text-stone-500">Qty:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setQty(q => Math.max(1, q - 1)); }}
                className="w-6 h-6 rounded flex items-center justify-center text-stone-700 hover:bg-stone-200 text-sm font-bold transition"
              >
                -
              </button>
              <span className="text-xs font-bold min-w-[16px] text-center">{qty}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setQty(q => q + 1); }}
                className="w-6 h-6 rounded flex items-center justify-center text-stone-700 hover:bg-stone-200 text-sm font-bold transition"
              >
                +
              </button>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            size="sm"
            className="w-full bg-[#D7A65B] hover:bg-[#c49348] text-[#4D0013] font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add at Deal Price</span>
          </Button>

          <Button
            onClick={handleBuy}
            size="sm"
            variant="outline"
            className="w-full border-stone-300 hover:border-[#6B1024] hover:bg-[#FFF9EE] text-[#4D0013] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Buy Now</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ClubbingHorizontalScrollShelf({ items, campaign }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

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

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-320)}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-xl border border-stone-200 text-[#4D0013] hidden md:flex items-center justify-center hover:bg-[#FFF9EE] hover:scale-105 transition-all cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scrollBy(320)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-xl border border-stone-200 text-[#4D0013] hidden md:flex items-center justify-center hover:bg-[#FFF9EE] hover:scale-105 transition-all cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-3 px-1 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, idx) => (
          <div key={item.productId || item.id || idx} className="w-[240px] sm:w-[270px] shrink-0 snap-start">
            <ClubbingItemCard item={item} campaign={campaign} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { addItem, openDrawer } = useCart()

  const category = params.get('category') || ''
  const clubbingParam = params.get('clubbing') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'featured'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState(search)
  const [notConfigured, setNotConfigured] = useState(false)

  // Active Clubbings List
  const [activeClubbings, setActiveClubbings] = useState([])
  const [selectedClubbing, setSelectedClubbing] = useState(null)

  // Load Active Clubbings
  useEffect(() => {
    let active = true
    const loadClubbings = async () => {
      try {
        const clubbings = await getActiveClubbings()
        if (active && Array.isArray(clubbings)) {
          const activeOnly = clubbings.filter(c => c && c.isActive !== false)
          setActiveClubbings(activeOnly)
          if (clubbingParam) {
            const paramLower = clubbingParam.toLowerCase()
            const match = activeOnly.find(c => 
              c.id === clubbingParam || 
              c.id.toLowerCase() === paramLower ||
              (c.eventName && c.eventName.toLowerCase() === paramLower) ||
              (c.name && c.name.toLowerCase().includes(paramLower))
            )
            setSelectedClubbing(match || null)
          } else {
            setSelectedClubbing(null)
          }
        } else if (active) {
          setActiveClubbings([])
          setSelectedClubbing(null)
        }
      } catch (err) {
        console.warn('Failed to load active clubbings:', err)
      }
    }
    loadClubbings()
    return () => { active = false }
  }, [clubbingParam])

  // Fetch / Filter Products
  useEffect(() => {
    let active = true
    setLoading(true)

    const fetchProductsData = async () => {
      // If a specific active clubbing campaign is selected, display ONLY its configured items at exact clubbing prices
      if (clubbingParam) {
        let currentClubbing = selectedClubbing
        if (!currentClubbing) {
          const clubbings = await getActiveClubbings()
          const paramLower = clubbingParam.toLowerCase()
          const activeOnly = (clubbings || []).filter(c => c && c.isActive !== false)
          currentClubbing = activeOnly.find(c => 
            c.id === clubbingParam || 
            c.id.toLowerCase() === paramLower ||
            (c.eventName && c.eventName.toLowerCase() === paramLower) ||
            (c.name && c.name.toLowerCase().includes(paramLower))
          ) || null
        }

        if (currentClubbing && Array.isArray(currentClubbing.clubbingProducts) && currentClubbing.clubbingProducts.length > 0) {
          const clubbingItems = currentClubbing.clubbingProducts.map((cp, idx) => ({
            id: cp.productId || cp.id || `cp_${idx}`,
            name: cp.name,
            slug: cp.slug || cp.productId || cp.id,
            price: parseFloat(cp.clubbingPrice),
            compareAt: parseFloat(cp.originalPrice) || parseFloat(cp.clubbingPrice),
            regular_price: parseFloat(cp.originalPrice) || parseFloat(cp.clubbingPrice),
            images: [{ src: cp.image }],
            categories: [cp.category || 'Incense'],
            short_description: `Featured in ${currentClubbing.eventName || currentClubbing.name} at special clubbing price of ₹${cp.clubbingPrice}.`,
            description: `Exclusive festive special for ${currentClubbing.eventName || currentClubbing.name}. Original price ₹${cp.originalPrice}, festive clubbing price ₹${cp.clubbingPrice} (${cp.discountPercentage || 20}% OFF).`,
            clubbingBadge: `${cp.discountPercentage || 20}% OFF`,
            stock_status: 'instock',
            weight: '150g'
          }))

          let filtered = clubbingItems
          if (search) {
            const term = search.toLowerCase()
            filtered = filtered.filter(p => p.name?.toLowerCase().includes(term))
          }

          if (active) {
            setProducts(filtered)
            setLoading(false)
          }
          return
        }
      }

      // Regular Catalog Fetching
      const qs = new URLSearchParams()
      if (category) qs.set('category', category)
      if (search) qs.set('search', search)
      if (sort) qs.set('sort', sort)
      qs.set('limit', '60')

      let data = null

      // Tier 1: /api/products
      try {
        const r = await fetch(`/api/products?${qs.toString()}`)
        if (r.ok) {
          data = await r.json()
        }
      } catch (err) {
        console.warn('Storefront /api/products fetch error:', err)
      }

      // Tier 2: Direct NestJS backend http://localhost:5000/products
      if (!Array.isArray(data) || data.length === 0) {
        try {
          const bRes = await fetch(`http://localhost:5000/products?${qs.toString()}`)
          if (bRes.ok) {
            data = await bRes.json()
          }
        } catch (err) {
          console.warn('Backend :5000 products fetch error:', err)
        }
      }

      // Tier 3: Client-side filtered seed products catalog
      if (!Array.isArray(data) || data.length === 0) {
        let list = [...SEED_PRODUCTS]
        if (category) {
          const cat = category.toLowerCase()
          list = list.filter(p => {
            const cats = Array.isArray(p.categories)
              ? p.categories.map(c => (typeof c === 'string' ? c.toLowerCase() : c.slug?.toLowerCase()))
              : []
            return cats.includes(cat) || cats.some(c => c && c.includes(cat))
          })
        }
        if (search) {
          const term = search.toLowerCase()
          list = list.filter(p =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.description && p.description.toLowerCase().includes(term))
          )
        }
        data = list
      }

      if (active) {
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      }
    }

    fetchProductsData()
    return () => { active = false }
  }, [category, clubbingParam, selectedClubbing, search, sort])

  // Fetch Categories
  useEffect(() => {
    let active = true
    fetch('/api/categories')
      .then(r => r.json())
      .then(c => {
        if (active && Array.isArray(c) && c.length > 0) {
          setCategories(c)
        } else if (active) {
          setCategories(SEED_CATEGORIES)
        }
      })
      .catch(() => {
        if (active) setCategories(SEED_CATEGORIES)
      })
    return () => { active = false }
  }, [])

  const updateParam = (key, val) => {
    const next = new URLSearchParams(params.toString())
    if (key === 'clubbing') {
      next.delete('category')
    } else if (key === 'category') {
      next.delete('clubbing')
    }

    if (val) next.set(key, val); else next.delete(key)
    router.push(`/products?${next.toString()}`)
  }

  const onSearch = (e) => {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  // Deduplicate / Group by Event Name (e.g. 'Diwali')
  const eventModules = []
  const seenEvents = new Set()
  for (const c of activeClubbings) {
    if (!c || !c.isActive) continue
    const rawName = c.eventName || c.name || 'Festive'
    const eventName = rawName.toLowerCase().includes('diwali') ? 'Diwali' : rawName
    const key = eventName.toLowerCase()

    if (!seenEvents.has(key)) {
      seenEvents.add(key)
      eventModules.push({
        id: c.id,
        eventKey: key,
        eventName: eventName,
        bannerImageDesktop: c.bannerImageDesktop || c.bannerImage,
        bannerImageMobile: c.bannerImageMobile || c.bannerImageDesktop || c.bannerImage,
        description: c.description || `Special clubbing offer for ${eventName}`,
        tagline: c.tagline || `${eventName} Sale`,
        clubbingProducts: c.clubbingProducts || []
      })
    }
  }

  // Active Selected Event
  const activeEvent = selectedClubbing
    ? (eventModules.find(e => e.id === selectedClubbing.id || e.eventKey === selectedClubbing.id.toLowerCase() || (selectedClubbing.name && selectedClubbing.name.toLowerCase().includes(e.eventKey))) || selectedClubbing)
    : (clubbingParam ? eventModules.find(e => e.id === clubbingParam || e.eventKey === clubbingParam.toLowerCase()) : null)

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Event Clubbing Modules (Shows single event name like 'Diwali') */}
      {eventModules.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-display text-[#4D0013] font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FF6B00]" /> Festive Clubbing
          </h4>
          <div className="space-y-1.5">
            {eventModules.map((evt) => {
              const isSelected = Boolean(
                clubbingParam === evt.id || 
                clubbingParam?.toLowerCase() === evt.eventKey ||
                (selectedClubbing && (selectedClubbing.id === evt.id || selectedClubbing.name?.toLowerCase().includes(evt.eventKey)))
              )
              const count = evt.clubbingProducts?.length || 0

              return (
                <button
                  key={evt.eventKey}
                  onClick={() => updateParam('clubbing', evt.eventKey)}
                  className={`flex items-center justify-between w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition border ${
                    isSelected
                      ? 'bg-[#6B1024] text-white border-[#4D0013] shadow-md'
                      : 'bg-[#FFF9EE] hover:bg-[#FFF3DC] text-[#4D0013] border-[#D7A65B]/60'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#FFD700]' : 'text-[#FF6B00]'}`} />
                    <span className="truncate text-sm font-display font-bold">{evt.eventName}</span>
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase shrink-0 ml-1.5 ${
                    isSelected ? 'bg-[#FFD700] text-[#4D0013]' : 'bg-[#6B1024] text-white'
                  }`}>
                    {count} DEALS
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Catalog Categories */}
      <div>
        <h4 className="font-display text-[#2D1515] font-bold mb-3 text-base">All Categories</h4>
        <div className="space-y-1.5">
          <button
            onClick={() => { updateParam('category', ''); updateParam('clubbing', '') }}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
              !category && !clubbingParam ? 'bg-[#6B1024] text-white shadow-sm' : 'hover:bg-stone-100 text-stone-800'
            }`}
          >
            All Products
          </button>

          {categories.map((c) => (
            <button
              key={c.id || c.slug}
              onClick={() => updateParam('category', c.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
                category === c.slug && !clubbingParam ? 'bg-[#6B1024] text-white shadow-sm' : 'hover:bg-stone-100 text-stone-800'
              }`}
            >
              {c.name} <span className="text-xs opacity-75 font-normal">({c.count ?? 4})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <h4 className="font-display text-[#2D1515] font-bold mb-3 text-base">Sort By</h4>
        <div className="space-y-1">
          {[
            { v: 'featured', l: 'Featured' },
            { v: 'newest', l: 'Newest' },
            { v: 'price_asc', l: 'Price: Low to High' },
            { v: 'price_desc', l: 'Price: High to Low' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => updateParam('sort', o.v)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
                sort === o.v ? 'bg-[#D7A65B] text-[#2D1515] shadow-xs' : 'hover:bg-stone-100 text-stone-800'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const getPageTitle = () => {
    if (activeEvent) return activeEvent.eventName || activeEvent.name || 'Diwali'
    if (category) {
      const found = categories.find((c) => c.slug === category)
      return found ? found.name : 'Sacred Products'
    }
    return 'All Sacred Products'
  }

  const getPageSubtitle = () => {
    if (activeEvent) {
      return `Exclusive ${activeEvent.eventName || 'Festive'} Clubbing Collection • ${products.length} Products Featured`
    }
    return 'Pure · Vedic · Consecrated'
  }

  // EXCLUSIVE FESTIVE CLUBBING PAGE (Blinkit / Zepto Style)
  // When an ACTIVE clubbing module (e.g. ?clubbing=diwali) is viewed:
  // Render ONLY this festival's banner, its headline/tagline, horizontal scroll shelf, and grid of ONLY its products!
  const campaign = selectedClubbing || activeEvent || (activeClubbings.find(c => {
    if (!c || c.isActive === false) return false
    const paramLower = (clubbingParam || '').toLowerCase()
    return c.id === clubbingParam ||
      c.id.toLowerCase() === paramLower ||
      (c.eventName && c.eventName.toLowerCase() === paramLower) ||
      (c.name && c.name.toLowerCase().includes(paramLower))
  }))

  if (clubbingParam && campaign && campaign.isActive !== false) {
    const campaignName = campaign?.eventName || campaign?.name || 'Festive'
    const tagline = campaign?.tagline || 'Festive Special'
    const description = campaign?.description || ''
    const desktopBanner = campaign?.bannerImageDesktop || campaign?.bannerImage || '/HD1.png'
    const mobileBanner = campaign?.bannerImageMobile || desktopBanner
    const items = (Array.isArray(campaign?.clubbingProducts) && campaign.clubbingProducts.length > 0)
      ? campaign.clubbingProducts
      : []

    return (
      <main className="bg-[#FAF7F2] min-h-screen relative z-10 flex flex-col font-inter">
        <Header />

        {/* TOP BREADCRUMB / BACK LINK */}
        <div className="bg-white/90 border-b border-stone-200/80 backdrop-blur-sm py-3 px-4">
          <div className="container max-w-6xl mx-auto flex items-center justify-between">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#6B1024] transition group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to All Products</span>
            </Link>
            <span className="text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
              {campaignName} Festive Collection
            </span>
          </div>
        </div>

        {/* HERO BANNER - Exact same banner as home page */}
        <section className="container max-w-6xl mx-auto px-4 pt-6 pb-2">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#D7A65B]/60 shadow-xl bg-[#1A0308] text-white">
            {/* Desktop Banner Image */}
            <div className="hidden md:block relative aspect-[1536/450] min-h-[220px] w-full">
              <img
                src={desktopBanner}
                alt={campaignName}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B]/90 via-[#4D0013]/60 to-transparent" />
            </div>

            {/* Mobile Banner Image */}
            <div className="block md:hidden relative aspect-[1086/1448] min-h-[260px] w-full">
              <img
                src={mobileBanner}
                alt={campaignName}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2B040B]/95 via-[#4D0013]/70 to-transparent" />
            </div>

            {/* Floating banner text and festive badge */}
            <div className="absolute inset-0 p-6 sm:p-8 md:p-10 flex flex-col justify-between z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D7A65B] text-[#4D0013] text-xs font-black uppercase tracking-wider shadow">
                  <Sparkles className="w-3.5 h-3.5 fill-current text-[#4D0013]" />
                  {tagline}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm text-xs font-bold font-mono">
                  <Tag className="w-3 h-3 text-[#FFD700]" />
                  {items.length} Exclusive Deals
                </span>
              </div>

              <div className="max-w-xl space-y-1.5">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wide drop-shadow-md">
                  {campaignName}
                </h1>
                <p className="text-xs sm:text-sm text-amber-100/90 font-medium line-clamp-2 leading-relaxed drop-shadow-sm">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCTS ONLY SECTION - Horizontal scroll shelf + Grid (Zepto / Blinkit style) */}
        <section className="flex-1 py-6 md:py-10">
          <div className="container max-w-6xl mx-auto px-4 space-y-8">
            
            {/* Shelf Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D7A65B]/30">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#FF6B00]" />
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-[#4D0013]">
                    Featured {campaignName} Products
                  </h2>
                </div>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Hand-selected ceremonial incense and sacred essentials at festive discount prices.
                </p>
              </div>

              <Link
                href="/products"
                className="text-xs font-bold text-[#6B1024] hover:text-[#4D0013] hover:underline hidden sm:flex items-center gap-1"
              >
                <span>View All Store Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Horizontal Scroll Carousel (Swipe / Arrow Navigation) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Quick Deals Scroll
                </span>
                <span className="text-[11px] font-mono font-bold text-stone-500">
                  {items.length} Deals Active
                </span>
              </div>
              <ClubbingHorizontalScrollShelf items={items} campaign={campaign} />
            </div>

            {/* Responsive Grid of Featured Clubbing Products */}
            <div className="space-y-4 pt-4">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#4D0013]">
                All Featured Deals in this Collection
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {items.map((item, idx) => (
                  <ClubbingItemCard key={item.productId || item.id || idx} item={item} campaign={campaign} />
                ))}
              </div>
            </div>

          </div>
        </section>

        <Footer />
      </main>
    )
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-10">
        <div className="container max-w-6xl mx-auto px-4">
          
          {/* Header Title & Subtitle */}
          <div className="mb-8 text-center">
            <p className="text-[#FF6B00] text-xs sm:text-sm font-bold tracking-[0.25em] uppercase">
              {selectedClubbing ? 'FESTIVE CLUBBING SPECIAL' : 'ALL SACRED COLLECTIONS'}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#2D1515] font-black mt-1">
              {getPageTitle()}
            </h1>
            <p className="text-stone-600 italic mt-1 font-medium text-sm sm:text-base">
              {getPageSubtitle()}
            </p>
          </div>

          {/* ACTIVE CLUBBING BANNER (If filtered by clubbing event) */}
          {activeEvent && (
            <div className="mb-8 relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#D7A65B]/60 shadow-xl bg-[#1A0308] text-white">
              {/* Desktop banner */}
              <div className="hidden md:block relative min-h-[180px] lg:min-h-[220px] w-full">
                <img
                  src={activeEvent.bannerImageDesktop || activeEvent.bannerImage}
                  alt={activeEvent.eventName || activeEvent.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/90 to-transparent" />
              </div>

              {/* Mobile banner */}
              <div className="block md:hidden relative min-h-[220px] w-full">
                <img
                  src={activeEvent.bannerImageMobile || activeEvent.bannerImageDesktop || activeEvent.bannerImage}
                  alt={activeEvent.eventName || activeEvent.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B040B] via-[#4D0013]/85 to-transparent" />
              </div>

              {/* Overlay Content */}
              <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-between z-10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#D7A65B] text-[#2D1515] text-[11px] font-black uppercase tracking-wider shadow">
                    ✦ {activeEvent.tagline || 'Festive Clubbing'}
                  </span>
                  <button
                    onClick={() => updateParam('clubbing', '')}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm border border-white/30 transition"
                  >
                    <X className="w-3.5 h-3.5" /> View All Products
                  </button>
                </div>
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white">
                    {activeEvent.eventName || activeEvent.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-100 max-w-xl line-clamp-2 mt-1">
                    {activeEvent.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar & Mobile Filter Trigger */}
          <div className="flex gap-2 mb-6">
            <form onSubmit={onSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search sacred products..."
                className="pl-9 bg-white border-stone-200 focus-visible:ring-stone-400 font-medium"
              />
            </form>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden border-stone-200 bg-white font-bold">
                  <SlidersHorizontal className="w-4 h-4 mr-2" /> Filter
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto border-t border-stone-200">
                <h3 className="font-display text-xl text-[#2D1515] font-black mb-4">Filter &amp; Sort</h3>
                <FilterContent />
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden md:block col-span-1">
              <div className="sticky top-24 bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                <FilterContent />
              </div>
            </aside>

            {/* Products Grid */}
            <section className="col-span-1 md:col-span-3">
              {/* Active Filter Tags */}
              {(category || activeEvent || search) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {activeEvent && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6B1024] text-white text-xs font-bold shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                      Clubbing: {activeEvent.eventName || activeEvent.name}
                      <button onClick={() => updateParam('clubbing', '')} className="hover:opacity-75">
                        <X className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </span>
                  )}
                  {category && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-semibold">
                      Category: {category}
                      <button onClick={() => updateParam('category', '')} className="hover:opacity-75">
                        <X className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-semibold">
                      Search: "{search}"
                      <button onClick={() => updateParam('search', '')} className="hover:opacity-75">
                        <X className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => { updateParam('category', ''); updateParam('clubbing', ''); updateParam('search', '') }}
                    className="text-xs text-[#6B1024] hover:underline font-bold ml-2"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-80 rounded-2xl" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
                  <div className="text-5xl text-amber-600 mb-2 animate-flicker">ॐ</div>
                  <p className="font-display text-2xl font-bold text-[#2D1515]">No products found</p>
                  <p className="text-stone-600 text-sm font-medium">
                    {selectedClubbing
                      ? `No items are currently active under "${selectedClubbing.name}".`
                      : 'Try adjusting your filters or search term.'}
                  </p>
                  <button
                    onClick={() => { updateParam('category', ''); updateParam('clubbing', ''); updateParam('search', '') }}
                    className="mt-3 px-4 py-2 bg-[#6B1024] text-white text-xs font-bold rounded-lg hover:bg-[#4D0013] transition"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <ProductsContent />
    </Suspense>
  )
}
