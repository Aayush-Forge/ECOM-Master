'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Truck, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Package, 
  Clock, 
  XCircle,
  MapPin,
  Calendar,
  RotateCcw
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { getMyOrderByNumber } from '@/lib/api/orders'

const STATUS_PROGRESS_STEPS = [
  { key: 'payment_pending', label: 'Payment Pending', icon: Clock },
  { key: 'paid', label: 'Order Paid', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

const STATUS_PROGRESS_RANK = {
  payment_pending: 0,
  paid: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
}

export default function TrackOrderPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()

  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/track-order')
    }
  }, [authLoading, isAuthenticated, router])

  const handleTrack = async (e) => {
    e.preventDefault()
    const cleanNumber = orderNumber.trim()

    if (!cleanNumber) {
      toast.error('Please enter an Order Number.')
      return
    }

    setLoading(true)
    setError(null)
    setOrder(null)
    setSearched(true)

    try {
      const data = await getMyOrderByNumber(cleanNumber)
      if (!data) {
        setError(`No order found with order number "${cleanNumber}". Please ensure the order number is correct and was placed using your account.`)
      } else {
        setOrder(data)
        toast.success('Order located successfully')
      }
    } catch (err) {
      console.error('Failed to retrieve order:', err)
      setError(err?.message || 'Could not retrieve order details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setOrder(null)
    setSearched(false)
    setError(null)
    setOrderNumber('')
  }

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none text-xs px-3 py-1 font-medium font-inter">Delivered</Badge>
      case 'shipped':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none text-xs px-3 py-1 font-medium font-inter">Shipped</Badge>
      case 'processing':
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-none text-xs px-3 py-1 font-medium font-inter">Processing</Badge>
      case 'paid':
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-none text-xs px-3 py-1 font-medium font-inter">Paid</Badge>
      case 'payment_pending':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-xs px-3 py-1 font-medium font-inter">Payment Pending</Badge>
      case 'cancelled':
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white border-none text-xs px-3 py-1 font-medium font-inter">Cancelled</Badge>
      case 'refunded':
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-none text-xs px-3 py-1 font-medium font-inter">Refunded</Badge>
      default:
        return <Badge className="bg-stone-600 text-white border-none text-xs px-3 py-1 font-medium font-inter">{status}</Badge>
    }
  }

  if (authLoading) {
    return (
      <main className="bg-stone-50 min-h-screen">
        <Header />
        <div className="container max-w-4xl py-20 px-4">
          <Skeleton className="h-10 w-64 mx-auto mb-4 bg-stone-200" />
          <Skeleton className="h-6 w-96 mx-auto mb-10 bg-stone-200" />
          <Skeleton className="h-56 max-w-md mx-auto bg-stone-200 rounded-xl" />
        </div>
        <Footer />
      </main>
    )
  }

  const shippingAddr = order?.addresses?.find((a) => a.type === 'shipping') || order?.addresses?.[0] || order?.shippingAddress
  const isTerminalCancelledOrRefunded = ['cancelled', 'refunded'].includes(order?.status?.toLowerCase())
  const currentStepRank = STATUS_PROGRESS_RANK[order?.status?.toLowerCase()] ?? 0
  const progressPercent = Math.round((currentStepRank / (STATUS_PROGRESS_STEPS.length - 1)) * 100)

  return (
    <main className="bg-stone-50 min-h-screen relative z-10 flex flex-col justify-between">
      <div>
        <Header />
        <div className="py-12 md:py-16 relative">
          <div className="container max-w-4xl px-4 relative z-10">
            <div className="text-center mb-10">
              <p className="text-saffron text-xs tracking-[0.25em] font-bold uppercase font-inter">Order Tracking</p>
              <h1 className="font-display text-3xl md:text-4xl text-stone-900 mt-2 font-bold">Track Your Order</h1>
              <p className="text-stone-500 text-sm mt-2 font-inter">
                Enter your human-readable order number below to view current fulfillment status.
              </p>
            </div>

            {!order ? (
              <div className="max-w-md mx-auto space-y-6">
                <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <form onSubmit={handleTrack} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="orderNumber" className="text-stone-800 font-semibold font-inter text-sm">
                        Order Number *
                      </Label>
                      <Input
                        id="orderNumber"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="e.g. ORD-TEST-001"
                        required
                        className="bg-stone-50/80 border-stone-200 focus-visible:ring-saffron text-stone-900 placeholder:text-stone-400 h-11 text-sm font-mono"
                      />
                      <p className="text-[11px] text-stone-500 font-inter">
                        Format: ORD-XXXXXXXX (found in your order confirmation)
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold h-12 text-sm shadow-sm transition-transform active:scale-95 font-inter"
                    >
                      {loading ? 'Locating Order...' : (
                        <span className="flex items-center justify-center gap-2">
                          Track Order <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>
                </div>

                {searched && error && (
                  <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-xs flex items-start gap-3.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                    <div className="text-sm font-inter">
                      <p className="font-bold text-rose-950">Order Not Found</p>
                      <p className="text-rose-700 mt-1 leading-relaxed text-xs">{error}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setError(null)}
                          className="h-8 text-xs border-rose-200 text-rose-800 hover:bg-rose-50"
                        >
                          Clear
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 text-xs text-saffron hover:text-saffron-dark font-semibold p-0"
                        >
                          <Link href="/account/orders">View My Orders &rarr;</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Order Status Card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-5">
                    <div>
                      <span className="text-xs text-stone-400 font-mono uppercase tracking-wider block">Order Number</span>
                      <h2 className="font-display text-2xl font-bold text-stone-900 mt-0.5">#{order.orderNumber}</h2>
                      <p className="text-xs text-stone-500 mt-1 font-inter flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        Placed on {new Date(order.createdAt || order.placedAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-stone-500 font-inter hidden sm:inline">Status:</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Progress Tracker for Active/Linear Lifecycles */}
                  {!isTerminalCancelledOrRefunded ? (
                    <div className="py-6 border-b border-stone-100">
                      <div className="relative flex justify-between max-w-2xl mx-auto px-4 sm:px-8">
                        {/* Connection Line Background */}
                        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-stone-200 z-0" />
                        {/* Dynamic Progress Fill */}
                        <div
                          className="absolute top-5 left-[10%] h-[2px] bg-saffron transition-all duration-500 z-0"
                          style={{ width: `${Math.min(progressPercent * 0.8, 80)}%` }}
                        />

                        {STATUS_PROGRESS_STEPS.map((step, idx) => {
                          const Icon = step.icon
                          const isCompletedOrActive = idx <= currentStepRank
                          const isCurrent = idx === currentStepRank

                          return (
                            <div key={step.key} className="relative z-10 flex flex-col items-center text-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCompletedOrActive
                                    ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-sm'
                                    : 'bg-white border-stone-300 text-stone-400'
                                } ${isCurrent ? 'ring-4 ring-orange-100' : ''}`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <span
                                className={`text-[11px] sm:text-xs font-semibold mt-2.5 max-w-[80px] sm:max-w-[100px] leading-tight font-inter ${
                                  isCompletedOrActive ? 'text-stone-900' : 'text-stone-400'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Terminal Status Banner (Cancelled / Refunded) */
                    <div className={`p-4 rounded-xl border flex items-start gap-3 font-inter ${
                      order.status === 'cancelled'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-purple-50 border-purple-200 text-purple-900'
                    }`}>
                      <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-current" />
                      <div className="text-sm">
                        <p className="font-bold">
                          {order.status === 'cancelled' ? 'Order Cancelled' : 'Order Refunded'}
                        </p>
                        <p className="text-xs mt-0.5 opacity-90">
                          {order.status === 'cancelled'
                            ? 'This order has been cancelled and will not undergo fulfillment.'
                            : 'This order transaction has been refunded.'}
                        </p>
                        {order.statusHistory?.[0]?.note && (
                          <p className="text-xs italic mt-1.5 opacity-80">
                            Reason/Note: &ldquo;{order.statusHistory[0].note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items Ordered List */}
                  <div className="py-4 border-b border-stone-100">
                    <h3 className="font-display text-lg font-bold text-stone-900 mb-3">Items Ordered</h3>
                    <div className="divide-y divide-stone-100">
                      {(order.items || []).map((it) => (
                        <div key={it.id} className="flex gap-3.5 sm:gap-4 items-center py-3">
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-stone-50 overflow-hidden shrink-0 border border-stone-200">
                            <Image
                              src={it.imageUrl || it.product?.images?.[0] || 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300'}
                              alt={it.titleSnapshot || 'Product'}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1 min-w-0 font-inter">
                            <p className="font-semibold text-sm text-stone-900 line-clamp-1">{it.titleSnapshot}</p>
                            <p className="text-xs text-stone-400 font-mono mt-0.5">SKU: {it.skuSnapshot || '—'}</p>
                            <p className="text-xs text-stone-600 mt-1">
                              Qty {it.quantity} &times; ₹{Number(it.unitPriceSnapshot).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right shrink-0 font-inter">
                            <p className="font-bold text-stone-900 text-sm sm:text-base">
                              ₹{Number(it.lineTotal).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping & Cost Grids */}
                  <div className="grid md:grid-cols-2 gap-6 pt-2 font-inter">
                    <div>
                      <h4 className="font-display font-bold text-base text-stone-900 mb-2.5 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-saffron" /> Delivery Address
                      </h4>
                      {shippingAddr ? (
                        <div className="text-sm text-stone-600 space-y-1 bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
                          <p className="font-bold text-stone-900">{shippingAddr.fullName}</p>
                          <p>{shippingAddr.addressLine1}</p>
                          {shippingAddr.addressLine2 && <p>{shippingAddr.addressLine2}</p>}
                          <p>{shippingAddr.city}, {shippingAddr.state} - {shippingAddr.postalCode}</p>
                          <p>{shippingAddr.country}</p>
                          {shippingAddr.phone && (
                            <p className="pt-2 text-xs font-mono text-stone-500">Phone: {shippingAddr.phone}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500 bg-stone-50 p-4 rounded-xl">No shipping address recorded.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-base text-stone-900 mb-2.5">
                        Cost Breakdown
                      </h4>
                      <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/60 space-y-2 text-sm text-stone-600">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="font-medium text-stone-900">₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {Number(order.discountTotal) > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Discount</span>
                            <span>-₹{Number(order.discountTotal).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {Number(order.taxTotal) > 0 && (
                          <div className="flex justify-between">
                            <span>Tax</span>
                            <span className="font-medium text-stone-900">₹{Number(order.taxTotal).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-b border-stone-200 pb-2">
                          <span>Shipping</span>
                          <span className="font-medium text-stone-900">
                            {Number(order.shippingTotal) === 0 ? 'Free' : `₹${Number(order.shippingTotal).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 text-stone-900 font-bold text-base">
                          <span>Grand Total</span>
                          <span className="font-display text-xl text-[#FF6B00]">
                            ₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-8 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      className="border-stone-300 text-stone-700 hover:bg-stone-50 font-inter text-xs font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Track Another Order
                    </Button>

                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-saffron hover:text-saffron-dark font-inter text-xs font-semibold"
                    >
                      <Link href="/account/orders">
                        View All Orders in Account &rarr;
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
