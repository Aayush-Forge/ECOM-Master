'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ClubbingShowcaseSection({ clubbingRules = [], allProducts = [] }) {
  const { addItem, openDrawer } = useCart()
  const [activeRuleIndex, setActiveRuleIndex] = useState(0)
  const [quantities, setQuantities] = useState({})
  const [addingId, setAddingId] = useState(null)
  const [addingAll, setAddingAll] = useState(false)

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
    eligibleProducts = allProducts.slice(0, 3).map((prod) => {
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

  const bundleOriginalTotal = eligibleProducts.reduce((sum, item) => sum + (Number(item.originalPrice) || 0), 0)
  const bundleClubbingTotal = eligibleProducts.reduce((sum, item) => sum + (Number(item.clubbingPrice) || 0), 0)
  const bundleSavings = bundleOriginalTotal - bundleClubbingTotal
  const bundleDiscountPercent = bundleOriginalTotal > 0 ? Math.round((bundleSavings / bundleOriginalTotal) * 100) : 0

  const handleAddIndividualItem = async (e, product) => {
    e.preventDefault()
    e.stopPropagation()

    const qty = quantities[product.id] || 1
    setAddingId(product.id)
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

      toast.success(`Added ×${qty} "${product.title}" to cart at clubbing price ₹${product.clubbingPrice}!`)
      openDrawer()
      setQuantities((prev) => ({ ...prev, [product.id]: 1 }))
    } catch (err) {
      console.error('Failed to add bundle item:', err)
      toast.error('Failed to add item to cart')
    } finally {
      setAddingId(null)
    }
  }

  // One-Click Buy Entire Bundle Together
  const handleBuyEntireBundleTogether = async () => {
    if (eligibleProducts.length === 0) return
    setAddingAll(true)

    try {
      for (const product of eligibleProducts) {
        const qty = quantities[product.id] || 1
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
      }

      toast.success(`Added entire ${activeRule.name} bundle (${eligibleProducts.length} items) to your cart!`)
      openDrawer()
    } catch (err) {
      console.error('Failed to add complete bundle:', err)
      toast.error('Failed to add complete bundle to cart')
    } finally {
      setAddingAll(false)
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
    <section id="festival-clubbing-deals" className="py-16 md:py-24 bg-gradient-to-b from-stone-50/50 via-white to-stone-50/50 border-t border-stone-200/80 relative z-10 overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6B1024]/10 border border-[#6B1024]/20 text-[#6B1024] text-xs font-semibold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#D7A65B]" />
            <span>{activeRule.tagline || 'FESTIVE CLUBBING SPECIAL'}</span>
          </div>

          <h2 className="font-cormorant text-3xl sm:text-4xl md:text-5xl text-[#6B1024] tracking-wide uppercase font-light leading-tight">
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
                  'px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer',
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

        {/* Curated Bundle Banner with One-Click Buy All Action */}
        <div className="bg-[#FFF9EE] border-2 border-[#D7A65B] p-6 sm:p-8 mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xs">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-[#6B1024] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles size={11} className="text-[#D7A65B]" />
              <span>Curated Festive Bundle • {eligibleProducts.length} Harmonies Together</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-cormorant font-bold text-[#6B1024] tracking-wide">
              Experience The Complete {activeRule.eventName || activeRule.name} Set
            </h3>

            <p className="text-xs text-stone-600 font-light leading-relaxed">
              Curated together for your auspicious rituals. Buy all {eligibleProducts.length} items as a unified celebratory set at an exclusive bundled price.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 border border-stone-200 shrink-0">
            <div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">Bundle Price</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-cormorant text-2xl sm:text-3xl font-bold text-[#6B1024]">
                  ₹{bundleClubbingTotal}
                </span>
                {bundleOriginalTotal > bundleClubbingTotal && (
                  <span className="text-xs text-stone-400 line-through">
                    ₹{bundleOriginalTotal}
                  </span>
                )}
              </div>
              {bundleSavings > 0 && (
                <div className="text-[10px] font-bold text-emerald-700">
                  Save ₹{bundleSavings} ({bundleDiscountPercent}% OFF)
                </div>
              )}
            </div>

            <Button
              onClick={handleBuyEntireBundleTogether}
              disabled={addingAll}
              className="bg-[#6B1024] hover:bg-[#4D0013] text-white border border-[#6B1024] rounded-none px-5 py-4 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 h-auto transition-colors shadow-xs"
            >
              <ShoppingBag className="w-4 h-4 text-[#D7A65B]" />
              <span>{addingAll ? 'Adding Bundle...' : `Buy All ${eligibleProducts.length} Together`}</span>
            </Button>
          </div>
        </div>

        {/* Products Grid - Exact Clean HomeProductCard Presentation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {eligibleProducts.map((product) => {
            const cardQty = quantities[product.id] || 1
            const hasDiscount = product.originalPrice > product.clubbingPrice

            return (
              <div
                key={product.id}
                className="group bg-white border border-stone-200 p-4 sm:p-5 flex flex-col justify-between shadow-sm relative transition-all duration-500 hover:border-[#D7A65B]/40 hover:shadow-md hover:bg-stone-50/20 rounded-sm overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Product Image Frame */}
                  <div className="aspect-square w-full relative overflow-hidden bg-stone-50 border border-stone-150 rounded-sm group/img">
                    <Link href={`/products/${product.slug || product.id}`}>
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
                        className="object-cover opacity-95 transition-transform duration-700 ease-out group-hover:scale-105"
                        unoptimized={product.image.startsWith('http')}
                      />
                    </Link>

                    {/* Badge */}
                    <div className="absolute top-2 left-2 z-20">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#6B1024] bg-white/95 backdrop-blur-sm px-2 py-0.5 border border-stone-200 shadow-xs">
                        <Sparkles size={10} className="text-[#D7A65B]" />
                        {product.category}
                      </span>
                    </div>

                    {hasDiscount && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-[#6B1024] px-2 py-0.5 uppercase tracking-wider shadow-xs z-20">
                        {product.discountPercentage}% OFF
                      </span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="space-y-1 text-left">
                    <h4 className="font-cormorant text-lg sm:text-xl text-[#6B1024] font-bold leading-snug tracking-wide line-clamp-1">
                      <Link href={`/products/${product.slug || product.id}`} className="hover:underline">
                        {product.title}
                      </Link>
                    </h4>
                    <p className="text-[11px] text-[#6B1024]/75 line-clamp-2 h-8 font-light leading-relaxed">
                      {product.shortDescription}
                    </p>

                    {/* Pricing */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-xl font-cormorant font-bold text-[#6B1024]">
                        ₹{product.clubbingPrice}
                      </span>
                      {hasDiscount && (
                        <>
                          <span className="text-xs text-[#6B1024]/50 line-through">
                            ₹{product.originalPrice}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-100">
                            Save ₹{product.originalPrice - product.clubbingPrice}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions panel */}
                <div className="pt-4 mt-4 border-t border-stone-100 z-20 relative">
                  <div className="flex flex-col gap-2">
                    {/* Quantity Selector Row */}
                    <div className="flex items-center justify-center border border-stone-200 rounded-sm bg-stone-50/55 py-1.5 px-3 h-10 gap-2 w-full">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCardQty(product.id, -1)}
                          className="p-1 hover:bg-stone-200 rounded-full text-stone-600 transition"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold min-w-[20px] text-center text-stone-900 text-xs sm:text-sm">
                          {cardQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCardQty(product.id, 1)}
                          className="p-1 hover:bg-stone-200 rounded-full text-stone-600 transition"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <Button
                      onClick={(e) => handleAddIndividualItem(e, product)}
                      disabled={addingId === product.id}
                      className="w-full bg-[#6B1024] hover:bg-[#4D0013] text-white border border-[#6B1024] px-2 py-3.5 sm:py-4 rounded-none font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5 h-10 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>{addingId === product.id ? 'Adding...' : 'Add Individual Item'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* View Full Festive Page Link */}
        <div className="mt-12 text-center">
          <Button
            asChild
            variant="outline"
            className="border-[#6B1024] text-[#6B1024] hover:bg-[#6B1024] hover:text-white uppercase tracking-widest text-xs px-8 py-5 rounded-none font-bold transition-colors"
          >
            <Link href="/clubbing" className="inline-flex items-center gap-2">
              <span>EXPLORE ALL FESTIVE CLUBBINGS</span>
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
