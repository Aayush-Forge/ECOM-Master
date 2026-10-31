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
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'

function ProductsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'featured'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState(search)

  useEffect(() => {
    let active = true
    setLoading(true)

    const fetchProductsData = async () => {
      const qs = new URLSearchParams()
      if (category) qs.set('category', category)
      if (search) qs.set('search', search)
      if (sort) qs.set('sort', sort)
      qs.set('limit', '60')

      let data = null

      try {
        const r = await fetch(`/api/products?${qs.toString()}`)
        if (r.ok) {
          data = await r.json()
        }
      } catch (err) {
        console.warn('Storefront /api/products fetch error:', err)
      }

      if (!Array.isArray(data) || data.length === 0) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
          const bRes = await fetch(`${backendUrl}/products?${qs.toString()}`)
          if (bRes.ok) {
            const raw = await bRes.json()
            data = Array.isArray(raw) ? raw : (raw?.data || [])
          }
        } catch (err) {
          console.warn('Backend products fetch error:', err)
        }
      }

      if (!Array.isArray(data) || data.length === 0) {
        let list = [...SEED_PRODUCTS]
        if (category) {
          const cat = category.toLowerCase()
          list = list.filter((p) => {
            const cats = Array.isArray(p.categories)
              ? p.categories.map((c) => (typeof c === 'string' ? c.toLowerCase() : c.slug?.toLowerCase()))
              : []
            return cats.includes(cat) || cats.some((c) => c && c.includes(cat))
          })
        }
        if (search) {
          const term = search.toLowerCase()
          list = list.filter((p) => p.name?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term))
        }
        if (sort === 'price_asc') {
          list.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0))
        } else if (sort === 'price_desc') {
          list.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0))
        } else if (sort === 'newest') {
          list.reverse()
        }
        data = list
      }

      if (active) {
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      }
    }

    fetchProductsData()

    return () => {
      active = false
    }
  }, [category, search, sort])

  useEffect(() => {
    let active = true
    fetch('/api/categories')
      .then((r) => r.json())
      .then((c) => {
        if (active && Array.isArray(c) && c.length > 0) {
          setCategories(c)
        } else if (active) {
          setCategories(SEED_CATEGORIES)
        }
      })
      .catch(() => {
        if (active) setCategories(SEED_CATEGORIES)
      })
    return () => {
      active = false
    }
  }, [])

  const updateParam = (key, val) => {
    const next = new URLSearchParams(params.toString())
    if (val) next.set(key, val)
    else next.delete(key)
    router.push(`/products?${next.toString()}`)
  }

  const onSearch = (e) => {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-display text-[#2D1515] font-bold mb-3 text-base">All Categories</h4>
        <div className="space-y-1.5">
          <button
            onClick={() => updateParam('category', '')}
            className={`block w-full text-left px-3 py-2 rounded-sm text-sm font-semibold transition ${
              !category ? 'bg-[#6B1024] text-white shadow-sm' : 'hover:bg-stone-100 text-stone-800'
            }`}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c.id || c.slug}
              onClick={() => updateParam('category', c.slug)}
              className={`block w-full text-left px-3 py-2 rounded-sm text-sm font-semibold transition ${
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
              className={`block w-full text-left px-3 py-2 rounded-sm text-sm font-semibold transition ${
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
    if (category) {
      const found = categories.find((c) => c.slug === category)
      return found ? found.name : 'Sacred Products'
    }
    return 'All Sacred Products'
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-8 text-center">
            <p className="text-[#D7A65B] text-xs sm:text-sm font-bold tracking-[0.25em] uppercase font-body">
              ALL SACRED COLLECTIONS
            </p>
            <h1 className="font-cormorant text-4xl md:text-5xl text-[#6B1024] font-light tracking-wide mt-1 uppercase">
              {getPageTitle()}
            </h1>
            <p className="text-stone-500 italic mt-1 font-light text-sm sm:text-base">
              Pure · Vedic · Consecrated
            </p>
          </div>

          <div className="flex gap-2 mb-6">
            <form onSubmit={onSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search sacred products..."
                className="pl-9 bg-white border-stone-200 focus-visible:ring-[#6B1024] rounded-sm font-medium"
              />
            </form>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden border-stone-200 bg-white font-bold rounded-sm">
                  <SlidersHorizontal className="w-4 h-4 mr-2" /> Filter
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-white rounded-t-lg max-h-[80vh] overflow-y-auto border-t border-stone-200">
                <h3 className="font-display text-xl text-[#6B1024] font-bold mb-4">Filter &amp; Sort</h3>
                <FilterContent />
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="hidden md:block col-span-1">
              <div className="sticky top-24 bg-white rounded-sm border border-stone-200 p-5 shadow-xs">
                <FilterContent />
              </div>
            </aside>

            <section className="col-span-1 md:col-span-3">
              {(category || search) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {category && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-stone-100 text-stone-800 text-xs font-semibold">
                      Category: {category}
                      <button onClick={() => updateParam('category', '')} className="hover:opacity-75">
                        <X className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-stone-100 text-stone-800 text-xs font-semibold">
                      Search: "{search}"
                      <button onClick={() => updateParam('search', '')} className="hover:opacity-75">
                        <X className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      updateParam('category', '')
                      updateParam('search', '')
                    }}
                    className="text-xs text-[#6B1024] hover:underline font-bold ml-2"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-80 rounded-sm bg-stone-100" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-sm border border-stone-200 shadow-sm space-y-3">
                  <div className="text-5xl text-[#D7A65B] mb-2 animate-flicker">ॐ</div>
                  <p className="font-cormorant text-2xl font-bold text-[#6B1024]">No products found</p>
                  <p className="text-stone-500 text-sm font-light">
                    Try adjusting your filters or search term.
                  </p>
                  <button
                    onClick={() => {
                      updateParam('category', '')
                      updateParam('search', '')
                    }}
                    className="mt-3 px-4 py-2 bg-[#6B1024] text-white text-xs font-bold rounded-sm hover:bg-[#4D0013] transition"
                  >
                    Reset Filters
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
