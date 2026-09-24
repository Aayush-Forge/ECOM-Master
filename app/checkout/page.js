'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, ChevronLeft, Loader2, ShieldCheck, CreditCard } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { createOrder } from '@/lib/api/orders'
import { createPaymentSession, verifyPaymentSession } from '@/lib/api/payments'
import { calculateCartDiscount, getAllDiscounts } from '@/lib/api/discounts'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Chandigarh','Puducherry','Jammu & Kashmir','Ladakh'
]

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function CheckoutPage() {
  const router = useRouter()
  const { items: cartItems, subtotal: cartSubtotal, clearCart, hydrated, cartKey } = useCart()
  const [isBuyNow, setIsBuyNow] = useState(false)
  const [buyNowItem, setBuyNowItem] = useState(null)
  const [initDone, setInitDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    notes: ''
  })
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const [autoDiscount, setAutoDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')

  const handlePincodeChange = async (e) => {
    const code = e.target.value.replace(/\D/g, '').slice(0, 6)
    setF('postcode', code)
    if (code.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${code}`)
        const data = await res.json()
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0]
          setForm(prev => ({
            ...prev,
            city: po.District || po.Block || prev.city,
            state: po.State || prev.state
          }))
        }
      } catch {}
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('buyNow') === 'true') {
      setIsBuyNow(true)
      try {
        const stored = sessionStorage.getItem('sd_buynow_item')
        if (stored) setBuyNowItem(JSON.parse(stored))
      } catch {}
    }
    setInitDone(true)
  }, [])

  const displayItems = isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cartItems
  const displaySubtotal = isBuyNow
    ? (buyNowItem ? buyNowItem.price * buyNowItem.quantity : 0)
    : cartSubtotal

  useEffect(() => {
    if (!displayItems || displayItems.length === 0) {
      setAutoDiscount(0)
      return
    }

    let active = true
    calculateCartDiscount(displayItems)
      .then(res => {
        if (active && res && typeof res.discountTotal === 'number') {
          setAutoDiscount(res.discountTotal)
        }
      })
      .catch(() => {})

    return () => { active = false }
  }, [displayItems])

  const handleApplyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setValidatingCoupon(true)
    setCouponError('')

    try {
      const rules = await getAllDiscounts()
      const match = (rules || []).find(r =>
        r.isActive && (r.name?.toLowerCase() === code.toLowerCase() || r.id === code)
      )

      if (!match) {
        setCouponError('Invalid or expired coupon code.')
        toast.error('Invalid or expired coupon code.')
        return
      }

      setAppliedCoupon(match)
      if (match.percentageOff) {
        setCouponDiscount((displaySubtotal * Number(match.percentageOff)) / 100)
      } else if (match.fixedPrice) {
        setCouponDiscount(Math.min(Number(match.fixedPrice), displaySubtotal))
      } else {
        setCouponDiscount(0)
      }
      toast.success(`Coupon "${match.name}" applied!`)
    } catch {
      setCouponError('Could not validate coupon. Please try again.')
      toast.error('Could not validate coupon.')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const shippingCharge = (displaySubtotal >= 499 || displaySubtotal === 0) ? 0 : 49
  const totalDiscount = Math.min(displaySubtotal, Math.max(autoDiscount, couponDiscount))
  const finalTotal = Math.max(0, displaySubtotal - totalDiscount + shippingCharge)

  useEffect(() => {
    if (hydrated && initDone && displayItems.length === 0 && !submitting) {
      router.replace('/cart')
    }
  }, [hydrated, initDone, displayItems, router, submitting])

  useEffect(() => {
    loadRazorpayScript()
  }, [])

  const validate = () => {
    const required = ['first_name', 'last_name', 'email', 'phone', 'address_1', 'city', 'state', 'postcode']
    for (const f of required) {
      if (!form[f]?.trim()) {
        toast.error(`${f.replace('_', ' ')} is required`)
        return false
      }
    }
    if (!isValidPhoneNumber(form.phone || '', 'IN')) {
      toast.error('Enter a valid Indian phone number')
      return false
    }
    if (!/^\d{6}$/.test(form.postcode)) {
      toast.error('Enter valid 6-digit pincode')
      return false
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast.error('Enter valid email')
      return false
    }
    return true
  }

  const handlePlaceOrder = async () => {
    if (!validate()) return
    setSubmitting(true)
    setStage('creating')

    try {
      const fullName = `${form.first_name} ${form.last_name}`.trim()
      const address = {
        fullName,
        phone: form.phone,
        addressLine1: form.address_1,
        addressLine2: form.address_2 || '',
        city: form.city,
        state: form.state,
        postalCode: form.postcode,
        country: 'IN',
      }

      const items = displayItems.map(i => ({
        productId: i.product_id || i.productId || i.id,
        quantity: Number(i.quantity || 1),
      }))

      const order = await createOrder({
        items,
        shippingAddress: address,
        billingAddress: address,
        couponCode: appliedCoupon?.name || (couponCode ? couponCode.trim() : undefined),
        shippingTotal: shippingCharge,
      })

      if (!order || !order.id) {
        toast.error('Could not create order. Please try again.')
        setSubmitting(false)
        setStage('')
        return
      }

      setStage('opening')
      const session = await createPaymentSession(order.id)

      if (session.isMock || !session.keyId || session.keyId === 'rzp_test_mock') {
        setStage('verifying')
        const verified = await verifyPaymentSession({
          orderId: order.id,
          razorpayOrderId: session.razorpayOrderId || `order_mock_${Date.now()}`,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_signature',
        })
        if (verified && verified.success) {
          if (!isBuyNow) clearCart()
          else sessionStorage.removeItem('sd_buynow_item')
          toast.success('Order placed successfully!')
          router.push(`/order-confirmation?orderId=${order.id}`)
          return
        }
      }

      const ok = await loadRazorpayScript()
      if (!ok) {
        toast.error('Could not load payment gateway. Please check your internet.')
        setSubmitting(false)
        setStage('')
        return
      }

      const options = {
        key: session.keyId,
        amount: Math.round(Number(session.amount || order.grandTotal || finalTotal) * 100),
        currency: session.currency || 'INR',
        name: 'SRIDATTAM',
        description: `Order #${order.orderNumber || order.id}`,
        order_id: session.razorpayOrderId,
        prefill: {
          name: fullName,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: '#FF6B00' },
        handler: async (resp) => {
          setStage('verifying')
          try {
            const v = await verifyPaymentSession({
              orderId: order.id,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            })
            if (!v || !v.success) {
              toast.error('Payment verification failed')
              setSubmitting(false)
              setStage('')
              return
            }
            if (!isBuyNow) clearCart()
            else sessionStorage.removeItem('sd_buynow_item')
            router.push(`/order-confirmation?orderId=${order.id}`)
          } catch (e) {
            console.error(e)
            toast.error('Could not verify payment. Please contact support.')
            setSubmitting(false)
            setStage('')
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. Your order is pending payment.')
            setSubmitting(false)
            setStage('')
          },
        },
      }

      const rzpInstance = new window.Razorpay(options)
      rzpInstance.on('payment.failed', (e) => {
        toast.error(e?.error?.description || 'Payment failed. Please try again.')
        setSubmitting(false)
        setStage('')
      })
      rzpInstance.open()
    } catch (e) {
      console.error(e)
      toast.error(e?.message || 'Network error. Please try again.')
      setSubmitting(false)
      setStage('')
    }
  }

  if (!hydrated || !initDone || displayItems.length === 0) {
    return <main className="min-h-screen bg-transparent relative z-10"><Header /></main>
  }

  const stageLabel = stage === 'creating' ? 'Creating order...'
    : stage === 'opening' ? 'Opening secure payment...'
    : stage === 'verifying' ? 'Verifying payment...'
    : ''

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-10">
        <div className="container max-w-6xl">
          <Link href="/cart" className="inline-flex items-center text-sm text-maroon-500 hover:text-saffron-600 mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <div className="text-center mb-8">
            <p className="text-gold-700 text-sm tracking-[0.2em]">SECURE CHECKOUT</p>
            <h1 className="font-display text-3xl md:text-4xl text-maroon-500 mt-1">Checkout</h1>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="font-display text-xl text-maroon-500 mb-5">Delivery Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input value={form.first_name} onChange={e => setF('first_name', e.target.value)} placeholder="First name" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={form.last_name} onChange={e => setF('last_name', e.target.value)} placeholder="Last name" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="you@example.com" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input type="tel" maxLength={20} value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="e.g. +91 98765 43210" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
              </div>

              <div className="mt-4">
                <Label>Address Line 1 *</Label>
                <Input value={form.address_1} onChange={e => setF('address_1', e.target.value)} placeholder="House / Flat no., Building, Street" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
              </div>

              <div className="mt-4">
                <Label>Address Line 2 (Optional)</Label>
                <Input value={form.address_2} onChange={e => setF('address_2', e.target.value)} placeholder="Landmark, Area (optional)" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label>PIN Code *</Label>
                  <Input maxLength={6} value={form.postcode} onChange={handlePincodeChange} placeholder="6-digit pincode" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={form.city} onChange={e => setF('city', e.target.value)} placeholder="City / District" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div>
                  <Label>State *</Label>
                  <Select value={form.state} onValueChange={v => setF('state', v)}>
                    <SelectTrigger className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(st => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label>Order Notes (Optional)</Label>
                <Textarea value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Any special delivery instructions..." className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" rows={3} />
              </div>

              <div className="mt-8 border-t border-stone-100 pt-6">
                <div className="bg-stone-50 rounded-xl p-4 flex items-center justify-between gap-4 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-saffron-100 flex items-center justify-center text-saffron-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-stone-800">Online Payment</p>
                      <p className="text-xs text-stone-500">UPI, Cards, NetBanking, Wallets</p>
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full mt-6 bg-[#6B1024] hover:bg-[#4D0013] text-white py-6 text-base font-semibold shadow-lg shadow-maroon-900/10"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {stageLabel || 'Processing...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" /> Pay ₹{finalTotal.toFixed(0)} Securely
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex justify-center gap-4 text-xs text-stone-500 mt-6 pt-4 border-t border-stone-100">
                <Link href="/privacy-policy" className="hover:text-saffron-600 underline">Privacy Policy</Link>
                <Link href="/terms-conditions" className="hover:text-saffron-600 underline">Terms &amp; Conditions</Link>
                <Link href="/refund-policy" className="hover:text-saffron-600 underline">Refund Policy</Link>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 self-start">
              <div className="bg-stone-50 border border-stone-200 text-stone-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                <div className="relative">
                  <h2 className="font-display text-xl text-maroon-500 font-bold mb-4">Order Summary</h2>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {displayItems.map(it => {
                      const key = cartKey(it.product_id || it.productId || it.id, it.variation_id)
                      const itemRegular = it.regular_price || it.price
                      const hasDiscount = itemRegular > it.price
                      return (
                        <div key={key} className="flex gap-3 text-sm border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                          <div className="relative w-14 h-14 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden flex-shrink-0">
                            {it.image && <Image src={it.image} alt={it.name} fill className="object-cover" unoptimized />}
                          </div>
                          <div className="flex-1">
                            <p className="line-clamp-1 font-medium text-stone-800">{it.name}</p>
                            {it.attrs?.length > 0 && (
                              <p className="text-[10px] text-stone-500">{it.attrs.map(a => a.option).join(' · ')}</p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-stone-500">Qty {it.quantity} · ₹{it.price}</span>
                              {hasDiscount && (
                                <span className="text-[10px] text-stone-400 line-through">₹{itemRegular}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1.5 justify-end">
                              {hasDiscount && (
                                <span className="text-xs text-stone-400 line-through">₹{(itemRegular * it.quantity).toFixed(0)}</span>
                              )}
                              <p className="font-bold text-[#6B1024]">₹{(it.price * it.quantity).toFixed(0)}</p>
                            </div>
                            {hasDiscount && (
                              <p className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded-sm self-end mt-0.5">
                                Save ₹{((itemRegular - it.price) * it.quantity).toFixed(0)} ({Math.round(((itemRegular - it.price) / itemRegular) * 100)}%)
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-stone-200 mt-5 pt-4">
                    {!appliedCoupon ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-stone-600">Promo / Coupon Code</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value.toUpperCase())
                              setCouponError('')
                            }}
                            className="bg-white border-stone-200 focus-visible:ring-saffron-500 uppercase text-xs h-9"
                          />
                          <Button
                            onClick={handleApplyCoupon}
                            disabled={validatingCoupon || !couponCode.trim()}
                            className="bg-[#6B1024] hover:bg-[#4D0013] text-white text-xs h-9 px-4"
                          >
                            {validatingCoupon ? '...' : 'Apply'}
                          </Button>
                        </div>
                        {couponError && <p className="text-xs text-rose-600 font-medium">{couponError}</p>}
                      </div>
                    ) : (
                      <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3 flex justify-between items-center text-xs text-emerald-800">
                        <div>
                          <p className="font-semibold text-emerald-700">Coupon applied: {appliedCoupon.name}</p>
                          <p className="text-[10px] text-emerald-600">₹{totalDiscount.toFixed(0)} discount applied to order</p>
                        </div>
                        <Button
                          onClick={() => {
                            setAppliedCoupon(null)
                            setCouponDiscount(0)
                            setCouponCode('')
                          }}
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 h-auto text-[11px] font-semibold"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const displayRegularSubtotal = displayItems.reduce((s, i) => s + (i.regular_price || i.price) * i.quantity, 0)
                    const displayProductSavings = displayRegularSubtotal - displaySubtotal
                    const grandSavings = displayProductSavings + totalDiscount

                    return (
                      <div className="border-t border-stone-200 mt-5 pt-4 space-y-2 text-sm text-stone-600">
                        <div className="flex justify-between">
                          <span>Subtotal (MRP)</span>
                          <span className="text-stone-800 font-medium">₹{displayRegularSubtotal.toFixed(0)}</span>
                        </div>
                        {displayProductSavings > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Product Discount</span>
                            <span>-₹{displayProductSavings.toFixed(0)}</span>
                          </div>
                        )}
                        {totalDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Clubbing / Coupon Savings</span>
                            <span>-₹{totalDiscount.toFixed(0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span className="text-stone-800">{shippingCharge === 0 ? 'Free delivery' : `₹${shippingCharge.toFixed(0)}`}</span>
                        </div>
                        <div className="flex justify-between text-xl font-display text-maroon-500 pt-2 border-t border-stone-200 mt-2 font-bold">
                          <span>Total</span>
                          <span className="text-saffron-600">₹{finalTotal.toFixed(0)}</span>
                        </div>
                        {grandSavings > 0 && (
                          <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2.5 px-3 rounded-lg text-center mt-3 border border-emerald-100/60">
                            Congratulations! You saved ₹{grandSavings.toFixed(0)} ({Math.round((grandSavings / displayRegularSubtotal) * 100)}%) on this order!
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}

function App() { return <CheckoutPage /> }
export default App
