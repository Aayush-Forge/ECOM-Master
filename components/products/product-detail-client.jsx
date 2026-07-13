'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Minus, ShoppingBag, Leaf, Truck, Sparkles, Check, Star } from 'lucide-react'
import ProductCard from '@/components/products/product-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ProductDetailClient({ initialProduct }) {
  const { slug } = useParams()
  const router = useRouter()
  const { addItem } = useCart()
  const [product, setProduct] = useState(initialProduct)
  const [loading, setLoading] = useState(!initialProduct)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  // selected variation attributes: { 'Size': '108 beads', ... }
  const [selectedAttrs, setSelectedAttrs] = useState({})
  const [recommended, setRecommended] = useState([])

  // Reviews state and methods
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [newReview, setNewReview] = useState({ rating: 5, review: '', reviewer: '', reviewer_email: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  const fetchReviews = (productId) => {
    setReviewsLoading(true)
    fetch(`/api/products/reviews?product=${productId}`)
      .then(r => r.json())
      .then(data => {
        setReviews(Array.isArray(data) ? data : [])
        setReviewsLoading(false)
      })
      .catch(() => setReviewsLoading(false))
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!newReview.reviewer.trim() || !newReview.review.trim()) {
      toast.error('Please fill out all fields.')
      return
    }

    setSubmittingReview(true)
    try {
      const res = await fetch('/api/products/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          rating: newReview.rating,
          review: newReview.review,
          reviewer: newReview.reviewer
        })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit review.')
      } else {
        toast.success('Thank you! Your review has been submitted successfully.')
        setNewReview({ rating: 5, review: '', reviewer: '', reviewer_email: '' })
        fetchReviews(product.id)
      }
    } catch (err) {
      console.error(err)
      toast.error('Network error. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct)
      setLoading(false)
      fetchReviews(initialProduct.id)
    }
  }, [initialProduct])

  // History / preferences effect
  useEffect(() => {
    if (!product) return
    try {
      const viewedHistory = JSON.parse(localStorage.getItem('sd_viewed_history') || '[]')
      if (!viewedHistory.includes(product.id)) {
        viewedHistory.push(product.id)
        if (viewedHistory.length > 20) viewedHistory.shift()
        localStorage.setItem('sd_viewed_history', JSON.stringify(viewedHistory))
      }
      
      if (product.categories?.[0]?.id) {
        const prefCategories = JSON.parse(localStorage.getItem('sd_preferred_categories') || '{}')
        const catId = product.categories[0].id
        prefCategories[catId] = (prefCategories[catId] || 0) + 1
        localStorage.setItem('sd_preferred_categories', JSON.stringify(prefCategories))
      }
    } catch (e) {
      console.error('Failed to update product view history cache:', e)
    }
  }, [product])

  // Recommendations effect
  useEffect(() => {
    if (!product) return

    fetch('/api/products?limit=50')
      .then(r => r.json())
      .then(products => {
        if (!Array.isArray(products)) return
        
        // Filter out current product
        const pool = products.filter(p => p.id !== product.id)
        
        // Read categories preference cache
        let prefCategories = {}
        try {
          prefCategories = JSON.parse(localStorage.getItem('sd_preferred_categories') || '{}')
        } catch {}

        const scored = pool.map(p => {
          let score = 0
          
          // Match current product category
          const currentCatId = product.categories?.[0]?.id
          if (currentCatId && p.categories?.some(cat => cat.id === currentCatId)) {
            score += 5
          }
          
          // Match preferred categories from history
          if (p.categories) {
            for (const cat of p.categories) {
              if (prefCategories[cat.id]) {
                score += prefCategories[cat.id] * 2
              }
            }
          }
          
          // Add small random noise for variety
          score += Math.random() * 2
          
          return { product: p, score }
        })

        // Sort descending and slice top 4
        scored.sort((a, b) => b.score - a.score)
        setRecommended(scored.slice(0, 4).map(item => item.product))
      })
      .catch(console.error)
  }, [product])

  const isVariable = product?.type === 'variable'

  // Variation attributes shown to user (only those flagged variation: true)
  const variationAttrs = useMemo(() => (product?.attributes || []).filter(a => a.variation), [product])

  // Find matching variation given current selectedAttrs
  const matchedVariation = useMemo(() => {
    if (!isVariable || !product?.variationsData?.length) return null
    return product.variationsData.find(v => {
      return variationAttrs.every(va => {
        const sel = selectedAttrs[va.name]
        const va_match = v.attributes.find(x => x.name === va.name)
        if (!va_match || !va_match.option) return true // "any"
        return va_match.option === sel
      })
    }) || null
  }, [isVariable, product, variationAttrs, selectedAttrs])

  const features = useMemo(() => {
    if (!product?.acf) return []
    const list = []
    for (const key of Object.keys(product.acf)) {
      const match = key.match(/^feature_image_(\d+)$/)
      if (match) {
        const index = match[1]
        const imgObj = product.acf[key]
        const textKey = `feature_text_${index}`
        const textVal = product.acf[textKey]
        if (imgObj && imgObj.url) {
          list.push({
            img: imgObj.url,
            alt: imgObj.alt || '',
            text: textVal || ''
          })
        }
      }
    }
    return list
  }, [product])

  const allAttrsSelected = !isVariable || variationAttrs.every(va => selectedAttrs[va.name])

  const displayPrice = isVariable
    ? (matchedVariation ? parseFloat(matchedVariation.price) : (product ? parseFloat(product.price) : 0))
    : (product ? parseFloat(product.price) : 0)
  const displayRegular = isVariable
    ? (matchedVariation ? parseFloat(matchedVariation.regular_price) : (product ? parseFloat(product.regular_price) : 0))
    : (product ? parseFloat(product.regular_price) : 0)
  const onSale = displayRegular > displayPrice && displayPrice > 0

  const rating = parseFloat(product?.average_rating) || 0
  const ratingCount = parseInt(product?.rating_count) || 0

  const images = product?.images || []
  const variationImage = matchedVariation?.image?.src
  // If variation has its own image, prepend to gallery
  const gallery = variationImage
    ? [{ src: variationImage }, ...images.filter(i => i.src !== variationImage)]
    : images
  const mainImg = gallery[activeImg]?.src || gallery[0]?.src

  // Reset image when variation changes
  useEffect(() => { setActiveImg(0) }, [matchedVariation?.id])

  const stockStatus = isVariable
    ? (matchedVariation?.stock_status || product?.stock_status || 'instock')
    : (product?.stock_status || 'instock')
  const inStock = stockStatus === 'instock'

  const handleAdd = (buyNow = false) => {
    if (!product) return
    if (isVariable && !allAttrsSelected) {
      toast.error('Please select all options before adding to cart')
      return
    }
    if (isVariable && !matchedVariation) {
      toast.error('Selected combination is not available')
      return
    }
    const itemData = {
      product_id: product.id,
      variation_id: matchedVariation?.id,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      regular_price: displayRegular,
      image: mainImg,
      weight: parseFloat(matchedVariation?.weight || product?.weight) || 0,
      attrs: matchedVariation?.attributes || []
    }
    
    if (buyNow) {
      try { sessionStorage.setItem('sd_buynow_item', JSON.stringify({ ...itemData, quantity: qty })) } catch {}
      router.push('/checkout?buyNow=true')
    } else {
      addItem(itemData, qty)
      setAdded(true)
      toast.success(`Added ×${qty} "${product.name}"`)
      setTimeout(() => setAdded(false), 1800)
    }
  }

  if (loading) {
    return (
      <div className="container py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="py-32 container text-center">
        <p className="font-display text-2xl text-[#6B1024] font-bold">Product not found.</p>
        <Button asChild className="mt-4 bg-[#6B1024] hover:bg-[#4D0013] text-white">
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="py-10">
      <div className="container">
        <div className="text-xs text-muted-foreground mb-4">
          <Link href="/" className="hover:text-saffron-600">Home</Link> /
          <Link href="/products" className="hover:text-saffron-600"> Products</Link> /
          <span className="text-[#6B1024] font-bold"> {product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-stone-200">
              {mainImg && <Image src={mainImg} alt={product.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-opacity" unoptimized />}
              {product.featured && <Badge className="absolute top-4 left-4 bg-[#D7A65B] text-white font-bold">Featured</Badge>}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
                {gallery.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={cn(
                    'relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition',
                    activeImg === i ? 'border-[#6B1024]' : 'border-stone-200'
                  )}>
                    <Image src={img.src} alt="" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            <div>
              {product.categories?.[0] && (
                <Badge variant="outline" className="border-[#6B1024]/40 text-[#6B1024] font-bold">
                  {product.categories[0].name}
                </Badge>
              )}
              <h1 className="font-display text-3xl md:text-4xl text-[#6B1024] font-bold mt-3">{product.name}</h1>
              
              {/* Rating row */}
              <div className="flex items-center gap-2 mt-2 select-none">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, s) => {
                    const filled = s < Math.round(rating)
                    return (
                      <Star 
                        key={s} 
                        className={`w-3.5 h-3.5 ${filled ? 'fill-[#D7A65B] text-[#D7A65B]' : 'text-stone-300'}`} 
                      />
                    )
                  })}
                </div>
                <span className="text-xs text-[#6B1024]/60 font-light">
                  {ratingCount > 0 ? `${rating.toFixed(1)} (${ratingCount} ${ratingCount === 1 ? 'review' : 'reviews'})` : 'No reviews yet'}
                </span>
              </div>

              {product.short_description && (
                <div
                  className="text-base text-muted-foreground italic mt-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.short_description }}
                />
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display text-4xl text-[#6B1024] font-bold">₹{displayPrice.toFixed(0)}</span>
              {onSale && (
                <>
                  <span className="text-lg text-muted-foreground line-through">₹{displayRegular.toFixed(0)}</span>
                  <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-sm">
                    Save ₹{(displayRegular - displayPrice).toFixed(0)} ({Math.round(((displayRegular - displayPrice) / displayRegular) * 100)}%)
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {inStock
                ? <Badge className="bg-emerald-600 text-white"><Check className="w-3 h-3 mr-1" /> In Stock</Badge>
                : <Badge className="bg-destructive text-white">Out of Stock</Badge>}
              <Badge className="bg-stone-50 text-[#D7A65B] border border-stone-200 font-bold">Vedic Sourced</Badge>
              {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
            </div>

            {/* Variation selectors */}
            {isVariable && variationAttrs.map(attr => (
              <div key={attr.id} className="pt-2">
                <p className="text-sm font-semibold text-midnight mb-2">
                  {attr.name}: <span className="font-normal text-muted-foreground">{selectedAttrs[attr.name] || 'Select'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {attr.options.map(opt => {
                    const selected = selectedAttrs[attr.name] === opt
                    const possible = product.variationsData?.some(v => {
                      const a = v.attributes.find(x => x.name === attr.name)
                      if (a?.option && a.option !== opt) return false
                      if (v.stock_status === 'outofstock') return false
                      return Object.entries(selectedAttrs).every(([n, val]) => {
                        if (n === attr.name) return true
                        const x = v.attributes.find(p => p.name === n)
                        if (!x?.option) return true
                        return x.option === val
                      })
                    }) ?? true
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedAttrs(p => ({ ...p, [attr.name]: opt }))}
                        disabled={!possible}
                        className={cn(
                          'px-4 py-2 rounded-full border text-sm transition',
                          selected
                            ? 'bg-[#6B1024] border-[#6B1024] text-white shadow'
                            : possible
                              ? 'bg-stone-50 border-stone-200 hover:border-[#6B1024] text-[#6B1024]'
                              : 'bg-stone-100 border-stone-200 text-muted-foreground line-through cursor-not-allowed opacity-60'
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Quantity + CTAs */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border border-stone-200 rounded-full bg-stone-50">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-3 hover:bg-stone-100 rounded-l-full"><Minus className="w-4 h-4" /></button>
                <span className="px-4 font-bold">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="p-3 hover:bg-stone-100 rounded-r-full"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleAdd(false)} disabled={added || !inStock || (isVariable && !matchedVariation)}
                className="bg-[#6B1024] hover:bg-[#4D0013] text-white font-bold py-6 text-base shadow-lg shadow-stone-100">
                {added ? <><Check className="w-4 h-4 mr-2" /> Added</> : <><ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart</>}
              </Button>
              <Button onClick={() => handleAdd(true)} variant="outline" disabled={!inStock || (isVariable && !matchedVariation)}
                className="border-[#D7A65B] text-[#6B1024] hover:bg-stone-100 font-bold py-6 text-base bg-white">
                Buy Now — ₹{(displayPrice * qty).toFixed(0)}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4">
              {[
                { i: Sparkles, t: 'Pure & Sacred' },
                { i: Truck, t: 'Pan-India Ship' },
                { i: Leaf, t: '100% Authentic' }
              ].map(({ i: Icon, t }, k) => (
                <div key={k} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-stone-200 bg-white">
                  <Icon className="w-5 h-5 text-[#6B1024]" />
                  <span className="text-xs text-[#6B1024]/75 text-center font-bold">{t}</span>
                </div>
              ))}
            </div>

            <Accordion type="single" collapsible defaultValue="desc" className="pt-3">
              <AccordionItem value="desc" className="border-stone-200">
                <AccordionTrigger className="font-display text-[#6B1024] font-bold">Full Description</AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none text-[#6B1024]/85" dangerouslySetInnerHTML={{ __html: product.description || product.short_description || '' }} />
                  
                  {/* ACF Features placed vertically below full description */}
                  {features.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-cream-400/40 space-y-8">
                      {features.map((feat, idx) => (
                        <div key={idx} className="space-y-4">
                          <img
                            src={feat.img}
                            alt={feat.alt || feat.text}
                            className="w-full h-auto rounded-2xl border border-stone-200 shadow-sm"
                          />
                          {feat.text && (
                            <p className="text-base font-display text-maroon-500 font-semibold leading-relaxed">
                              {feat.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ship" className="border-stone-200">
                <AccordionTrigger className="font-display text-[#6B1024] font-bold">Shipping &amp; Returns</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-foreground/80">
                  Carefully packaged in temple-grade material to maintain ritual purity. Please refer to our{' '}
                  <Link href="/shipping-policy" className="text-[#D7A65B] hover:underline font-semibold">
                    Shipping Policy
                  </Link>{' '}
                  for details.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="reviews" className="border-stone-200">
                <AccordionTrigger className="font-display text-[#6B1024] font-bold">Customer Reviews ({reviews.length})</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-2">
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {reviewsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full bg-stone-50" />
                          <Skeleton className="h-20 w-full bg-stone-50" />
                        </div>
                      ) : reviews.length === 0 ? (
                        <p className="text-sm text-stone-500 italic py-2">No reviews yet. Be the first to share your experience!</p>
                      ) : (
                        reviews.map((rev) => (
                          <div key={rev.id} className="p-4 border border-stone-200 bg-stone-50/30 rounded-xl space-y-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-[#6B1024]">{rev.reviewer}</span>
                              <span className="text-[10px] text-stone-500">{new Date(rev.date_created).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                            </div>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, s) => {
                                const filled = s < rev.rating
                                return (
                                  <Star 
                                    key={s} 
                                    className={`w-3.5 h-3.5 ${filled ? 'fill-[#D7A65B] text-[#D7A65B]' : 'text-stone-300'}`} 
                                  />
                                )
                              })}
                            </div>
                            <p className="text-xs text-stone-700 leading-relaxed font-light" dangerouslySetInnerHTML={{ __html: rev.review }} />
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-stone-200 pt-6 space-y-4 text-left">
                      <h4 className="font-display text-base text-[#6B1024] font-bold">Share Your Experience</h4>
                      <form onSubmit={handleReviewSubmit} className="space-y-3.5">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-stone-700">Rating *</Label>
                          <div className="flex gap-1.5 items-center">
                            {[1, 2, 3, 4, 5].map((stars) => {
                              const active = newReview.rating >= stars
                              return (
                                <button
                                  key={stars}
                                  type="button"
                                  onClick={() => setNewReview(prev => ({ ...prev, rating: stars }))}
                                  className="focus:outline-none transition transform hover:scale-110"
                                  aria-label={`Rate ${stars} stars`}
                                >
                                  <Star className={`w-6 h-6 ${active ? 'fill-[#D7A65B] text-[#D7A65B]' : 'text-stone-300'}`} />
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="reviewer_name" className="text-xs font-semibold text-stone-700">Your Name *</Label>
                          <Input 
                            id="reviewer_name"
                            value={newReview.reviewer}
                            onChange={(e) => setNewReview(prev => ({ ...prev, reviewer: e.target.value }))}
                            placeholder="e.g. Meera"
                            required
                            className="bg-stone-50 border-stone-200 focus-visible:ring-saffron-500 h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="reviewer_comment" className="text-xs font-semibold text-stone-700">Review *</Label>
                          <Textarea 
                            id="reviewer_comment"
                            value={newReview.review}
                            onChange={(e) => setNewReview(prev => ({ ...prev, review: e.target.value }))}
                            placeholder="Write your feedback..."
                            required
                            rows={3}
                            className="bg-stone-50 border-stone-200 focus-visible:ring-saffron-500 text-xs"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={submittingReview}
                          className="bg-[#6B1024] hover:bg-[#4D0013] text-white px-5 py-2.5 font-bold uppercase tracking-wider text-[10px] rounded-none transition"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                      </form>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {product.related?.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl md:text-3xl text-maroon-500 mb-2">You may also need</h2>
            <p className="text-sm text-muted-foreground mb-6 italic">Complete your sacred ritual with these complementary items</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.related.slice(0, 4).map(r => <ProductCard key={r.id} product={r} compact />)}
            </div>
          </section>
        )}

        {recommended.length > 0 && (
          <section className="mt-16 border-t border-stone-100 pt-16">
            <h2 className="font-display text-2xl md:text-3xl text-maroon-500 mb-2">You May Also Love</h2>
            <p className="text-sm text-muted-foreground mb-6 italic">Recommended based on your preferences and viewed items</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommended.map(r => <ProductCard key={r.id} product={r} compact />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
