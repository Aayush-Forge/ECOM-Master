'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Menu, Search, X, ChevronDown } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import CartDrawer from '@/components/layout/cart-drawer'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/track-order', label: 'Track Order' }
]

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <img
        src="/Mainlogo.svg"
        alt="SRIDATTAM"
        className="h-[72px] md:h-[88px] w-auto object-contain"
      />
    </Link>
  )
}

export default function Header() {
  const { totalItems, openDrawer } = useCart()
  const [bumping, setBumping] = useState(false)
  const [open, setOpen] = useState(false)
  
  // Luxury enhancements
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [categories, setCategories] = useState([])
  const [productsExpanded, setProductsExpanded] = useState(false)

  useEffect(() => {
    if (totalItems === 0) return
    setBumping(true)
    const t = setTimeout(() => setBumping(false), 500)
    return () => clearTimeout(t)
  }, [totalItems])

  // Lazy-load WooCommerce categories when mobile menu opens
  useEffect(() => {
    if (open) {
      fetch('/api/categories')
        .then(r => r.json())
        .then(c => setCategories(Array.isArray(c) ? c : []))
        .catch(() => {})
    }
  }, [open])

  const onSearchSubmit = (e) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchValue.trim())}`)
      setShowSearch(false)
      setSearchValue('')
    }
  }

  return (
    <>
      <header className="sticky top-0 inset-x-0 z-40 bg-white border-b border-stone-200/60 backdrop-blur-md transition-all shadow-sm">
        <div className="container mx-auto px-4 md:px-8 relative">
          
          {/* Row 1: Logo & Actions Grid */}
          <div className="grid grid-cols-3 items-center h-24">
            
            {/* Column 1: Left Detail (Desktop) / Hamburger Trigger (Mobile) */}
            <div className="flex justify-start items-center h-full">

              {/* Mobile Drawer Trigger & Drawer */}
              <div className="flex md:hidden items-center">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <button aria-label="Open menu" className="p-2 -ml-2 rounded-full text-midnight hover:text-saffron-600 transition-colors">
                      <Menu className="w-6 h-6 stroke-[1.5]" />
                    </button>
                  </SheetTrigger>
                  <SheetContent 
                    side="left" 
                    className="w-[85vw] sm:max-w-[360px] md:max-w-[400px] bg-white text-midnight p-0 border-r border-stone-200 shadow-2xl [&>button]:hidden flex flex-col h-full"
                  >
                    {/* Header of Drawer */}
                    <div className="pt-8 pl-6 pb-4 flex justify-between items-center pr-6">
                      <SheetClose className="p-2 -ml-2 rounded-full text-midnight/70 hover:text-midnight transition-colors focus:outline-none">
                        <X className="w-6 h-6 stroke-[1.5]" />
                      </SheetClose>
                      <Link href="/" onClick={() => setOpen(false)} className="block">
                        <img
                          src="/Mainlogo.svg"
                          alt="SRIDATTAM"
                          className="h-[56px] w-auto object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const span = document.createElement('span');
                            span.className = "font-display text-lg tracking-[0.15em] text-maroon-500/85";
                            span.innerText = "SRIDATTAM";
                            e.target.parentNode.appendChild(span);
                          }}
                        />
                      </Link>
                    </div>

                    {/* Navigation stack */}
                    <nav className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
                      {/* Home */}
                      <div className="border-b border-stone-100 pb-5">
                        <Link 
                          href="/" 
                          onClick={() => setOpen(false)}
                          className="block text-base font-body font-medium tracking-[0.2em] uppercase text-midnight hover:text-saffron-600 transition-colors"
                        >
                          Home
                        </Link>
                      </div>

                      {/* Products (Expandable) */}
                      <div className="border-b border-stone-100 pb-5">
                        <button 
                          onClick={() => setProductsExpanded(!productsExpanded)}
                          className="w-full flex items-center justify-between text-base font-body font-medium tracking-[0.2em] uppercase text-midnight hover:text-saffron-600 transition-colors focus:outline-none"
                        >
                          <span>Products</span>
                          <ChevronDown className={cn("w-4 h-4 text-gold-600 transition-transform duration-300", productsExpanded && "rotate-180")} />
                        </button>
                        
                        {/* Smooth grid-transition for accordion */}
                        <div className={cn(
                          "grid transition-all duration-300 ease-in-out",
                          productsExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
                        )}>
                          <div className="overflow-hidden pl-4 space-y-4 border-l border-stone-200/60">
                            <Link 
                              href="/products" 
                              onClick={() => setOpen(false)}
                              className="block text-sm font-body tracking-[0.12em] text-midnight/70 hover:text-saffron-600 transition-colors pt-1"
                            >
                              All Products
                            </Link>
                            {categories.map(cat => (
                              <Link 
                                key={cat.id}
                                href={`/products?category=${cat.slug}`}
                                onClick={() => setOpen(false)}
                                className="block text-sm font-body tracking-[0.12em] text-midnight/70 hover:text-saffron-600 transition-colors"
                              >
                                {cat.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* About */}
                      <div className="border-b border-stone-100 pb-5">
                        <Link 
                          href="/about" 
                          onClick={() => setOpen(false)}
                          className="block text-base font-body font-medium tracking-[0.2em] uppercase text-midnight hover:text-saffron-600 transition-colors"
                        >
                          About
                        </Link>
                      </div>

                      {/* Track Order */}
                      <div className="border-b border-stone-100 pb-5">
                        <Link 
                          href="/track-order" 
                          onClick={() => setOpen(false)}
                          className="block text-base font-body font-medium tracking-[0.2em] uppercase text-midnight hover:text-saffron-600 transition-colors"
                        >
                          Track Order
                        </Link>
                      </div>
                    </nav>

                    {/* Bottom ritual statement */}
                    <div className="p-8 bg-stone-50/50 border-t border-stone-100 flex flex-col items-center text-center">
                      <p className="text-xs text-[#6B1024]/80 italic font-cormorant max-w-[240px] leading-relaxed">
                        &ldquo;The world bends toward those who have already decided. Sankalpa is that decision.&rdquo;
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Column 2: Brand Logo perfectly centered */}
            <div className="flex justify-center items-center h-full">
              <Logo />
            </div>

            {/* Column 3: Utility Actions (Search & Cart) aligned discreetly right */}
            <div className="flex justify-end items-center gap-3 h-full">
              {/* Search Toggle */}
              <button
                aria-label="Open search"
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-full transition-all hover:bg-stone-100 text-midnight hover:text-saffron-600"
              >
                <Search className="w-5 h-5 stroke-[1.5]" />
              </button>

              {/* Cart Button */}
              <button
                aria-label="Open cart"
                onClick={openDrawer}
                className={cn(
                  'relative p-2 rounded-full transition-all hover:bg-stone-100 text-midnight hover:text-saffron-600',
                  bumping && 'animate-bounce-cart'
                )}
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-saffron-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-1 ring-white animate-fade-in">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>

          </div>

          {/* Row 2: Horizontal Navigation Menu (Desktop Only) */}
          <div className="hidden md:flex justify-center border-t border-stone-200/50 py-5">
            <nav className="flex items-center gap-16">
              {nav.map(n => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-xs font-semibold tracking-[0.25em] uppercase text-midnight hover:text-saffron-600 transition-colors relative group py-1"
                >
                  {n.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-saffron-500 transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>
          </div>

        </div>

        {/* Minimalist Premium Search Overlay */}
        {showSearch && (
          <div className="absolute inset-0 bg-white z-50 flex items-center px-6 md:px-12 animate-fade-in border-b border-stone-200">
            <form onSubmit={onSearchSubmit} className="flex-1 flex items-center gap-4 max-w-4xl mx-auto">
              <Search className="w-5 h-5 text-gold-600 shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="What are you seeking today?..."
                className="w-full bg-transparent border-none outline-none text-midnight placeholder-midnight/40 text-lg md:text-xl font-body py-2 focus:ring-0"
                autoFocus
              />
            </form>
            <button
              onClick={() => setShowSearch(false)}
              className="text-xs tracking-[0.2em] uppercase text-midnight/60 hover:text-midnight transition-colors ml-4 focus:outline-none"
            >
              Close
            </button>
          </div>
        )}
      </header>
      <CartDrawer />
    </>
  )
}

