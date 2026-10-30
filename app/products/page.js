'use client'

import { Suspense, useEffect, useState } from 'react'
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
  Tag
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'
import { getActiveClubbings, extractFestivalNavLabel } from '@/lib/api/clubbings'

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
        if (active && Array.isArray(clubbings) && clubbings.length > 0) {
          setActiveClubbings(clubbings)
          if (clubbingParam) {
            const paramLower = clubbingParam.toLowerCase()
            const match = clubbings.find(c => 
              c.id === clubbingParam || 
              c.id.toLowerCase() === paramLower ||
              (c.eventName && c.eventName.toLowerCase() === paramLower) ||
              (c.name && c.name.toLowerCase().includes(paramLower))
            ) || clubbings[0]
            setSelectedClubbing(match || null)
          } else {
            setSelectedClubbing(null)
          }
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
      // If a specific clubbing campaign or event is selected, display ONLY its configured items at exact clubbing prices
      if (clubbingParam) {
        let currentClubbing = selectedClubbing
        if (!currentClubbing) {
          const clubbings = await getActiveClubbings()
          const paramLower = clubbingParam.toLowerCase()
          currentClubbing = (clubbings || []).find(c => 
            c.id === clubbingParam || 
            c.id.toLowerCase() === paramLower ||
            (c.eventName && c.eventName.toLowerCase() === paramLower) ||
            (c.name && c.name.toLowerCase().includes(paramLower))
          ) || clubbings[0]
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
