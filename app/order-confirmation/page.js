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
import { getOrderById } from '@/lib/api/orders'

function Confirmation() {
  const params = useSearchParams()
  const orderId = params.get('orderId') || params.get('order_id') || params.get('order')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setErrorMsg('Order ID missing')
      return
    }

    getOrderById(orderId)
      .then((data) => {
        if (!data) {
          setErrorMsg('Order not found')
        } else {
          setOrder(data)
        }
      })
      .catch((err) => {
        console.error(err)
        setErrorMsg(err.message || 'Could not load order details')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [orderId])

  return (
    <main className="bg-transparent min-h-screen relative overflow-hidden z-10">
      <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
      <Header />
      <div className="py-16 relative">
        <div className="container max-w-3xl text-center text-midnight">
          <h1 className="font-display text-4xl md:text-6xl mb-8 text-maroon-500">Your Order is Confirmed</h1>

          {loading ? (
            <Skeleton className="h-60 max-w-lg mx-auto bg-stone-100 rounded-2xl" />
          ) : order ? (
            <div className="bg-white text-midnight rounded-2xl p-6 md:p-8 max-w-lg mx-auto text-left shadow-md border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Order Number</p>
                  <p className="font-display text-2xl text-saffron-600">#{order.orderNumber || order.id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground text-right">Status</p>
                  <p className="font-display text-base text-emerald-600 capitalize">{order.status?.replace('_', ' ')}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>

              <div className="py-4 space-y-3">
                {(order.items || []).map((it) => {
                  const unitPrice = Number(it.unitPrice ?? it.price ?? 0)
                  const regularPrice = Number(it.regular_price ?? unitPrice)
                  const hasDiscount = regularPrice > unitPrice
                  const lineTotal = Number(it.lineTotal ?? it.total ?? unitPrice * it.quantity)
                  const imgUrl = it.imageUrl || it.image?.src

                  return (
                    <div key={it.id || it.productId} className="flex gap-3 text-sm border-b border-stone-50 pb-2 last:border-0 last:pb-0">
                      <div className="relative w-12 h-12 rounded bg-stone-50 overflow-hidden flex-shrink-0 border border-stone-150">
                        {imgUrl && (
                          <Image src={imgUrl} alt={it.title || it.name} fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="line-clamp-1 font-medium text-stone-800">{it.title || it.name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-xs text-stone-500">Qty {it.quantity} · ₹{unitPrice.toFixed(0)}</span>
                          {hasDiscount && (
                            <span className="text-[10px] text-stone-400 line-through">₹{regularPrice.toFixed(0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1.5 justify-end">
                          {hasDiscount && (
                            <span className="text-xs text-stone-400 line-through">₹{(regularPrice * it.quantity).toFixed(0)}</span>
                          )}
                          <p className="font-bold text-[#6B1024]">₹{lineTotal.toFixed(0)}</p>
                        </div>
                        {hasDiscount && (
                          <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded-sm self-end mt-0.5">
                            Save ₹{((regularPrice - unitPrice) * it.quantity).toFixed(0)} ({Math.round(((regularPrice - unitPrice) / regularPrice) * 100)}%)
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {(() => {
                const subtotal = Number(order.subtotal ?? 0)
                const discountTotal = Number(order.discountTotal ?? order.discount ?? 0)
                const shippingTotal = Number(order.shippingTotal ?? order.shipping ?? 0)
                const grandTotal = Number(order.grandTotal ?? order.total ?? subtotal - discountTotal + shippingTotal)

                return (
                  <div className="border-t border-stone-200 mt-2 pt-4 space-y-2 text-sm text-stone-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-stone-800 font-medium">₹{subtotal.toFixed(0)}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discounts &amp; Clubbing Savings</span>
                        <span>-₹{discountTotal.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-stone-800">{shippingTotal === 0 ? 'Free delivery' : `₹${shippingTotal.toFixed(0)}`}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-stone-200 mt-2 text-maroon-500 font-bold">
                      <span className="font-display text-lg">Total Paid</span>
                      <span className="font-display text-2xl text-saffron-600">₹{grandTotal.toFixed(0)}</span>
                    </div>
                  </div>
                )
              })()}

              {order.shippingAddress && (
                <div className="border-t border-stone-200 mt-4 pt-4 text-sm">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Delivery Address:</p>
                  <p className="font-medium text-stone-800">{order.shippingAddress.name}</p>
                  <p className="text-sm text-stone-600">
                    {order.shippingAddress.line1}
                    {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                  {order.shippingAddress.phone && (
                    <p className="text-xs text-stone-500 mt-0.5">Phone: {order.shippingAddress.phone}</p>
                  )}
                </div>
              )}

              {order.customer?.email && (
                <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200">
                  <Mail className="w-4 h-4 text-saffron-600" />
                  <p className="text-xs text-stone-700">Confirmation email sent to <strong>{order.customer.email}</strong></p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-emerald-50">
                <Truck className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-800">We will start processing your order soon and notify you upon dispatch.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white text-midnight rounded-2xl p-8 max-w-md mx-auto border border-stone-200 shadow-sm">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-600 mb-3" />
              <p className="font-display text-lg mb-2">Order details unavailable</p>
              <p className="text-sm text-muted-foreground">{errorMsg || 'We could not load your order details. Please contact support.'}</p>
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
