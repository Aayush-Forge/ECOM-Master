'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ShoppingBag, Plus, Minus, Check, ArrowRight, Package } from 'lucide-react'
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
  let eligibleProducts = Array.isArray(activeRule.products)
    ? activeRule.products.map((p) => p.product || p).filter((p) => p && (p.id || p.title))
    : []

  if (eligibleProducts.length === 0 && activeRule.applicableCategoryId) {
    eligibleProducts = allProducts.filter((p) => p.categoryId === activeRule.applicableCategoryId)
  }

  if (eligibleProducts.length === 0) {
    eligibleProducts = allProducts.slice(0, 4)
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
  const targetQuantity = Number(activeRule.requiredQuantity) || 2
  const isUnlocked = currentCartCount >= targetQuantity
  const remaining = Math.max(0, targetQuantity - currentCartCount)
  const progressPercent = Math.min(100, Math.round((currentCartCount / targetQuantity) * 100))

  const handleAddBundleItem = async (e, product) => {
    e.preventDefault()
    e.stopPropagation()

    const qty = quantities[product.id] || 1
    try {
      await addItem(product, qty)
      const newTotal = currentCartCount + qty
      if (newTotal >= targetQuantity) {
        toast.success(
          `✨ "${product.title}" added! You've unlocked the ${activeRule.name} bundle savings!`,
        )
      } else {
        const left = targetQuantity - newTotal
        toast.success(
          `Added to bundle! Add ${left} more qualifying item${left > 1 ? 's' : ''} to activate this deal.`,
        )
      }
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }))
    } catch (err) {
      console.error('Failed to add bundle item:', err)
      toast.error('Failed to add item to bundle')
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
            <span>FESTIVAL CLUBBING & BUNDLE OFFERS</span>
          </div>

          <h2 className="font-cormorant text-3xl sm:text-4xl md:text-5xl text-[#6B1024] tracking-wide uppercase font-bold leading-tight">
            {activeRule.name}
          </h2>

          <p className="text-xs sm:text-sm text-[#6B1024]/80 font-light max-w-lg mx-auto">
            {activeRule.description ||
              'Mix and match qualifying sacred aromas below. Bundle discounts are calculated automatically upon meeting the required quantity.'}
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
        <div className="bg-gradient-to-r from-[#6B1024] via-[#851932] to-[#6B1024] text-white rounded-2xl p-6 sm:p-8 mb-12 shadow-xl border border-[#D7A65B]/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10 pointer-events-none">
            <Sparkles size={220} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-[#D7A65B] text-[#130306] px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                <Sparkles size={13} />
                {activeRule.type === 'fixed_price_bundle'
                  ? `Any ${targetQuantity} Items for ₹${Number(activeRule.fixedPrice || 0).toLocaleString('en-IN')}`
                  : `Buy Any ${targetQuantity} & Save ${activeRule.percentageOff}% OFF`}
              </div>

              <h3 className="text-xl sm:text-2xl font-cormorant font-bold text-white tracking-wide">
                Unlock Special Festival Savings
              </h3>

              <p className="text-xs text-white/80 font-light">
                Add any {targetQuantity} items from this collection to your cart. The clubbing discount will apply instantly at checkout.
              </p>
            </div>

            {/* Live Progress Box */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-5 min-w-[280px] sm:min-w-[320px] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white/90">Your Bundle Progress</span>
                <span className="font-bold text-[#D7A65B]">
                  {currentCartCount} of {targetQuantity} items
                </span>
              </div>

              {/* Progress bar track */}
              <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 to-[#D7A65B] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                {isUnlocked ? (
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <Check size={14} className="stroke-[3]" />
                    <span>Bundle Deal Unlocked in Cart!</span>
                  </div>
                ) : (
                  <span className="text-white/80">
                    Add <strong className="text-amber-200">{remaining} more</strong> item{remaining > 1 ? 's' : ''} to activate deal
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Qualifying Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
          {eligibleProducts.map((product) => {
            const rawImages = Array.isArray(product.images) ? product.images : []
            const firstImg = rawImages.length > 0
              ? typeof rawImages[0] === 'string'
                ? rawImages[0]
                : rawImages[0]?.src
              : '/placeholder.png'

            const basePrice = Number(product.basePrice ?? product.regular_price ?? product.price ?? 0)
            const salePrice = product.salePrice ? Number(product.salePrice) : null
            const displayPrice = salePrice || basePrice
            const cardQty = quantities[product.id] || 1

            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between bg-white border border-stone-200/90 rounded-none p-3 sm:p-4 hover:shadow-xl hover:border-[#6B1024]/40 transition-all duration-300"
              >
                <div className="space-y-3">
                  {/* Badge */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#6B1024] bg-[#6B1024]/5 px-2 py-0.5 border border-[#6B1024]/15">
                      <Sparkles size={10} className="text-[#D7A65B]" />
                      Clubbing Item
                    </span>
                    {salePrice && basePrice > salePrice && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs">
                        SAVE ₹{Math.round(basePrice - salePrice)}
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <Link
                    href={`/products/${product.slug || product.id}`}
                    className="relative aspect-square w-full block overflow-hidden bg-stone-50"
                  >
                    <Image
                      src={firstImg}
                      alt={product.title || product.name || 'Incense Product'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>

                  {/* Title and details */}
                  <div className="space-y-1">
                    <Link
                      href={`/products/${product.slug || product.id}`}
                      className="block font-cormorant text-base sm:text-lg font-bold text-[#6B1024] hover:underline line-clamp-1"
                    >
                      {product.title || product.name}
                    </Link>
                    <p className="text-[10px] text-stone-500 line-clamp-2 h-7 font-light">
                      {product.shortDescription || product.description || 'Authentic pure botanical fragrance.'}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="font-cormorant font-bold text-[#6B1024] text-base sm:text-lg">
                        ₹{displayPrice.toFixed(0)}
                      </span>
                      {salePrice && basePrice > salePrice && (
                        <span className="text-xs text-stone-400 line-through">
                          ₹{basePrice.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add to Bundle Controls */}
                <div className="pt-3 mt-3 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-center border border-stone-200 bg-stone-50/70 h-8 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => updateCardQty(product.id, -1)}
                      className="p-1 hover:bg-stone-200 text-stone-600 transition"
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
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <Button
                    onClick={(e) => handleAddBundleItem(e, product)}
                    className="w-full bg-[#6B1024] hover:bg-[#4D0013] text-white py-2 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 h-9 rounded-none transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Add to Bundle
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Products in Bundle CTA */}
        <div className="mt-12 text-center">
          <Button
            asChild
            variant="outline"
            className="border-[#6B1024] text-[#6B1024] hover:bg-[#6B1024] hover:text-white uppercase tracking-widest text-xs px-8 py-5 rounded-none font-bold transition-colors"
          >
            <Link href="/products" className="inline-flex items-center gap-2">
              <span>EXPLORE ALL QUALIFYING PRODUCTS</span>
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
