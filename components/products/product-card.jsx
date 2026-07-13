'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Minus, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ProductCard({ product, compact = false }) {
  const { addItem } = useCart()
  const [cardQty, setCardQty] = useState(1)
  const img = product.images?.[0]?.src
  const inStock = product.stock_status === 'instock' || product.stock_status === undefined
  const isVariable = product.type === 'variable'

  const onAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isVariable) {
      // Send user to product page to choose variation
      window.location.href = `/products/${product.slug}`
      return
    }
    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: parseFloat(product.price) || 0,
      regular_price: parseFloat(product.regular_price) || parseFloat(product.price) || 0,
      image: img,
      weight: parseFloat(product.weight) || 0,
      attrs: []
    }, cardQty)
    toast.success(`Added ×${cardQty} "${product.name}" to cart`)
  }

  const price = parseFloat(product.price) || 0
  const regular = parseFloat(product.regular_price) || 0
  const onSale = product.on_sale && regular > price
  const rating = parseFloat(product.average_rating) || 0
  const ratingCount = parseInt(product.rating_count) || 0

  return (
    <Link href={`/products/${product.slug}`} className={cn(
      'group flex flex-col h-full bg-white rounded-sm overflow-hidden border border-stone-200 transition-all duration-300 w-full',
      'hover:shadow-xl hover:shadow-stone-200/50 hover:border-stone-400 hover:-translate-y-1'
    )}>
      <div className="relative aspect-square bg-stone-50 overflow-hidden rounded-sm flex-shrink-0">
        {img && (
          <Image src={img} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110" unoptimized />
        )}
        {product.featured && (
          <Badge className="absolute top-2 left-2 bg-gold-400 text-midnight border-none">Featured</Badge>
        )}
        {!inStock && (
          <Badge className="absolute top-2 right-2 bg-destructive">Out of Stock</Badge>
        )}
        {onSale && inStock && (
          <Badge className="absolute top-2 right-2 bg-saffron-500 text-white">Sale</Badge>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm text-[#6B1024] line-clamp-2 min-h-[40px] flex items-center">{product.name}</h3>
          
          {/* Rating row */}
          <div className="flex items-center gap-1 sm:gap-1.5 pt-0.5 pb-1">
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
          
          <p className="text-[11px] text-[#6B1024]/75 line-clamp-2 mt-1 font-light leading-relaxed">
            {product.short_description?.replace(/<[^>]*>/g, '') || 'Authentic pure botanical fragrance.'}
          </p>
        </div>

        {/* Pricing & Actions Row */}
        <div className="mt-auto pt-2 border-t border-stone-100 space-y-3">
          {/* Price Block */}
          <div className="flex items-baseline justify-between flex-wrap gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg text-saffron-600 font-bold">₹{price.toFixed(0)}</span>
              {onSale && (
                <span className="text-xs text-muted-foreground line-through">₹{regular.toFixed(0)}</span>
              )}
            </div>
            {onSale && (
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                Save ₹{(regular - price).toFixed(0)} ({Math.round(((regular - price) / regular) * 100)}%)
              </span>
            )}
          </div>

          {/* Action Buttons Block */}
          <div className="flex items-center gap-2 z-20 relative w-full">
            {/* Quantity Selector */}
            {!isVariable && inStock && (
              <div className="flex items-center justify-between border border-stone-200 rounded-sm bg-stone-50 h-9 px-2 gap-2 flex-grow">
                <button 
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    setCardQty(q => Math.max(1, q - 1)) 
                  }} 
                  className="p-1 hover:bg-stone-200 rounded-full text-stone-600 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-center text-midnight text-xs sm:text-sm">{cardQty}</span>
                <button 
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    setCardQty(q => q + 1) 
                  }} 
                  className="p-1 hover:bg-stone-200 rounded-full text-stone-600 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onAdd}
              className={cn(
                "h-9 px-3 rounded-sm bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-xs uppercase tracking-wider transition-all hover:scale-102 flex items-center justify-center gap-1.5",
                isVariable || !inStock ? "w-full" : "flex-grow-[2]"
              )}
              aria-label={isVariable ? 'View options' : 'Add to cart'}
              disabled={!inStock}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{isVariable ? 'Select' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
