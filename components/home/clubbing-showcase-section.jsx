'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ShoppingBag, Plus, Minus, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ClubbingShowcaseSection({ clubbingRules = [], allProducts = [] }) {
  const { addItem, openDrawer, cart } = useCart()
  const [activeRuleIndex, setActiveRuleIndex] = useState(0)
  const [quantities, setQuantities] = useState({})

  if (!clubbingRules || clubbingRules.length === 0) {
    return null
  }

  const activeRule = clubbingRules[activeRuleIndex] || clubbingRules[0]
  if (!activeRule) return null

  // Determine eligible products for this rule
  const rawList = Array.isArray(activeRule.clubbingProducts) && activeRule.clubbingProducts.length > 0
    ? activeRule.clubbingProducts
    : Array.isArray(activeRule.products) && activeRule.products.length > 0
      ? activeRule.products
      : []

  let eligibleProducts = rawList.map((item) => {
    const prod = item.product || item
    const rawImages = Array.isArray(prod.images) ? prod.images : []
    const firstImg = item.image || (rawImages.length > 0 ? (typeof rawImages[0] === 'string' ? rawImages[0] : rawImages[0]?.src) : '') || (prod.sku ? `https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev/products/${prod.sku}.png` : '/HD1.png')
    
    const orig = Number(item.originalPrice || prod.basePrice || prod.regular_price || prod.price || 180)
    const deal = Number(item.clubbingPrice || prod.salePrice || (orig > 40 ? Math.round(orig * 0.8) : orig))
    const disc = Number(item.discountPercentage || (orig > deal ? Math.round(((orig - deal) / orig) * 100) : 20))

    return {
      id: item.productId || prod.id,
      productId: item.productId || prod.id,
      title: prod.title || item.name || prod.name || 'Sacred Incense',
      name: prod.title || item.name || prod.name || 'Sacred Incense',
      slug: prod.slug || item.slug || '',
      image: firstImg,
      category: item.category || prod.category?.name || 'Incense Sticks',
      originalPrice: orig,
      clubbingPrice: deal,
      discountPercentage: disc,
      shortDescription: prod.shortDescription || prod.description || 'Authentic pure botanical fragrance.',
    }
  }).filter((p) => p.id)

  if (eligibleProducts.length === 0 && allProducts.length > 0) {
    eligibleProducts = allProducts.slice(0, 4).map((prod) => {
      const rawImages = Array.isArray(prod.images) ? prod.images : []
      const firstImg = rawImages.length > 0 ? (typeof rawImages[0] === 'string' ? rawImages[0] : rawImages[0]?.src) : (prod.sku ? `https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev/products/${prod.sku}.png` : '/HD1.png')
      const orig = Number(prod.basePrice || 180)
      const deal = Math.round(orig * 0.8)
      return {
        id: prod.id,
        productId: prod.id,
        title: prod.title || prod.name,
        name: prod.title || prod.name,
        slug: prod.slug || '',
        image: firstImg,
        category: prod.category?.name || 'Incense Sticks',
        originalPrice: orig,
        clubbingPrice: deal,
        discountPercentage: Math.round(((orig - deal) / orig) * 100),
        shortDescription: prod.shortDescription || 'Authentic pure botanical fragrance.',
      }
    })
  }

  // Calculate live bundle progress from the customer's cart
  const eligibleIds = new Set(eligibleProducts.map((p) => p.id))
  const matchingCartItems = (cart?.items || []).filter((item) => {
    const id = item.productId || item.product_id || item.id
    return eligibleIds.size === 0 || eligibleIds.has(id)
  })

  const currentCartCount = matchingCartItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0,
  )
  const targetQuantity = Number(activeRule.requiredQuantity) || 1
  const isUnlocked = currentCartCount >= targetQuantity
  const remaining = Math.max(0, targetQuantity - currentCartCount)
  const progressPercent = Math.min(100, Math.round((currentCartCount / targetQuantity) * 100))

  const handleAddBundleItem = async (e, product) => {
    e.preventDefault()
    e.stopPropagation()

    const qty = quantities[product.id] || 1
    try {
      await addItem({
        product_id: product.id,
        id: product.id,
        title: product.title,
        name: product.title,
        slug: product.slug,
        price: product.clubbingPrice,
        regular_price: product.originalPrice,
        image: product.image,
      }, qty)

      toast.success(`✨ Added ×${qty} "${product.title}" to cart at clubbing price ₹${product.clubbingPrice}!`)
      openDrawer()
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }))
    } catch (err) {
      console.error('Failed to add bundle item:', err)
      toast.error('Failed to add item to cart')
    }
  }

  const updateCardQty = (productId, delta) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1
      const next = Math.max(1, current + delta)
      return { ...prev, [productId]: next }
    })
  }

  return (
    <section id="festival-clubbing-deals" className="py-16 md:py-24 bg-gradient-to-b from-[#190408]/5 via-[#D7A65B]/5 to-transparent border-t border-stone-200/80 relative z-10 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute left-1/2 -top-24 -translate-x-1/2 w-96 h-96 bg-[#D7A65B]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6B1024]/10 border border-[#6B1024]/20 text-[#6B1024] text-xs font-semibold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#D7A65B]" />
            <span>{activeRule.tagline || 'FESTIVAL CLUBBING & BUNDLE OFFERS'}</span>
          </div>

          <h2 className="font-cormorant text-3xl sm:text-4xl md:text-5xl text-[#6B1024] tracking-wide uppercase font-bold leading-tight">
            {activeRule.name}
          </h2>

          <p className="text-xs sm:text-sm text-[#6B1024]/80 font-light max-w-lg mx-auto">
            {activeRule.description ||
              'Handcrafted sacred temple agarbatti and pure bamboo-free dhoop at celebratory clubbing prices.'}
          </p>

          <div className="w-16 h-px bg-[#D7A65B] mx-auto mt-2" />
        </div>

        {/* Multi-Rule Tabs (If more than one active clubbing rule exists) */}
        {clubbingRules.length > 1 && (
          <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
            {clubbingRules.map((rule, idx) => (
              <button
                key={rule.id || idx}
                onClick={() => setActiveRuleIndex(idx)}
                className={cn(
                  'px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all rounded-full border cursor-pointer',
                  activeRuleIndex === idx
                    ? 'bg-[#6B1024] text-white border-[#6B1024] shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-[#6B1024]/40 hover:text-[#6B1024]',
                )}
              >
                {rule.name}
              </button>
            ))}
          </div>
        )}

        {/* Bundle Banner & Live Progress Strip */}
        <div className="bg-gradient-to-r from-[#6B1024] via-[#851932] to-[#6B1024] text-white rounded-none p-6 sm:p-8 mb-12 shadow-xl border border-[#D7A65B]/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10 pointer-events-none">
            <Sparkles size={220} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-[#D7A65B] text-[#130306] px-3 py-1 rounded-none text-xs font-bold uppercase tracking-wider">
                <Sparkles size={13} />
                {activeRule.type === 'fixed_price_bundle'
                  ? `Any ${targetQuantity} Items for ₹${Number(activeRule.fixedPrice || 0).toLocaleString('en-IN')}`
                  : `Special Clubbing Pricing • Up to 25% Savings`}
              </div>

              <h3 className="text-xl sm:text-2xl font-cormorant font-bold text-white tracking-wide">
                Special Celebratory Offerings
              </h3>

              <p className="text-xs text-white/80 font-light">
                Add qualifying items below to your cart. Special clubbing prices apply directly to your festive order.
              </p>
            </div>

            {/* Quick Link to Dedicated Festive Page */}
            <div className="flex items-center">
              <Button asChild className="bg-[#D7A65B] hover:bg-[#c29348] text-[#130306] font-bold text-xs uppercase tracking-wider rounded-none px-6 py-3">
                <Link href="/festive" className="flex items-center gap-2">
                  <span>View Festive Showcase</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Qualifying Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
          {eligibleProducts.map((product) => {
            const cardQty = quantities[product.id] || 1
            const hasDiscount = product.originalPrice > product.clubbingPrice

            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between bg-white border border-stone-200/90 rounded-none p-3 sm:p-4 hover:shadow-xl hover:border-[#6B1024]/40 transition-all duration-300"
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#6B1024] bg-[#6B1024]/5 px-2 py-0.5 border border-[#6B1024]/15">
                      <Sparkles size={10} className="text-[#D7A65B]" />
                      {product.category}
                    </span>
                    {hasDiscount && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                        SAVE ₹{product.originalPrice - product.clubbingPrice} ({product.discountPercentage}% OFF)
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <Link
                    href={`/products/${product.slug || product.id}`}
                    className="relative aspect-square w-full block overflow-hidden bg-stone-50"
                  >
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized={product.image.startsWith('http')}
                    />
                  </Link>

                  {/* Title and details */}
                  <div className="space-y-1 text-left">
                    <Link
                      href={`/products/${product.slug || product.id}`}
                      className="block font-cormorant text-base sm:text-lg font-bold text-[#6B1024] hover:underline line-clamp-1"
                    >
                      {product.title}
                    </Link>
                    <p className="text-[10px] text-stone-500 line-clamp-2 h-7 font-light">
                      {product.shortDescription}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="font-cormorant font-bold text-[#6B1024] text-base sm:text-lg">
                        ₹{product.clubbingPrice}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-stone-400 line-through">
                          ₹{product.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add to Cart Actions */}
                <div className="pt-3 mt-3 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-center border border-stone-200 bg-stone-50/70 h-8 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => updateCardQty(product.id, -1)}
                      className="p-1 hover:bg-stone-200 text-stone-600 transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs text-stone-800 min-w-[20px] text-center">
                      {cardQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCardQty(product.id, 1)}
                      className="p-1 hover:bg-stone-200 text-stone-600 transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <Button
                    onClick={(e) => handleAddBundleItem(e, product)}
                    className="w-full bg-[#6B1024] hover:bg-[#4D0013] text-white border border-[#6B1024] rounded-none font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5 h-10 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>Add at Clubbing Price</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
