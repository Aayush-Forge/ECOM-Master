'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductCard from '@/components/products/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

function normalizeStoreProduct(p) {
  if (!p) return null
  const rawImages = Array.isArray(p.images) ? p.images : []
  const images = rawImages.map(img => (typeof img === 'string' ? { src: img } : img))
  const basePrice = Number(p.basePrice ?? p.regular_price ?? p.price ?? 0)
  const salePrice = p.salePrice ? Number(p.salePrice) : null
  const currentPrice = salePrice !== null ? salePrice : basePrice
  const compareAt = salePrice !== null ? basePrice : 0
  const inStock = p.stockQuantity !== undefined ? p.stockQuantity > 0 : (p.stock_status === 'instock' || p.stock_status === undefined)

  return {
    ...p,
    id: p.id,
    name: p.title || p.name || 'Untitled Product',
    slug: p.slug,
    price: currentPrice,
    regular_price: basePrice,
    compareAt: compareAt,
    images: images.length > 0 ? images : [{ src: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80' }],
    short_description: p.shortDescription || p.short_description || '',
    description: p.description || '',
    category: p.category?.name || (typeof p.category === 'string' ? p.category : ''),
    category_slug: p.category?.slug || '',
    stock_status: inStock ? 'instock' : 'outofstock',
    in_stock: inStock,
  }
}

function ProductsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'featured'

  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState(search)

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    setLoading(true)

    Promise.all([
      fetch(`${backendUrl}/all-products?per_page=100`).then(async (r) => {
        if (!r.ok) throw new Error(`Products error: ${r.status}`)
        return r.json()
      }),
      fetch(`${backendUrl}/admin/all-categories`).then(async (r) => {
        if (!r.ok) throw new Error(`Categories error: ${r.status}`)
        return r.json()
      }),
    ])
      .then(([pData, cData]) => {
        const raw = Array.isArray(pData) ? pData : pData?.data || []
        setAllProducts(raw.map(normalizeStoreProduct).filter(Boolean))
        setCategories(Array.isArray(cData) ? cData : [])
      })
      .catch((err) => {
        console.error('Failed to load products or categories from backend:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredProducts = useMemo(() => {
    let list = [...allProducts]

    if (category) {
      list = list.filter(
        (p) =>
          p.category_slug === category ||
          p.category?.toLowerCase() === category.toLowerCase() ||
          p.categoryId === category
      )
    }

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q)
      )
    }

    if (sort === 'price_asc') {
      list.sort((a, b) => a.price - b.price)
    } else if (sort === 'price_desc') {
      list.sort((a, b) => b.price - a.price)
    } else if (sort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }

    return list
  }, [allProducts, category, search, sort])

  const categoriesWithCounts = useMemo(() => {
    return categories.map((c) => ({
      ...c,
      count: allProducts.filter(
        (p) =>
          p.category_slug === c.slug ||
          p.category?.toLowerCase() === c.name?.toLowerCase() ||
          p.categoryId === c.id
      ).length,
    }))
  }, [categories, allProducts])

  const updateParam = (key, val) => {
    const next = new URLSearchParams(params.toString())
    if (val) next.set(key, val); else next.delete(key)
    router.push(`/products?${next.toString()}`)
  }

  const onSearch = (e) => {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-display text-maroon-500 mb-3">Categories</h4>
        <div className="space-y-1">
          <button
            onClick={() => updateParam('category', '')}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              !category ? 'bg-[#6B1024] text-white' : 'hover:bg-stone-100'
            }`}
          >
            All Products
          </button>
          {categoriesWithCounts.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParam('category', c.slug)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                category === c.slug ? 'bg-[#6B1024] text-white' : 'hover:bg-stone-100'
              }`}
            >
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
            { v: 'price_desc', l: 'Price: High to Low' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => updateParam('sort', o.v)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                sort === o.v ? 'bg-[#D7A65B] text-white' : 'hover:bg-stone-100'
              }`}
            >
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
              {category
                ? categories.find((c) => c.slug === category)?.name || 'Sacred Products'
                : 'All Sacred Products'}
            </h1>
            <p className="text-muted-foreground italic mt-1">Pure · Vedic · Consecrated</p>
          </div>

          <div className="flex gap-2 mb-6">
            <form onSubmit={onSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search sacred products..."
                className="pl-9 bg-white border-stone-200 focus-visible:ring-stone-400"
              />
            </form>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden border-stone-200 bg-white">
                  <SlidersHorizontal className="w-4 h-4 mr-2" /> Filter
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto border-t border-stone-200"
              >
                <h3 className="font-display text-xl text-maroon-500 mb-4">Filter &amp; Sort</h3>
                <FilterContent />
              </SheetContent>
            </Sheet>
          </div>

          {(category || search) && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {category && (
                <button
                  onClick={() => updateParam('category', '')}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-saffron-100 text-saffron-700 text-xs"
                >
                  {categories.find((c) => c.slug === category)?.name} <X className="w-3 h-3" />
                </button>
              )}
              {search && (
                <button
                  onClick={() => {
                    setSearchValue('')
                    updateParam('search', '')
                  }}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-saffron-100 text-saffron-700 text-xs"
                >
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
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="h-80 rounded-2xl" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl gold-text mb-4 animate-flicker">ॐ</div>
                  <p className="font-display text-xl text-maroon-500">No products found</p>
                  <p className="text-muted-foreground mt-2">Try adjusting your filters or search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {filteredProducts.map((p) => (
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

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <ProductsContent />
    </Suspense>
  )
}

export default App
