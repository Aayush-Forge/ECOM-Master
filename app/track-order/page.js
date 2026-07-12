'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Mail, Truck, AlertCircle, ArrowRight, Calendar, CheckCircle2, Package, Clock, ShieldAlert } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [searched, setSearched] = useState(false)
  const [products, setProducts] = useState([])

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

  const handleTrack = async (e) => {
    e.preventDefault()
    const cleanId = orderId.trim()
    const cleanEmail = email.trim()

    if (!cleanId || !/^\d+$/.test(cleanId)) {
      toast.error('Please enter a valid numeric Order ID.')
      return
    }
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      toast.error('Please enter a valid Email ID.')
      return
    }

    setLoading(true)
    setOrder(null)

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cleanId, email: cleanEmail })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Order number or billing email does not match.')
      } else {
        setOrder(data)
        setSearched(true)
        toast.success('Order found successfully!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Could not retrieve order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status, hasTracking) => {
    const deliveryStatuses = ['delivered', 'wc-delivered', 'package-delivered', 'wc-package-delivered']
    const isCompleted = deliveryStatuses.includes(status) || (['completed', 'wc-completed'].includes(status) && !hasTracking)
    if (isCompleted) {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-xs px-3 py-1">Package Delivered</Badge>
    }
    const effectiveStatus = (['completed', 'wc-completed'].includes(status) && hasTracking) ? 'shipped' : status
    switch (effectiveStatus) {
      case 'shipped':
      case 'wc-shipped':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none text-xs px-3 py-1">Shipped</Badge>
      case 'processing':
        return <Badge className="bg-saffron-500 hover:bg-saffron-600 text-white border-none text-xs px-3 py-1">Processing</Badge>
      case 'pending':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-xs px-3 py-1">Pending Payment</Badge>
      case 'on-hold':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white border-none text-xs px-3 py-1">On Hold</Badge>
      case 'cancelled':
        return <Badge className="bg-zinc-500 hover:bg-zinc-600 text-white border-none text-xs px-3 py-1">Cancelled</Badge>
      case 'failed':
        return <Badge className="bg-destructive text-white border-none text-xs px-3 py-1">Failed</Badge>
      default:
        return <Badge className="bg-blue-600 text-white border-none text-xs px-3 py-1">{status}</Badge>
    }
  }

  const getProgressPercentage = (order) => {
    const status = order.status
    const hasTracking = !!order.tracking_number
    const deliveryStatuses = ['delivered', 'wc-delivered', 'package-delivered', 'wc-package-delivered']
    
    if (deliveryStatuses.includes(status) || (['completed', 'wc-completed'].includes(status) && !hasTracking)) {
      return 100
    }
    if (status === 'shipped' || status === 'wc-shipped' || hasTracking || ['completed', 'wc-completed'].includes(status)) {
      return 66
    }
    if (['processing'].includes(status)) return 33
    return 0
  }

  // Determine active steps for the progress line
  const getProgressSteps = (order) => {
    const status = order.status
    const hasTracking = !!order.tracking_number
    const deliveryStatuses = ['delivered', 'wc-delivered', 'package-delivered', 'wc-package-delivered']
    
    const isCompleted = deliveryStatuses.includes(status) || (['completed', 'wc-completed'].includes(status) && !hasTracking)
    const isShipped = ['shipped', 'wc-shipped', 'completed', 'wc-completed'].includes(status) || hasTracking || isCompleted

    const steps = [
      { key: 'ordered', label: 'Order Placed', icon: CheckCircle2, active: true },
      { key: 'processing', label: 'Processing', icon: Clock, active: ['processing', 'shipped', 'wc-shipped', 'completed', 'wc-completed', ...deliveryStatuses].includes(status) || hasTracking },
      { key: 'shipped', label: 'Shipped', icon: Truck, active: isShipped },
      { key: 'completed', label: 'Package Delivered', icon: Package, active: isCompleted }
    ]
    return steps
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-16 relative">
        <div className="absolute inset-0 bg-mandala opacity-10 pointer-events-none" />
        <div className="container max-w-4xl relative z-10">
          <div className="text-center mb-10">
            <p className="text-gold-700 text-sm tracking-[0.2em]">TRACK ORDER</p>
            <h1 className="font-display text-4xl md:text-5xl text-maroon-500 mt-1">Track Your Order</h1>
            <p className="text-muted-foreground italic mt-2">Enter your credentials below to search order history</p>
          </div>

          {!order ? (
            <div className="max-w-md mx-auto bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-md">
              <form onSubmit={handleTrack} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="orderId" className="text-maroon-500 font-medium">Order ID *</Label>
                  <Input
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 12345"
                    required
                    className="bg-stone-50 border-stone-200 focus-visible:ring-saffron-500 text-midnight placeholder:text-muted-foreground/60 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-maroon-500 font-medium">Email ID *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-stone-50 border-stone-200 focus-visible:ring-saffron-500 text-midnight placeholder:text-muted-foreground/60 h-11"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-semibold shadow-lg shadow-saffron-200 h-12 text-base transition-transform active:scale-95"
                >
                  {loading ? 'Searching Order...' : (
                    <span className="flex items-center justify-center gap-2">
                      Track Order <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Status Card */}
              <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 pb-5">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Order Number</span>
                    <h2 className="font-display text-2xl text-maroon-500">#{order.number}</h2>
                    <p className="text-xs text-muted-foreground mt-1">Placed on {new Date(order.date_created).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Current Status:</span>
                    {getStatusBadge(order.status, !!order.tracking_number)}
                  </div>
                </div>

                {/* Progress Tracker */}
                {!['cancelled', 'failed'].includes(order.status) && (
                  <div className="py-8 border-b border-stone-200">
                    <div className="relative flex justify-between max-w-xl mx-auto">
                      {/* Connection Line */}
                      <div className="absolute top-5 left-[12%] right-[12%] h-[2px] bg-stone-200 z-0">
                        <div
                          className="h-full bg-saffron-500 transition-all duration-500"
                          style={{
                            width: `${getProgressPercentage(order)}%`
                          }}
                        />
                      </div>

                      {/* Steps */}
                      {getProgressSteps(order).map((step, idx) => {
                        const Icon = step.icon
                        return (
                          <div key={idx} className="relative z-10 flex flex-col items-center text-center w-1/4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                              step.active 
                                ? 'bg-saffron-500 border-saffron-600 text-white shadow-md' 
                                : 'bg-stone-50 border-stone-200 text-muted-foreground'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] sm:text-xs font-semibold mt-2.5 max-w-[120px] leading-tight ${
                              step.active ? 'text-maroon-500' : 'text-muted-foreground'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Shipment Tracking Info Box */}
                {order.tracking_number && (
                  <div className="my-6 p-5 rounded-2xl border border-saffron-300 bg-saffron-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                    <div>
                      <h4 className="font-display text-maroon-500 font-semibold text-base flex items-center gap-2">
                        <Truck className="w-5 h-5 text-saffron-600" /> Shipment Tracking Details
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your package has been handed over to the shipping partner.
                        {order.tracking_provider && ` Courier Partner: ${order.tracking_provider}`}
                      </p>
                      <p className="text-sm font-semibold mt-2">
                        Tracking ID: <span className="font-mono text-saffron-600 bg-saffron-100/50 px-2 py-0.5 rounded select-all">{order.tracking_number}</span>
                      </p>
                    </div>
                    {order.tracking_link && (
                      <Button asChild size="sm" className="bg-saffron-500 hover:bg-saffron-600 text-white font-semibold flex-shrink-0 shadow-md">
                        <a href={order.tracking_link} target="_blank" rel="noopener noreferrer">
                          Track Shipment
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {/* Item List */}
                <div className="py-5 border-b border-stone-200">
                  <h3 className="font-display text-lg text-maroon-500 mb-4">Items Ordered</h3>
                  <div className="space-y-3">
                    {(order.line_items || []).map((it) => {
                      const match = products.find(p => p.id === it.product_id)
                      const itemRegular = it.regular_price !== undefined ? parseFloat(it.regular_price) : (match ? (parseFloat(match.regular_price) || parseFloat(match.price) || 0) : parseFloat(it.price))
                      const hasDiscount = itemRegular > parseFloat(it.price)
                      return (
                        <div key={it.id} className="flex gap-3 items-center py-2 border-b border-stone-100 last:border-0 pb-3">
                          <div className="relative w-14 h-14 rounded-lg bg-stone-50 overflow-hidden flex-shrink-0 border border-stone-200">
                            {it.image?.src ? (
                              <Image src={it.image.src} alt={it.name} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-stone-100 text-gold-700">ॐ</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-midnight line-clamp-1">{it.name}</p>
                            {it.meta_data?.length > 0 && (
                              <p className="text-[10px] text-muted-foreground">{it.meta_data.map(m => m.value).join(' · ')}</p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-stone-500">Qty {it.quantity} · ₹{parseFloat(it.price).toFixed(0)} each</span>
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
                </div>

                {/* Bottom billing & sums grids */}
                <div className="grid md:grid-cols-2 gap-6 pt-5">
                  <div className="text-sm">
                    <h4 className="font-display text-maroon-500 mb-2">Delivery Address</h4>
                    <p className="font-medium text-midnight">{order.billing?.first_name} {order.billing?.last_name}</p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      {order.billing?.address_1}
                      {order.billing?.address_2 ? `, ${order.billing.address_2}` : ''}<br />
                      {order.billing?.city}, {order.billing?.state} - {order.billing?.postcode}
                    </p>
                    <p className="text-muted-foreground mt-2 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {order.billing?.email}</p>
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
                      <div className="space-y-2 text-sm max-w-xs md:ml-auto w-full">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal (MRP)</span>
                          <span>₹{totalRegular.toFixed(0)}</span>
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
                        <div className="flex justify-between text-muted-foreground border-b border-stone-200 pb-2">
                          <span>Shipping</span>
                          <span>{Number(order.shipping_total) === 0 ? 'Free' : `₹${Number(order.shipping_total).toFixed(0)}`}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2">
                          <span className="font-display text-lg text-maroon-500">Grand Total</span>
                          <span className="font-display text-2xl text-saffron-600">₹{Number(order.total).toFixed(0)}</span>
                        </div>
                        {totalSavings > 0 && (
                          <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold py-2 px-3 rounded-lg text-center mt-3 border border-emerald-100/60 w-full animate-fade-in">
                            Congratulations! You saved ₹{totalSavings.toFixed(0)} ({Math.round((totalSavings / totalRegular) * 100)}%) on this order!
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <div className="mt-8 flex justify-center pt-2">
                  <Button
                    onClick={() => {
                      setOrder(null)
                      setSearched(false)
                    }}
                    variant="outline"
                    className="border-gold-500 text-maroon-500 hover:bg-stone-50 font-semibold bg-transparent"
                  >
                    Track Another Order
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
