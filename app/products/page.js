'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductCard from '@/components/products/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, SlidersHorizontal, X, AlertCircle } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

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
  const [notConfigured, setNotConfigured] = useState(false)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (search) qs.set('search', search)
    if (sort) qs.set('sort', sort)
    qs.set('limit', '60')
    fetch(`/api/products?${qs.toString()}`).then(async r => {
      const data = await r.json()
      if (!r.ok && data?.code === 'WC_NOT_CONFIGURED') setNotConfigured(true)
      setProducts(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [category, search, sort])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(c => setCategories(Array.isArray(c) ? c : []))
  }, [])

  const updateParam = (key, val) => {
    const next = new URLSearchParams(params.toString())
    if (val) next.set(key, val); else next.delete(key)
    router.push(`/products?${next.toString()}`)
  }

  const onSearch = (e) => { e.preventDefault(); updateParam('search', searchValue) }

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-display text-maroon-500 mb-3">Categories</h4>
        <div className="space-y-1">
          <button onClick={() => updateParam('category', '')}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${!category ? 'bg-[#6B1024] text-white' : 'hover:bg-stone-100'}`}>
            All Products
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => updateParam('category', c.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${category === c.slug ? 'bg-[#6B1024] text-white' : 'hover:bg-stone-100'}`}>
              {c.name} <span className="text-xs text-muted-foreground">({c.count})</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-display text-maroon-500 mb-3">Sort By</h4>
        <div className="space-y-1">
          {[
            { v: 'featured', l: 'Featured' },
            { v: 'newest', l: 'Newest' },
            { v: 'price_asc', l: 'Price: Low to High' },
            { v: 'price_desc', l: 'Price: High to Low' }
          ].map(o => (
            <button key={o.v} onClick={() => updateParam('sort', o.v)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${sort === o.v ? 'bg-[#D7A65B] text-white' : 'hover:bg-stone-100'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-12">
        <div className="container">
          <div className="mb-8 text-center">
            <p className="text-gold-700 text-sm tracking-[0.2em]">ALL SACRED COLLECTIONS</p>
            <h1 className="font-display text-4xl md:text-5xl text-maroon-500 mt-1">
              {category ? categories.find(c => c.slug === category)?.name || 'Sacred Products' : 'All Sacred Products'}
            </h1>
            <p className="text-muted-foreground italic mt-1">Pure · Vedic · Consecrated</p>
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
                  <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search sacred products..."
                    className="pl-9 bg-white border-stone-200 focus-visible:ring-stone-400" />
                </form>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="md:hidden border-stone-200 bg-white"><SlidersHorizontal className="w-4 h-4 mr-2" /> Filter</Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto border-t border-stone-200">
                    <h3 className="font-display text-xl text-maroon-500 mb-4">Filter &amp; Sort</h3>
                    <FilterContent />
                  </SheetContent>
                </Sheet>
              </div>

              {(category || search) && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {category && (
                    <button onClick={() => updateParam('category', '')} className="flex items-center gap-1 px-3 py-1 rounded-full bg-saffron-100 text-saffron-700 text-xs">
                      {categories.find(c => c.slug === category)?.name} <X className="w-3 h-3" />
                    </button>
                  )}
                  {search && (
                    <button onClick={() => { setSearchValue(''); updateParam('search', '') }} className="flex items-center gap-1 px-3 py-1 rounded-full bg-saffron-100 text-saffron-700 text-xs">
                      &ldquo;{search}&rdquo; <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-[240px_1fr] gap-8">
                <aside className="hidden md:block">
                  <div className="sticky top-24 bg-stone-50/40 rounded-xl border border-stone-200 p-5">
                    <FilterContent />
                  </div>
                </aside>
                <section>
                  {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="text-6xl gold-text mb-4 animate-flicker">ॐ</div>
                      <p className="font-display text-xl text-maroon-500">No products found</p>
                      <p className="text-muted-foreground mt-2">Try adjusting your filters or search.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      {products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <ProductsContent />
    </Suspense>
  )
}
export default App
