'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Mail, Truck, ChevronRight, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function Confirmation() {
  const params = useSearchParams()
  const orderId = params.get('orderId') || params.get('order_id') || params.get('order')
  let key = params.get('key')
  // If key not in URL, look up from sessionStorage (set during checkout)
  if (!key && orderId && typeof window !== 'undefined') {
    try { key = sessionStorage.getItem(`sd_order_${orderId}`) || '' } catch {}
  }
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!orderId) { setLoading(false); setErrorMsg('Order id missing'); return }
    if (!key) { setLoading(false); setErrorMsg('Order key missing — cannot fetch order securely.'); return }
    fetch(`/api/orders/${orderId}?key=${encodeURIComponent(key)}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setErrorMsg(d.error || 'Could not load order'); setLoading(false); return }
        setOrder(d); setLoading(false)
      })
      .catch(() => { setErrorMsg('Network error'); setLoading(false) })
  }, [orderId, key])

  useEffect(() => {
    if (!order || !order.line_items || order.line_items.length === 0) return
    const productIds = [...new Set(order.line_items.map(li => li.product_id))]
    fetch(`/api/products?include=${productIds.join(',')}&limit=100`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data)
      })
      .catch(console.error)
  }, [order])

  return (
    <main className="bg-transparent min-h-screen relative overflow-hidden z-10">
      <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
      <Header />
      <div className="py-16 relative">
        <div className="container max-w-3xl text-center text-midnight">
          <h1 className="font-display text-4xl md:text-6xl mb-8 text-maroon-500">Your Order is Confirmed</h1>

          {loading ? <Skeleton className="h-40 max-w-lg mx-auto bg-stone-100" /> :
            order ? (
              <div className="bg-white text-midnight rounded-2xl p-6 md:p-8 max-w-lg mx-auto text-left shadow-md border border-stone-200">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Order Number</p>
                    <p className="font-display text-2xl text-saffron-600">#{order.number}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-right">Status</p>
                    <p className="font-display text-base text-emerald-600 capitalize">{order.status}</p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="py-4 space-y-3">
                  {(order.line_items || []).map(it => {
                    const match = products.find(p => p.id === it.product_id)
                    const itemRegular = it.regular_price !== undefined ? parseFloat(it.regular_price) : (match ? (parseFloat(match.regular_price) || parseFloat(match.price) || 0) : parseFloat(it.price))
                    const hasDiscount = itemRegular > parseFloat(it.price)
                    return (
                      <div key={it.id} className="flex gap-3 text-sm border-b border-stone-50 pb-2 last:border-0 last:pb-0">
                        <div className="relative w-12 h-12 rounded bg-stone-50 overflow-hidden flex-shrink-0 border border-stone-150">
                          {it.image?.src && <Image src={it.image.src} alt={it.name} fill className="object-cover" unoptimized />}
                        </div>
                        <div className="flex-1">
                          <p className="line-clamp-1 font-medium text-stone-800">{it.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-xs text-stone-500">Qty {it.quantity} · ₹{parseFloat(it.price).toFixed(0)}</span>
                            {hasDiscount && (
                              <span className="text-[10px] text-stone-400 line-through">₹{itemRegular.toFixed(0)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1.5 justify-end">
                            {hasDiscount && (
                              <span className="text-xs text-stone-400 line-through">₹{(itemRegular * it.quantity).toFixed(0)}</span>
                            )}
                            <p className="font-bold text-[#6B1024]">₹{Number(it.total || it.subtotal || 0).toFixed(0)}</p>
                          </div>
                          {hasDiscount && (
                            <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded-sm self-end mt-0.5">
                              Save ₹{((itemRegular - parseFloat(it.price)) * it.quantity).toFixed(0)} ({Math.round(((itemRegular - parseFloat(it.price)) / itemRegular) * 100)}%)
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {(() => {
                  const totalRegular = (order.line_items || []).reduce((s, it) => {
                    const match = products.find(p => p.id === it.product_id)
                    const regPrice = it.regular_price !== undefined ? parseFloat(it.regular_price) : (match ? (parseFloat(match.regular_price) || parseFloat(match.price) || 0) : parseFloat(it.price))
                    return s + regPrice * it.quantity
                  }, 0)
                  const couponDiscount = Number(order.discount_total || 0)
                  const totalSaved = totalRegular - Number(order.subtotal)
                  const totalSavings = totalSaved + couponDiscount
                  return (
                    <>
                      <div className="border-t border-stone-200 mt-2 pt-4 space-y-2 text-sm text-stone-600">
                        <div className="flex justify-between">
                          <span>Subtotal (MRP)</span>
                          <span className="text-stone-850 font-medium">₹{totalRegular.toFixed(0)}</span>
                        </div>
                        {totalSaved > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Product Discount</span>
                            <span>-₹{totalSaved.toFixed(0)}</span>
                          </div>
                        )}
                        {couponDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Coupon Discount {order.coupon_lines?.[0]?.code ? `(${order.coupon_lines[0].code.toUpperCase()})` : ''}</span>
                            <span>-₹{couponDiscount.toFixed(0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span className="text-stone-855">{Number(order.shipping_total) === 0 ? 'Free delivery' : `₹${Number(order.shipping_total).toFixed(0)}`}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-stone-200 mt-2 text-maroon-500 font-bold">
                          <span className="font-display text-lg">Total</span>
                          <span className="font-display text-2xl text-saffron-600">₹{Number(order.total).toFixed(0)}</span>
                        </div>
                      </div>
                      {totalSavings > 0 && (
                        <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2.5 px-3 rounded-lg text-center mt-3 border border-emerald-100/60">
                          Congratulations! You saved ₹{totalSavings.toFixed(0)} ({Math.round((totalSavings / totalRegular) * 100)}%) on this order!
                        </div>
                      )}
                    </>
                  )
                })()}
                <div className="border-t border-stone-200 mt-4 pt-4 text-sm">
                  <p className="text-muted-foreground">Delivery to:</p>
                  <p className="font-medium">{order.billing?.first_name} {order.billing?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{order.billing?.address_1}, {order.billing?.city}, {order.billing?.state} - {order.billing?.postcode}</p>
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200">
                  <Mail className="w-4 h-4 text-saffron-600" />
                  <p className="text-xs">Confirmation email sent to <strong>{order.billing?.email}</strong></p>
                </div>
                <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-emerald-50">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs">we will start processing your order soon and we will update</p>
                </div>
              </div>
            ) : (
              <div className="bg-white text-midnight rounded-2xl p-8 max-w-md mx-auto border border-stone-200 shadow-sm">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-600 mb-3" />
                <p className="font-display text-lg mb-2">Order details unavailable</p>
                <p className="text-sm text-muted-foreground">{errorMsg || 'We could not load your order details, but your payment may have been received. Please check your email for the WooCommerce confirmation.'}</p>
              </div>
            )}

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-[#6B1024] hover:bg-[#4D0013] text-white font-semibold">
              <Link href="/products">Continue Shopping <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-stone-300 bg-white text-midnight hover:bg-stone-50">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Confirmation />
    </Suspense>
  )
}
export default App
