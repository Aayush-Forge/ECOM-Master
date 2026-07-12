'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Flame, 
  Leaf, 
  Star, 
  ChevronRight, 
  Sparkles, 
  AlertCircle, 
  Heart, 
  ArrowRight, 
  ChevronLeft, 
  Plus, 
  Minus, 
  Check, 
  Compass, 
  Play, 
  ShoppingBag,
  Clock,
  Package,
  ShieldCheck
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'

function HomeProductCard({ product, wishlist, toggleWishlist, handleAddToCart }) {
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [cardQty, setCardQty] = useState(1)
  const images = product.images || []
  const isVariable = product.type === 'variable'
  const inStock = product.stock_status === 'instock' || product.stock_status === undefined
  const hasMultipleImages = images.length > 1
  const inWishlist = wishlist.includes(product.id)
  
  const handlePrevImg = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImg = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImgIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const currentImg = images[activeImgIdx]?.src || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'
  const price = parseFloat(product.price) || 0
  const compareAt = parseFloat(product.compareAt || product.regular_price) || 0
  const rating = parseFloat(product.average_rating) || 0
  const ratingCount = parseInt(product.rating_count) || 0

  return (
    <div className="group bg-white border border-stone-200 p-3 sm:p-4 flex flex-col justify-between shadow-sm relative transition-all duration-500 hover:border-[#D7A65B]/40 hover:shadow-md hover:bg-stone-50/20 rounded-sm overflow-hidden">
      {/* Invisible overlay Link to make the whole card clickable */}
      <Link href={`/products/${product.slug}`} className="absolute inset-0 z-10" />

      <div className="space-y-3 sm:space-y-4">
        {/* Image Frame */}
        <div className="aspect-square w-full relative overflow-hidden bg-stone-50 border border-stone-150 group/img rounded-sm">
          <Image 
            src={currentImg} 
            alt={product.name} 
            fill 
            className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
            unoptimized
          />
          
          {/* Swiper Arrow buttons, visible on hover */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 border border-stone-200 text-[#6B1024] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 z-20 hover:bg-white hover:scale-110"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 border border-stone-200 text-[#6B1024] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 z-20 hover:bg-white hover:scale-110"
                aria-label="Next image"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Dot Indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20 bg-black/10 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setActiveImgIdx(i)
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      activeImgIdx === i ? 'bg-[#D7A65B] scale-110' : 'bg-white/60 hover:bg-white'
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info details */}
        <div className="space-y-1 text-left">
          <div className="space-y-0.5">
            <h3 className="font-cormorant text-base sm:text-xl text-[#6B1024] font-bold leading-snug tracking-wide line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#6B1024]/75 line-clamp-2 h-7 sm:h-8 font-light leading-relaxed">
              {product.short_description?.replace(/<[^>]*>/g, '') || 'Authentic pure botanical fragrance.'}
            </p>
          </div>

          {/* Rating row */}
          <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, s) => {
                const filled = s < Math.round(rating)
                return (
                  <Star 
                    key={s} 
                    className={`w-2.5 h-2.5 ${filled ? 'fill-[#D7A65B] text-[#D7A65B]' : 'text-stone-300'}`} 
                  />
                )
              })}
            </div>
            <span className="text-[9px] text-[#6B1024]/60 font-light">
              {ratingCount > 0 ? `${rating} (${ratingCount})` : 'No reviews'}
            </span>
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-sm sm:text-lg font-cormorant font-bold text-[#6B1024]">
              ₹{price.toFixed(0)}
            </span>
            {compareAt > price && (
              <>
                <span className="text-[10px] sm:text-xs text-[#6B1024]/50 line-through">
                  ₹{compareAt.toFixed(0)}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-sm">
                  Save ₹{(compareAt - price).toFixed(0)} ({Math.round(((compareAt - price) / compareAt) * 100)}%)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions panel */}
      <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-stone-100 z-20 relative">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          {/* Quantity Selector Row */}
          {!isVariable && inStock && (
            <div className="flex items-center justify-center border border-stone-200 rounded-sm bg-stone-50/55 py-1.5 px-3 h-10 gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    setCardQty(q => Math.max(1, q - 1)) 
                  }} 
                  className="p-1 hover:bg-stone-200 rounded-full text-stone-600 transition"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold min-w-[16px] text-center text-midnight text-xs sm:text-sm">{cardQty}</span>
                <button 
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    setCardQty(q => q + 1) 
                  }} 
                  className="p-1 hover:bg-stone-200 rounded-full text-stone-600 transition"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <Button 
            onClick={(e) => handleAddToCart(e, product, cardQty)}
            className="w-full bg-[#6B1024] hover:bg-[#4D0013] text-white border border-[#6B1024] px-2 py-3.5 sm:py-4 rounded-none font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5 h-10"
            disabled={!inStock}
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" /> {inStock ? 'Add To Cart' : 'Out of Stock'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Section 7: Default/Fallback Testimonials Data
const testimonials = [
  {
    name: 'Anjali R.',
    role: 'Verified Buyer',
    quote: 'The fragrance transforms our daily prayer into a peaceful experience.',
    rating: 5,
    initial: 'A'
  },
  {
    name: 'Vikram S.',
    role: 'Ritual Practitioner',
    quote: 'Premium packaging and exceptional quality.',
    rating: 5,
    initial: 'V'
  },
  {
    name: 'Meera K.',
    role: 'Daily Devotee',
    quote: 'Long-lasting aroma with an authentic traditional feel.',
    rating: 5,
    initial: 'M'
  }
]

export default function Home() {
  const { addItem, openDrawer } = useCart()
  
  // WooCommerce connection state
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [notConfigured, setNotConfigured] = useState(false)

  // Wishlist, Slider and Testimonial states
  const [wishlist, setWishlist] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [dynamicTestimonials, setDynamicTestimonials] = useState([])

  useEffect(() => {
    Promise.all([
      fetch('/api/products?featured=true&limit=8').then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
      fetch('/api/categories').then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })),
      fetch('/api/products/reviews').then(async r => ({ ok: r.ok, status: r.status, data: await r.json() })).catch(() => ({ ok: false, data: [] }))
    ]).then(([p, c, rev]) => {
      if (!p.ok && p.data?.code === 'WC_NOT_CONFIGURED') {
        setNotConfigured(true)
        setProducts(SEED_PRODUCTS.slice(0, 8))
      } else {
        setProducts(Array.isArray(p.data) && p.data.length > 0 ? p.data : SEED_PRODUCTS.slice(0, 8))
      }
      setCategories(Array.isArray(c.data) ? c.data : [])

      if (rev.ok && Array.isArray(rev.data)) {
        const filtered = rev.data.filter(r => r.rating === 4 || r.rating === 5)
        if (filtered.length > 0) {
          const mapped = filtered.map(r => ({
            name: r.reviewer,
            role: 'Verified Buyer',
            quote: r.review.replace(/<[^>]*>/g, '').trim(),
            rating: r.rating,
            initial: (r.reviewer || 'D').trim().charAt(0).toUpperCase()
          }))
          setDynamicTestimonials(mapped)
        }
      }

      setLoading(false)
    }).catch(() => {
      setProducts(SEED_PRODUCTS.slice(0, 8))
      setLoading(false)
    })
  }, [])

  // Auto-play testimonials slider
  useEffect(() => {
    const totalMobileSlides = dynamicTestimonials.length > 0 ? dynamicTestimonials.length : testimonials.length
    const totalDesktopSlides = Math.ceil(totalMobileSlides / 3)
    if (totalMobileSlides <= 1) return

    const timer = setInterval(() => {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
      const maxSlides = isDesktop ? totalDesktopSlides : totalMobileSlides
      setTestimonialIndex(prev => (prev + 1) % maxSlides)
    }, 8000)
    return () => clearInterval(timer)
  }, [dynamicTestimonials.length, testimonials.length])

  // Wishlist Handler
  const toggleWishlist = (productId, productName) => {
    setWishlist(prev => {
      const exists = prev.includes(productId)
      if (exists) {
        toast.info(`Removed "${productName}" from your wishlist`)
        return prev.filter(id => id !== productId)
      } else {
        toast.success(`Added "${productName}" to your wishlist`)
        return [...prev, productId]
      }
    })
  }

  // Cart Add Handler
  const handleAddToCart = (e, product, quantity = 1) => {
    e.preventDefault()
    e.stopPropagation()
    const img = product.images?.[0]?.src || ''
    const isVariable = product.type === 'variable'

    if (isVariable) {
      window.location.href = `/products/${product.slug}`
      return
    }

    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.price) || 0,
      regular_price: parseFloat(product.compareAt || product.regular_price) || parseFloat(product.price) || 0,
      image: img,
      weight: parseFloat(product.weight) || 0,
      attrs: []
    }, quantity)
    
    toast.success(`Added ×${quantity} "${product.name}" to cart`)
    openDrawer()
  }

  // Hero Slider Data
  const slides = [
    {
      id: 1,
      headline: 'SRIDATTAM Agarbatti',
      subheadline: 'Premium botanical incense sticks crafted for daily rituals, peace, and reflection.',
      cta: 'Explore Collection',
      link: '/products',
      desktopImage: '/S1D.png',
      mobileImage: '/S1M.png',
      image: '/S1D.png',
      layoutType: 'right'
    }
  ]

  // Auto transition hero slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  // Touch Swipe Gesture Handlers
  const minSwipeDistance = 50 

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe) {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    } else if (isRightSwipe) {
      setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1))
    }
  }

  // Section 2: Trust Highlights (Matched to About page's Purity Promise)
  const trustHighlights = [
    {
      title: 'Pure Wood Base',
      desc: 'Made entirely from clean, natural wood-powder bases without toxic binders or coal dust.',
      icon: Leaf
    },
    {
      title: 'Sacred Sambrani',
      desc: 'Infused with authentic natural Sambrani resin (Loban) for air purification and positive energy.',
      icon: Flame
    },
    {
      title: '100% Charcoal-Free',
      desc: 'Completely free from charcoal, guaranteeing zero toxic black soot and pure botanical smoke.',
      icon: ShieldCheck
    },
    {
      title: 'Proudly Made in India',
      desc: 'Crafted using local sacred flora, herbs, and traditional Vedic processes by Indian artisans.',
      icon: Heart
    }
  ]

  // Section 5 Categories Format helper functions
  const getCategoryImage = (cat) => {
    if (cat.image?.src) return cat.image.src
    const fallbacks = {
      sandalwood: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      floral: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80',
      resins: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&w=600&q=80',
      samidha: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80',
      camphor: 'https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80',
      combos: 'https://images.unsplash.com/photo-1617954095840-0427f79be4cf?auto=format&fit=crop&w=600&q=80'
    }
    return fallbacks[cat.slug] || 'https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=600&q=80'
  }

  const getCategoryDesc = (cat) => {
    const descriptions = {
      sandalwood: 'Premium slow-burning natural Mysore sandalwood formulations.',
      floral: 'Velvety damask rose, Mogra jasmine and garden flora.',
      resins: 'Oman frankincense, Loban and golden guggulu gum crystals.',
      samidha: 'Aromatic mango logs pre-soaked in Desi ghee & honey.',
      camphor: 'Pure Bhimseni camphor crystals for daily cleanses.',
      combos: 'Curated wellness bundles and starter sets.'
    }
    return descriptions[cat.slug] || 'Authentic pure Indian fragrances.'
  }

  // Filter Categories to display 4 cards
  const displayedCategories = categories.length > 0 
    ? categories.filter(c => c.slug !== 'uncategorized').slice(0, 4) 
    : SEED_CATEGORIES.slice(0, 4)

  const activeTestimonials = dynamicTestimonials.length > 0 ? dynamicTestimonials : testimonials

  // Group testimonials into pages of 3 for desktop
  const desktopSlides = []
  for (let i = 0; i < activeTestimonials.length; i += 3) {
    desktopSlides.push(activeTestimonials.slice(i, i + 3))
  }

  // Group testimonials into pages of 1 for mobile
  const mobileSlides = activeTestimonials.map(t => [t])

  const desktopIndex = Math.min(testimonialIndex, Math.max(0, desktopSlides.length - 1))
  const mobileIndex = Math.min(testimonialIndex, Math.max(0, mobileSlides.length - 1))

  return (
    <main className="min-h-screen bg-transparent text-[#6B1024] font-inter overflow-x-hidden selection:bg-[#6B1024] selection:text-white relative">
      <Header />

      {/* SECTION 1 — HERO SLIDER */}
      <section 
        className="relative h-[65vh] md:h-[75vh] w-full overflow-hidden bg-[#130306]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
              currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Clickable Image Slide Link */}
            <Link href={slide.link} className="absolute inset-0 z-20 cursor-pointer">
              {slide.desktopImage && slide.mobileImage ? (
                <>
                  {/* Desktop version */}
                  <div className="hidden md:block absolute inset-0">
                    <Image 
                      src={slide.desktopImage}
                      alt={slide.headline} 
                      fill 
                      priority={idx === 0}
                      className="object-cover"
                      unoptimized 
                    />
                  </div>
                  {/* Mobile version */}
                  <div className="block md:hidden absolute inset-0">
                    <Image 
                      src={slide.mobileImage}
                      alt={slide.headline} 
                      fill 
                      priority={idx === 0}
                      className="object-cover"
                      unoptimized 
                    />
                  </div>
                </>
              ) : (
                <Image 
                  src={slide.image}
                  alt={slide.headline} 
                  fill 
                  priority={idx === 0}
                  className="object-cover"
                  unoptimized 
                />
              )}
            </Link>
          </div>
        ))}

        {/* Carousel controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'bg-[#D7A65B] w-8' : 'bg-[#F7E9D1]/30 hover:bg-[#D7A65B]/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2 — TRUST & QUALITY HIGHLIGHTS */}
      <section className="bg-transparent border-b border-stone-100 py-10 md:py-12 relative z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {trustHighlights.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-stone-200/60 p-5 md:p-6 flex flex-col justify-between items-center text-center group hover:border-[#D7A65B]/40 hover:bg-stone-50/20 transition-all duration-500 shadow-sm animate-fade-in"
              >
                <div className="w-14 h-14 mx-auto rounded-full border border-[#D7A65B]/40 text-[#D7A65B] flex items-center justify-center mb-4 bg-stone-50 group-hover:scale-110 transition-all duration-500 shrink-0">
                  <item.icon className="w-6 h-6 stroke-[1.25]" />
                </div>
                <div className="space-y-1 flex-grow flex flex-col justify-center">
                  <h3 className="font-cormorant text-lg md:text-xl font-bold tracking-widest text-[#D7A65B] uppercase mb-1 lining-nums">
                    {item.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[#6B1024]/75 font-light leading-relaxed max-w-[180px] mx-auto">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — FEATURED PRODUCTS */}
      <section className="py-16 md:py-20 bg-transparent relative z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs tracking-[0.25em] text-[#D7A65B] uppercase block font-semibold">SHOP THE COLLECTION</span>
            <h2 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] tracking-widest uppercase font-light">Featured Collection</h2>
            <p className="text-xs text-[#6B1024]/75 font-light">Our most loved fragrances and ritual essentials.</p>
            <div className="w-12 h-px bg-[#D7A65B] mx-auto mt-3" />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square bg-stone-300/40 rounded-none animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
              {products.slice(0, 8).map((product) => (
                <HomeProductCard
                  key={product.id}
                  product={product}
                  wishlist={wishlist}
                  toggleWishlist={toggleWishlist}
                  handleAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4 — COMPLETE RITUAL KITS */}
      <section className="py-16 md:py-20 bg-transparent text-[#6B1024] border-y border-stone-150 relative z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs tracking-[0.25em] text-[#D7A65B] uppercase block font-semibold">CURATED RITUAL BUNDLES</span>
            <h2 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] tracking-widest uppercase font-light">Complete Ritual Kits</h2>
            <p className="text-xs text-[#6B1024]/75 font-light">Curated combinations designed for meaningful rituals.</p>
            <div className="w-12 h-px bg-[#D7A65B] mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left: Image with golden border */}
            <div className="relative aspect-square w-full max-w-lg mx-auto overflow-hidden bg-stone-50 border border-[#D7A65B]/35 shadow-xl group">
              <Image 
                src="/ritual-kit.png" 
                alt="SRIDATTAM Premium Ritual Box" 
                fill 
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                unoptimized 
              />
            </div>

            {/* Right: Copywriting and Bullet details */}
            <div className="space-y-6 text-left max-w-xl mx-auto lg:mx-0">
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-[0.25em] text-[#D7A65B] uppercase block">
                  THE RITUAL BUNDLE
                </span>
                <h3 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] uppercase tracking-wider font-light leading-tight">
                  SRIDATTAM Premium Ritual Box
                </h3>
                <p className="text-sm text-[#6B1024]/85 leading-relaxed font-light">
                  Thoughtfully created with absolute devotion, purity, and respect for centuries-old Indian wellness traditions. This complete collection features our signature pure sandalwood sticks, charcoal-free dhoop cups, camphor crystals, and cotton wicks to manifest a serene temple atmosphere in your home.
                </p>
              </div>

              {/* Kit inclusion items checklist */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[10px] tracking-[0.2em] text-[#D7A65B] font-bold block uppercase">
                  Products Included:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Chandan Agarbatti & Cones',
                    'Natural Resins & Dhoop Cups',
                    'Pure Bhimseni Camphor',
                    'Brass Burner Plate & Accessories'
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center text-xs text-[#6B1024]/90 font-light">
                      <div className="w-5 h-5 border border-[#D7A65B]/30 rounded-full flex items-center justify-center text-[#D7A65B] bg-[#240A0F] shrink-0">
                        <Check className="w-3 h-3 stroke-[2]" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-150">
                <Button asChild size="lg" className="bg-[#6B1024] hover:bg-[#4D0013] text-white font-semibold tracking-widest rounded-none px-8 py-5 text-xs uppercase transition-colors duration-300">
                  <Link href="/products?category=combos">Shop Ritual Kit</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — EXPLORE OUR COLLECTION */}
      <section className="py-16 md:py-20 bg-transparent border-b border-stone-150 relative z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs tracking-[0.25em] text-[#D7A65B] uppercase block font-semibold">DISCOVER EVERYTHING</span>
            <h2 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] tracking-widest uppercase font-light">Explore Our Ritual Collection</h2>
            <p className="text-xs text-[#6B1024]/75 font-light">Discover every fragrance and ritual essential.</p>
            <div className="w-12 h-px bg-[#D7A65B] mx-auto mt-3" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {displayedCategories.map((cat, idx) => (
              <Link 
                key={idx}
                href={`/products?category=${cat.slug}`}
                className="group bg-white border border-stone-200 p-3 sm:p-4 flex flex-col justify-between shadow-sm relative transition-all duration-500 hover:border-[#D7A65B]/40 hover:shadow-md hover:bg-stone-50/20 h-full"
              >
                <div className="space-y-3 sm:space-y-4">
                  {/* Category Image Box */}
                  <div className="aspect-[4/3] w-full relative overflow-hidden bg-stone-50 border border-stone-200">
                    <Image 
                      src={getCategoryImage(cat)} 
                      alt={cat.name} 
                      fill 
                      className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105" 
                      unoptimized 
                    />
                    <div className="absolute bottom-2.5 right-2.5 bg-[#6B1024] text-white text-[9px] font-bold tracking-widest px-2.5 py-1 uppercase border border-[#D7A65B]/20 z-10">
                      {cat.count} Products
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5 text-left">
                    <h3 className="font-cormorant text-lg sm:text-xl text-[#6B1024] tracking-wider uppercase font-bold">
                      {cat.name}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-[#6B1024]/75 font-light leading-relaxed h-10 sm:h-12 overflow-hidden">
                      {cat.description?.replace(/<[^>]*>/g, '') || getCategoryDesc(cat)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — BRAND STORY IMMERSIVE BANNER */}
      <section className="relative py-24 flex items-center justify-center overflow-hidden bg-transparent text-[#6B1024] border-y border-stone-150 z-10">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1600&q=80" 
            alt="Warm atmosphere" 
            fill 
            className="object-cover opacity-5 scale-105" 
            unoptimized 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-white/90" />
        </div>
        
        <div className="container relative z-10 max-w-3xl text-center px-4 space-y-6">
          <span className="text-xs font-semibold tracking-[0.3em] text-[#D7A65B] uppercase block">THE SRIDATTAM LEGACY</span>
          <h2 className="font-cormorant text-3xl md:text-4xl tracking-widest uppercase font-light leading-tight">
            Crafted For Rituals.<br/>Inspired By Tradition.
          </h2>
          <div className="w-12 h-px bg-[#D7A65B] mx-auto" />
          <p className="text-sm md:text-base text-[#6B1024]/90 max-w-xl mx-auto leading-relaxed font-light font-cormorant italic">
            Every product is thoughtfully created with devotion, purity, craftsmanship, and respect for timeless Indian traditions.
          </p>
          <div className="pt-4">
            <Button asChild size="lg" variant="outline" className="border-[#6B1024]/30 text-[#6B1024] hover:bg-[#6B1024]/10 hover:border-[#6B1024] font-semibold tracking-widest rounded-none px-8 py-5 text-xs uppercase transition-all duration-300 bg-transparent">
              <Link href="/about">Learn Our Story</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 7 — TESTIMONIALS */}
      <section className="py-16 md:py-20 bg-transparent border-b border-stone-150 text-[#6B1024] relative z-10">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs tracking-[0.25em] text-[#D7A65B] uppercase block font-semibold">SHARED EXPERIENCES</span>
            <h2 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] tracking-widest uppercase font-light">What Our Customers Say</h2>
            <div className="w-12 h-px bg-[#D7A65B] mx-auto mt-3" />
          </div>

          {/* Desktop/Tablet Swipeable View */}
          <div className="hidden md:block relative w-full overflow-hidden py-4">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${desktopIndex * 100}%)` }}
            >
              {desktopSlides.map((slide, slideIdx) => (
                <div key={slideIdx} className="w-full flex-shrink-0 grid grid-cols-3 gap-8 px-1">
                  {slide.map((t, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white border border-stone-200 p-8 text-left shadow-sm flex flex-col justify-between h-full hover:border-[#D7A65B]/40 hover:bg-stone-50/20 hover:shadow-md transition-all duration-500"
                    >
                      <div className="space-y-4">
                        <div className="flex gap-0.5">
                          {[...Array(t.rating)].map((_, s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-[#D7A65B] text-[#D7A65B]" />
                          ))}
                        </div>
                        <p className="italic text-sm md:text-base text-[#6B1024]/90 leading-relaxed font-cormorant min-h-[80px]">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-6 border-t border-stone-150 mt-6">
                        <div className="w-9 h-9 rounded-full border border-[#D7A65B]/30 flex items-center justify-center font-cormorant text-[#D7A65B] bg-[#240A0F] text-xs font-semibold shrink-0">
                          {t.initial}
                        </div>
                        <div>
                          <cite className="font-semibold uppercase tracking-wider text-[10px] text-[#6B1024] not-italic block">{t.name}</cite>
                          <span className="text-[9px] text-[#6B1024]/60 font-light block">{t.role}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {slide.length < 3 && [...Array(3 - slide.length)].map((_, i) => (
                    <div key={`empty-${i}`} className="invisible" />
                  ))}
                </div>
              ))}
            </div>

            {/* Desktop Slide Navigation Controls */}
            {desktopSlides.length > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button 
                  onClick={() => setTestimonialIndex(prev => (prev === 0 ? desktopSlides.length - 1 : prev - 1))} 
                  className="p-2.5 border border-[#6B1024]/20 text-[#6B1024] hover:bg-[#6B1024]/5 transition rounded-sm"
                  aria-label="Previous testimonials page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                  {desktopSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTestimonialIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        desktopIndex === idx ? 'bg-[#D7A65B] w-6' : 'bg-[#6B1024]/20 hover:bg-[#6B1024]/40'
                      }`}
                      aria-label={`Go to page ${idx + 1}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={() => setTestimonialIndex(prev => (prev === desktopSlides.length - 1 ? 0 : prev + 1))} 
                  className="p-2.5 border border-[#6B1024]/20 text-[#6B1024] hover:bg-[#6B1024]/5 transition rounded-sm"
                  aria-label="Next testimonials page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Swipeable View */}
          <div className="block md:hidden relative w-full overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${mobileIndex * 100}%)` }}
            >
              {mobileSlides.map((slide, slideIdx) => {
                const t = slide[0]
                return (
                  <div key={slideIdx} className="w-full flex-shrink-0 px-1">
                    <div className="bg-white border border-stone-200 p-8 text-left shadow-sm flex flex-col justify-between h-full min-h-[220px]">
                      <div className="space-y-4">
                        <div className="flex gap-0.5">
                          {[...Array(t.rating || 5)].map((_, s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-[#D7A65B] text-[#D7A65B]" />
                          ))}
                        </div>
                        <p className="italic text-sm text-[#6B1024]/90 leading-relaxed font-cormorant min-h-[60px]">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-6 border-t border-stone-150 mt-6">
                        <div className="w-9 h-9 rounded-full border border-[#D7A65B]/30 flex items-center justify-center font-cormorant text-[#D7A65B] bg-[#240A0F] text-xs font-semibold shrink-0">
                          {t.initial}
                        </div>
                        <div>
                          <cite className="font-semibold uppercase tracking-wider text-[10px] text-[#6B1024] not-italic block">{t.name}</cite>
                          <span className="text-[9px] text-[#6B1024]/60 font-light block">{t.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mobile Slide Navigation Buttons */}
            {mobileSlides.length > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-150 px-2">
                <button 
                  onClick={() => setTestimonialIndex(prev => (prev === 0 ? mobileSlides.length - 1 : prev - 1))} 
                  className="p-2 border border-[#6B1024]/20 text-[#6B1024] hover:bg-[#6B1024]/5"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-[#6B1024]/75">{mobileIndex + 1} / {mobileSlides.length}</span>
                <button 
                  onClick={() => setTestimonialIndex(prev => (prev === mobileSlides.length - 1 ? 0 : prev + 1))} 
                  className="p-2 border border-[#6B1024]/20 text-[#6B1024] hover:bg-[#6B1024]/5"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
