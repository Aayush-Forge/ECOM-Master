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
  Gift, 
  ShoppingBag, 
  CreditCard,
  Eye,
  Flame,
  ArrowRight
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'
import { PRE_CURATED_FESTIVE_BUNDLES } from '@/lib/festive-bundles'
import { extractFestivalNavLabel, getActiveClubbings } from '@/lib/api/clubbings'

function FestiveBundleDetailModal({ bundle, onClose, onAddToCart, onBuyNow }) {
  if (!bundle) return null
  const totalItems = (bundle.items || []).reduce((s, it) => s + (it.qty || 1), 0)

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#FFFDF9] rounded-2xl sm:rounded-3xl border-2 border-[#D7A65B] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative min-h-[160px] sm:min-h-[190px] bg-[#1A0308] text-white p-6 sm:p-8 flex flex-col justify-between shrink-0 overflow-hidden">
          <img
            src={bundle.bannerImage}
            alt={bundle.title}
            className="absolute inset-0 w-full h-full object-cover opacity-50 scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/95 to-black/70" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/30 transition-all hover:scale-110"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-[#D7A65B] text-[#2D1515] text-[11px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-[#2D1515]" />
                {bundle.campaignTag}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase shadow">
                Save ₹{bundle.savings} Instant Discount
              </span>
              <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase backdrop-blur-sm">
                {bundle.badge || 'Ceremonial Gift Set'}
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide leading-tight drop-shadow-md">
              {bundle.title}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 font-medium leading-relaxed drop-shadow-sm">
              {bundle.description}
            </p>
          </div>
        </div>

        {/* Scrollable Products Details Content */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-6 flex-1 bg-[#FAF7F2]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-stone-300">
              <div>
                <h3 className="font-display font-black text-lg sm:text-xl text-[#2D1515] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#FF6B00]" />
                  Products Included in this Package ({totalItems} Sacred Items)
                </h3>
                <p className="text-xs text-stone-700 font-semibold mt-0.5">
                  Read complete details, aroma profiles, and burning specifications for every item inside.
                </p>
              </div>
              <span className="hidden sm:inline-flex text-xs font-black text-[#2D1515] bg-[#D7A65B] px-3 py-1 rounded-full border border-[#b88636]">
                100% Temple-Grade
              </span>
            </div>

            {/* List of Products with deep details */}
            <div className="space-y-4 mt-4">
              {(bundle.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border-2 border-stone-300 p-4 sm:p-5 shadow-sm hover:border-[#D7A65B] hover:shadow-md transition flex flex-col sm:flex-row gap-5"
                >
                  {/* Product Image */}
                  <div className="relative w-full sm:w-36 h-36 rounded-xl overflow-hidden bg-stone-100 border-2 border-stone-200 shrink-0 shadow-inner">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-[#6B1024] text-white text-xs font-black px-2.5 py-0.5 rounded shadow-md">
                      Qty: {item.qty}x
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <div>
                        <h4 className="font-display font-black text-base sm:text-lg text-[#2D1515]">
                          {item.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                            {item.weight}
                          </span>
                          {item.burnTime && (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Flame className="w-3 h-3 text-[#FF6B00]" /> {item.burnTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 mt-1 sm:mt-0">
                        <span className="text-base sm:text-lg font-black text-[#6B1024]">
                          ₹{item.price}
                        </span>
                        <span className="text-xs text-stone-500 line-through font-bold ml-1.5 sm:block">
                          ₹{item.regular_price}
                        </span>
                      </div>
                    </div>

                    {/* Story / Description */}
                    <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-normal">
                      {item.description || 'Authentic temple formulation crafted for sacred occasions and divine peace.'}
                    </p>

                    {/* Aroma Notes & Ingredients */}
                    <div className="pt-2 border-t border-stone-150 space-y-1 text-xs">
                      {item.aromaNotes && (
                        <p className="text-stone-900 font-semibold">
                          <span className="text-[#6B1024] font-black">Aroma Profile:</span> {item.aromaNotes}
                        </p>
                      )}
                      {item.ingredients && (
                        <p className="text-stone-700">
                          <span className="font-bold text-stone-900">Ingredients:</span> {item.ingredients}
                        </p>
                      )}
                      {item.ritualUsage && (
                        <p className="text-amber-900 font-medium">
                          <span className="font-bold text-amber-950">Puja Recommendation:</span> {item.ritualUsage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Complimentary Free Bonus Gift Section */}
          <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-2 border-[#D7A65B] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#6B1024] text-[#FFF3C1] flex items-center justify-center shrink-0 border-2 border-[#D7A65B] shadow-md">
              <Gift className="w-8 h-8 text-[#FFF3C1]" />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#6B1024] text-white">
                  Festive Complimentary Bonus
                </span>
                <span className="text-xs font-black text-[#2D1515] bg-[#D7A65B] px-2.5 py-0.5 rounded-full border border-[#b88636]">
                  Value {bundle.complimentaryGiftDetails?.value || '₹250'} — 100% FREE
                </span>
              </div>
              <h4 className="font-display font-black text-base text-[#2D1515]">
                {bundle.complimentaryGiftDetails?.name || bundle.complimentaryGift}
              </h4>
              <p className="text-xs text-stone-800 leading-relaxed font-medium">
                {bundle.complimentaryGiftDetails?.description || 'Authentic temple-grade brass item, reusable for all daily rituals.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="bg-gradient-to-r from-[#4D0013] via-[#6B1024] to-[#4D0013] text-white border-t-2 border-[#D7A65B] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="text-xs text-[#FFE082] line-through font-bold">
                MRP: ₹{bundle.mrp}
              </span>
              <span className="text-xs text-[#FFE082] line-through font-bold">
                Regular: ₹{bundle.regularTotal}
              </span>
              <span className="text-2xl sm:text-3xl font-black font-display text-white">
                Festive Price: <span className="text-[#FFD700] font-black drop-shadow-sm">Flat ₹{bundle.fixedPrice}</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-black text-[#4D0013] bg-[#FFD700] border border-[#FFE29A] px-2.5 py-0.5 rounded shadow">
                Save ₹{bundle.savings} Instant Discount
              </span>
              <span className="text-xs text-amber-100 font-bold">
                • Includes all {totalItems} items + Free Gift
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => { onAddToCart(bundle); onClose() }}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-[#D7A65B] hover:bg-[#c29145] text-[#4D0013] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg border-2 border-[#FFE29A] transition-all"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              <span>Add Pack to Cart</span>
            </button>

            <button
              onClick={() => { onBuyNow(bundle); onClose() }}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-[#4D0013] hover:bg-[#6B1024] text-[#FFD700] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg border-2 border-[#D7A65B] transition-all"
            >
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
              <span>Buy Package Now</span>
            </button>

            <button
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase border border-white/40 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FestiveBundleGridCard({ bundle, onAddToCart, onBuyNow, onOpenDetails }) {
  const [adding, setAdding] = useState(false)
  const totalItems = (bundle.items || []).reduce((s, it) => s + (it.qty || 1), 0)

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAdding(true)
    onAddToCart(bundle)
    setTimeout(() => setAdding(false), 500)
  }

  const handleBuy = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onBuyNow(bundle)
  }

  return (
    <div className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border-2 border-stone-300 transition-all duration-300 hover:shadow-xl hover:border-[#D7A65B] hover:-translate-y-1">
      {/* Banner Box Header - Click to open details */}
      <div 
        onClick={() => onOpenDetails && onOpenDetails(bundle)}
        className="relative aspect-[16/9] sm:aspect-[4/3] bg-[#1A0308] overflow-hidden flex-shrink-0 cursor-pointer"
        title="Click to view all products in bundle"
      >
        <img
          src={bundle.bannerImage}
          alt={bundle.title}
          className="w-full h-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#D7A65B] text-[#2D1515] text-[10px] font-black uppercase tracking-wider shadow">
          {bundle.campaignTag}
        </span>
        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase shadow">
          Save ₹{bundle.savings}
        </span>
        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
          <p className="text-[11px] text-amber-200 font-semibold tracking-wide">
            {bundle.badge || 'Ceremonial Gift Box'}
          </p>
          <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1 drop-shadow-sm group-hover:text-[#D7A65B] transition">
            {bundle.title}
          </h3>
        </div>
      </div>

      {/* Package Contents Breakdown */}
      <div className="p-4 flex flex-col flex-grow justify-between gap-3 bg-[#FFFDF9]">
        <div className="space-y-2">
          <p className="text-xs text-stone-800 font-medium line-clamp-2 leading-relaxed">
            {bundle.description}
          </p>

          <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-3 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-amber-700" />
                Includes {totalItems} Sacred Items:
              </p>
              <button
                onClick={() => onOpenDetails && onOpenDetails(bundle)}
                className="text-[10px] font-black text-[#6B1024] hover:underline flex items-center gap-0.5"
              >
                <span>Read More</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            <ul className="space-y-1 text-xs text-[#2D1515] font-bold">
              {(bundle.items || []).map((it, idx) => (
                <li key={idx} className="flex items-center gap-1.5 truncate">
                  <span className="text-[#6B1024] font-black">•</span>
                  <span>{it.qty}x {it.name}</span>
                </li>
              ))}
              <li className="flex items-center gap-1.5 text-emerald-800 font-black truncate pt-1 border-t border-amber-200">
                <Gift className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>+ Complimentary Brass Puja Gift</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing, Details Trigger & 1-Click Action Buttons */}
        <div className="mt-auto pt-2 border-t border-stone-200 space-y-2.5">
          <div className="flex items-baseline justify-between flex-wrap gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl text-[#2D1515] font-black">
                Flat ₹{bundle.fixedPrice}
              </span>
              <span className="text-xs text-stone-500 line-through font-bold">
                ₹{bundle.regularTotal}
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded shadow-xs">
              Instant Bundle Price
            </span>
          </div>

          <button
            onClick={() => onOpenDetails && onOpenDetails(bundle)}
            className="w-full h-8 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#2D1515] font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-stone-300"
          >
            <Eye className="w-3.5 h-3.5 text-[#6B1024]" />
            <span>View All Products in Bundle</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full h-9 px-2 rounded-lg bg-[#6B1024] hover:bg-[#4D0013] text-white font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md hover:shadow-lg border border-[#4D0013]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{adding ? 'Adding...' : 'Add Bundle'}</span>
            </button>

            <button
              onClick={handleBuy}
              className="w-full h-9 px-2 rounded-lg bg-[#D7A65B] hover:bg-[#c29145] text-[#2D1515] font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md hover:shadow-lg border border-[#b88636]"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { addItem, openDrawer } = useCart()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'featured'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(category !== 'festive-bundles')
  const [searchValue, setSearchValue] = useState(search)
  const [notConfigured, setNotConfigured] = useState(false)

  // Active Festival Campaign Category State
  const [activeFestiveRule, setActiveFestiveRule] = useState(null)
  const [festiveCategoryName, setFestiveCategoryName] = useState('Diwali Bundles')

  // Selected Bundle for Detailed Product Story Modal
  const [selectedBundle, setSelectedBundle] = useState(() => {
    const bId = params.get('bundle')
    return bId ? PRE_CURATED_FESTIVE_BUNDLES.find(b => b.id === bId) || null : null
  })

  // Listen to ?bundle= query param to automatically pop open modal
  useEffect(() => {
    const bId = params.get('bundle')
    if (bId) {
      const match = PRE_CURATED_FESTIVE_BUNDLES.find(b => b.id === bId)
      if (match) {
        setSelectedBundle(match)
      }
    }
  }, [params])

  // Fetch Active Festival Rule from Backend Port 5000
  useEffect(() => {
    let active = true

    const loadActiveRule = async () => {
      try {
        const res = await fetch('http://localhost:5000/clubbing/active', { cache: 'no-store' })
        if (res.ok) {
          const rules = await res.json()
          if (active && Array.isArray(rules) && rules.length > 0) {
            const rule = rules.find(r => r.isActive !== false) || rules[0]
            setActiveFestiveRule(rule)
            const label = extractFestivalNavLabel(rule)
            const catName = rule.name
              ? (rule.name.toLowerCase().includes('bundle') ? rule.name : `${rule.name} Bundles`)
              : `${label} Bundles`
            setFestiveCategoryName(catName)
            return
          }
        }
      } catch {}

      try {
        const local = await getActiveClubbings()
        if (active && Array.isArray(local) && local.length > 0) {
          const rule = local[0]
          setActiveFestiveRule(rule)
          const label = extractFestivalNavLabel(rule)
          setFestiveCategoryName(`${label} Bundles`)
          return
        }
      } catch {}

      if (active) {
        setFestiveCategoryName('Diwali Bundles')
      }
    }

    loadActiveRule()
    return () => { active = false }
  }, [])

  // Fetch Products with Multi-Tier Fallback
  useEffect(() => {
    let active = true
    if (category !== 'festive-bundles') {
      setLoading(true)
    }

    const fetchProductsData = async () => {
      // If festive category is selected, bundles will be displayed directly
      if (category === 'festive-bundles') {
        if (active) setLoading(false)
        return
      }

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
  }, [category, search, sort])

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
    if (val) next.set(key, val); else next.delete(key)
    router.push(`/products?${next.toString()}`)
  }

  const onSearch = (e) => {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  // Single-Click Add Pre-Packaged Bundle to Cart
  const handleAddBundleToCart = (bundle) => {
    (bundle.items || []).forEach((item) => {
      addItem({
        product_id: item.id,
        name: item.name,
        slug: item.slug || item.id,
        price: parseFloat(item.price) || 0,
        regular_price: parseFloat(item.regular_price || item.price) || 0,
        image: item.image || null,
        weight: 0.25,
        attrs: [],
      }, item.qty || 1)
    })
    toast.success(`✨ Festive Bundle "${bundle.title}" added to cart! Flat ₹${bundle.fixedPrice} applied.`)
    openDrawer()
  }

  // Single-Click Buy Pre-Packaged Bundle Now
  const handleBuyBundleNow = (bundle) => {
    (bundle.items || []).forEach((item) => {
      addItem({
        product_id: item.id,
        name: item.name,
        slug: item.slug || item.id,
        price: parseFloat(item.price) || 0,
        regular_price: parseFloat(item.regular_price || item.price) || 0,
        image: item.image || null,
        weight: 0.25,
        attrs: [],
      }, item.qty || 1)
    })
    toast.success(`Proceeding to checkout with ${bundle.title}...`)
    router.push('/checkout')
  }

  const isFestiveSelected = category === 'festive-bundles'

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-display text-[#2D1515] font-bold mb-3 text-base">Categories</h4>
        <div className="space-y-1.5">
          {/* All Products Option */}
          <button
            onClick={() => updateParam('category', '')}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
              !category ? 'bg-[#6B1024] text-white shadow-sm' : 'hover:bg-stone-100 text-stone-800'
            }`}
          >
            All Products
          </button>

          {/* DYNAMIC FESTIVE CAMPAIGN CATEGORY OPTION */}
          <button
            onClick={() => updateParam('category', 'festive-bundles')}
            className={`flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg text-sm font-black transition border ${
              isFestiveSelected
                ? 'bg-[#D7A65B] text-[#2D1515] border-[#b88636] shadow-md'
                : 'bg-amber-50/80 hover:bg-amber-100 text-[#2D1515] border-amber-300'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-4 h-4 text-amber-600 fill-amber-600 shrink-0" />
              <span className="truncate">{festiveCategoryName}</span>
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-1.5 ${
              isFestiveSelected
                ? 'bg-[#2D1515] text-[#FFF9EE]'
                : 'bg-[#6B1024] text-white'
            }`}>
              SPECIAL
            </span>
          </button>

          {/* Standard Categories */}
          {categories.map((c) => (
            <button
              key={c.id || c.slug}
              onClick={() => updateParam('category', c.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
                category === c.slug ? 'bg-[#6B1024] text-white shadow-sm' : 'hover:bg-stone-100 text-stone-800'
              }`}
            >
              {c.name} <span className="text-xs opacity-75 font-normal">({c.count ?? 4})</span>
            </button>
          ))}
        </div>
      </div>

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
    if (isFestiveSelected) return festiveCategoryName
    if (category) {
      const found = categories.find((c) => c.slug === category)
      return found ? found.name : 'Sacred Products'
    }
    return 'All Sacred Products'
  }

  const getPageSubtitle = () => {
    if (isFestiveSelected) return 'Pre-Packaged Ceremonial Gift Sets • All-Inclusive Flat Bundle Pricing'
    return 'Pure · Vedic · Consecrated'
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-8 text-center">
            <p className="text-amber-700 text-sm font-bold tracking-[0.25em] uppercase">
              {isFestiveSelected ? 'EXCLUSIVE FESTIVAL SPECIAL' : 'ALL SACRED COLLECTIONS'}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-[#2D1515] font-black mt-1">
              {getPageTitle()}
            </h1>
            <p className="text-stone-600 italic mt-1 font-medium">
              {getPageSubtitle()}
            </p>
          </div>

          {notConfigured ? (
            <div className="max-w-2xl mx-auto bg-white border border-amber-200 rounded-2xl p-8 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-600 mb-3" />
              <h3 className="font-display text-xl text-maroon-500 mb-2">Storefront Not Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">Add WooCommerce keys to <code className="bg-stone-100 px-1.5 py-0.5 rounded">/app/.env</code> and restart.</p>
              <pre className="text-left bg-stone-900 text-stone-100 rounded-lg p-4 text-xs overflow-x-auto">{`NEXT_PUBLIC_WC_BASE_URL=https://yoursridattam.com/wp-json/wc/v3
WC_CONSUMER_KEY=ck_...
WC_CONSUMER_SECRET=cs_...`}</pre>
            </div>
          ) : (
            <>
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

              {(category || search) && (
                <div className="flex gap-2 mb-4 flex-wrap items-center">
                  {category && (
                    <button
                      onClick={() => updateParam('category', '')}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold shadow-xs hover:bg-amber-200 transition"
                    >
                      <span>Category: {isFestiveSelected ? festiveCategoryName : (categories.find(c => c.slug === category)?.name || category)}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {search && (
                    <button
                      onClick={() => { setSearchValue(''); updateParam('search', '') }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold shadow-xs hover:bg-amber-200 transition"
                    >
                      <span>&ldquo;{search}&rdquo;</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-[260px_1fr] gap-8">
                {/* Left Categories & Sort Sidebar */}
                <aside className="hidden md:block">
                  <div className="sticky top-24 bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-stone-200 p-5 shadow-sm">
                    <FilterContent />
                  </div>
                </aside>

                {/* Right Product Grid */}
                <section>
                  {isFestiveSelected ? (
                    /* DYNAMIC FESTIVE PRE-PACKAGED BUNDLE GRID */
                    <div className="space-y-4">
                      <div className="bg-amber-50/80 border-2 border-[#D7A65B]/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div>
                          <h2 className="text-sm sm:text-base font-black text-[#2D1515] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            {festiveCategoryName} — Active Campaign Sets
                          </h2>
                          <p className="text-xs text-stone-700 font-semibold mt-0.5">
                            Pre-configured festival gift boxes. Includes complimentary brass diya and automatic bundle discount.
                          </p>
                        </div>
                        <Button asChild size="sm" className="bg-[#6B1024] hover:bg-[#4D0013] text-white font-bold text-xs uppercase px-4 shrink-0">
                          <Link href="/clubbing">View Detailed Packages</Link>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {PRE_CURATED_FESTIVE_BUNDLES.map((bundle) => (
                          <FestiveBundleGridCard
                            key={bundle.id}
                            bundle={bundle}
                            onAddToCart={handleAddBundleToCart}
                            onBuyNow={handleBuyBundleNow}
                            onOpenDetails={(b) => setSelectedBundle(b)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-80 rounded-2xl" />
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
                      <div className="text-6xl text-amber-600 mb-4 animate-flicker">ॐ</div>
                      <p className="font-display text-2xl font-bold text-[#2D1515]">No products found</p>
                      <p className="text-stone-600 mt-2 text-sm font-medium">Try adjusting your filters or search term.</p>
                      <button
                        onClick={() => { updateParam('category', ''); updateParam('search', '') }}
                        className="mt-4 px-4 py-2 bg-[#6B1024] text-white text-xs font-bold rounded-lg hover:bg-[#4D0013] transition"
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
            </>
          )}
        </div>
      </div>

      {/* Festive Bundle Detailed Product Story Modal */}
      {selectedBundle && (
        <FestiveBundleDetailModal
          bundle={selectedBundle}
          onClose={() => setSelectedBundle(null)}
          onAddToCart={handleAddBundleToCart}
          onBuyNow={handleBuyBundleNow}
        />
      )}

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
