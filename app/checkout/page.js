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
  const [stage, setStage] = useState('') // 'creating' | 'opening' | 'verifying'
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address_1: '', address_2: '', city: '', state: '', postcode: '', notes: ''
  })
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const [couponCode, setCouponCode] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
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
          setForm(prev => ({ ...prev, city: po.District || po.Block || prev.city, state: po.State || prev.state }))
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
  const displaySubtotal = isBuyNow ? (buyNowItem ? buyNowItem.price * buyNowItem.quantity : 0) : cartSubtotal

  const calculateDiscountForCoupon = (coupon) => {
    if (!coupon) return 0
    let discount = 0

    if (coupon.discount_type === 'percent') {
      let discountableAmount = 0
      for (const item of displayItems) {
        const isSale = (item.regular_price || item.price) > item.price
        if (coupon.exclude_sale_items && isSale) continue
        if (coupon.product_ids?.length > 0 && !coupon.product_ids.includes(item.product_id)) continue
        if (coupon.excluded_product_ids?.length > 0 && coupon.excluded_product_ids.includes(item.product_id)) continue
        
        discountableAmount += item.price * item.quantity
      }
      discount = (discountableAmount * parseFloat(coupon.amount)) / 100
    } else if (coupon.discount_type === 'fixed_cart') {
      if (coupon.exclude_sale_items) {
        let nonSaleTotal = 0
        for (const item of displayItems) {
          const isSale = (item.regular_price || item.price) > item.price
          if (!isSale) {
            nonSaleTotal += item.price * item.quantity
          }
        }
        discount = Math.min(parseFloat(coupon.amount), nonSaleTotal)
      } else {
        discount = parseFloat(coupon.amount)
      }
    } else if (coupon.discount_type === 'fixed_product') {
      let discSum = 0
      for (const item of displayItems) {
        const isSale = (item.regular_price || item.price) > item.price
        if (coupon.exclude_sale_items && isSale) continue
        if (coupon.product_ids?.length > 0 && !coupon.product_ids.includes(item.product_id)) continue
        if (coupon.excluded_product_ids?.length > 0 && coupon.excluded_product_ids.includes(item.product_id)) continue
        
        discSum += parseFloat(coupon.amount) * item.quantity
      }
      discount = discSum
    }

    return Math.min(discount, displaySubtotal)
  }

  const couponDiscount = appliedCoupon ? calculateDiscountForCoupon(appliedCoupon) : 0

  const handleApplyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setValidatingCoupon(true)
    setCouponError('')

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (!res.ok) {
        setCouponError(data.error || 'Failed to apply coupon.')
        toast.error(data.error || 'Failed to apply coupon.')
        return
      }

      // Check spend restrictions
      const minAmount = parseFloat(data.minimum_amount || 0)
      const maxAmount = parseFloat(data.maximum_amount || 0)
      if (minAmount > 0 && displaySubtotal < minAmount) {
        const err = `This coupon requires a minimum spend of ₹${minAmount.toFixed(0)}.`
        setCouponError(err)
        toast.error(err)
        return
      }
      if (maxAmount > 0 && displaySubtotal > maxAmount) {
        const err = `This coupon is only valid for spends under ₹${maxAmount.toFixed(0)}.`
        setCouponError(err)
        toast.error(err)
        return
      }
      
      if (data.exclude_sale_items) {
        const hasNonSale = displayItems.some(item => (item.regular_price || item.price) <= item.price)
        if (!hasNonSale) {
          const err = 'This coupon excludes items on sale.'
          setCouponError(err)
          toast.error(err)
          return
        }
      }

      // Check if it actually provides a discount
      const checkDiscount = calculateDiscountForCoupon(data)
      if (checkDiscount <= 0) {
        const err = 'This coupon does not apply to the items in your cart.'
        setCouponError(err)
        toast.error(err)
        return
      }

      setAppliedCoupon(data)
      toast.success(`Coupon "${data.code}" applied successfully!`)
    } catch (e) {
      console.error(e)
      setCouponError('Network error. Please try again.')
      toast.error('Network error validating coupon.')
    } finally {
      setValidatingCoupon(false)
    }
  }

  // Shipping: Free for orders >= 499, otherwise standard ₹49
  const shippingCharge = (displaySubtotal >= 499 || displaySubtotal === 0) ? 0 : 49

  const finalTotal = Math.max(0, displaySubtotal - couponDiscount + shippingCharge)

  useEffect(() => {
    if (hydrated && initDone && displayItems.length === 0 && !submitting) router.replace('/cart')
  }, [hydrated, initDone, displayItems, router, submitting])

  // Pre-load Razorpay JS so it's ready when user clicks pay
  useEffect(() => { loadRazorpayScript() }, [])

  const validate = () => {
    const required = ['first_name', 'last_name', 'email', 'phone', 'address_1', 'city', 'state', 'postcode']
    for (const f of required) if (!form[f]?.trim()) { toast.error(`${f.replace('_', ' ')} is required`); return false }
    if (!/^\d{10}$/.test(form.phone)) { toast.error('Enter valid 10-digit phone'); return false }
    if (!/^\d{6}$/.test(form.postcode)) { toast.error('Enter valid 6-digit pincode'); return false }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) { toast.error('Enter valid email'); return false }
    return true
  }

  const handlePlaceOrder = async () => {
    if (!validate()) return
    setSubmitting(true)
    setStage('creating')

    try {
      const billing = {
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.phone,
        address_1: form.address_1, address_2: form.address_2,
        city: form.city, state: form.state, postcode: form.postcode, country: 'IN'
      }
      const line_items = displayItems.map(i => ({
        product_id: i.product_id,
        variation_id: i.variation_id || undefined,
        quantity: i.quantity,
        meta_data: [
          { key: '_regular_price', value: String(i.regular_price || i.price) }
        ]
      }))

      const shipping_lines = shippingCharge > 0 ? [{
        method_id: 'flat_rate',
        method_title: 'Calculated Shipping',
        total: String(shippingCharge)
      }] : []

      // 1. Create WooCommerce order (status: pending)
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing,
          shipping: billing,
          line_items,
          shipping_lines,
          coupon_lines: appliedCoupon ? [{ code: appliedCoupon.code }] : [],
          customer_note: form.notes
        })
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        toast.error(orderData.error || 'Could not create order')
        setSubmitting(false); setStage(''); return
      }
      const { id: orderId, order_key: orderKey, payment_url: wcPaymentUrl } = orderData

      // Save the key so confirmation page can fetch order securely
      try { sessionStorage.setItem(`sd_order_${orderId}`, orderKey) } catch {}

      // 2. Create Razorpay order
      setStage('opening')
      const rzpRes = await fetch('/api/payment/create-rzp-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderKey })
      })
      const rzp = await rzpRes.json()

      if (!rzpRes.ok) {
        // If Razorpay not configured, gracefully fall back to WC payment page
        if (rzp.code === 'RZP_NOT_CONFIGURED' && wcPaymentUrl) {
          toast.info('Razorpay keys missing — using WooCommerce checkout')
          clearCart()
          window.location.href = wcPaymentUrl
          return
        }
        toast.error(rzp.error || 'Could not initiate payment')
        setSubmitting(false); setStage(''); return
      }

      // 3. Open Razorpay checkout modal
      const ok = await loadRazorpayScript()
      if (!ok) {
        toast.error('Could not load payment gateway. Please check your internet.')
        setSubmitting(false); setStage(''); return
      }

      const options = {
        key: rzp.key_id,
        amount: rzp.amount,
        currency: rzp.currency,
        name: 'SRIDATTAM',
        description: `Order #${orderData.number || orderId}`,
        order_id: rzp.rzp_order_id,
        prefill: rzp.prefill || {
          name: `${form.first_name} ${form.last_name}`,
          email: form.email,
          contact: form.phone
        },
        notes: { wc_order_id: String(orderId) },
        theme: { color: '#FF6B00' },
        handler: async (resp) => {
          setStage('verifying')
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId, orderKey,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature
              })
            })
            const v = await verifyRes.json()
            if (!verifyRes.ok || !v.success) {
              toast.error(v.error || 'Payment verification failed')
              setSubmitting(false); setStage(''); return
            }
            if (!isBuyNow) clearCart(); else sessionStorage.removeItem('sd_buynow_item')
            router.push(`/order-confirmation?orderId=${orderId}&key=${encodeURIComponent(orderKey)}`)
          } catch (e) {
            console.error(e)
            toast.error('Could not verify payment. Please contact support.')
            setSubmitting(false); setStage('')
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. Your order is on hold — you can retry payment.')
            setSubmitting(false); setStage('')
          }
        }
      }
      const rzpInstance = new window.Razorpay(options)
      rzpInstance.on('payment.failed', (e) => {
        toast.error(e?.error?.description || 'Payment failed. Please try again.')
        setSubmitting(false); setStage('')
      })
      rzpInstance.open()
    } catch (e) {
      console.error(e)
      toast.error('Network error. Please try again.')
      setSubmitting(false); setStage('')
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
                  <Input type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={e => setF('phone', e.target.value.replace(/\D/g,''))} placeholder="10-digit mobile" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div className="md:col-span-2">
                  <Label>Address Line 1 *</Label>
                  <Input value={form.address_1} onChange={e => setF('address_1', e.target.value)} placeholder="House no, street" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div className="md:col-span-2">
                  <Label>Address Line 2</Label>
                  <Input value={form.address_2} onChange={e => setF('address_2', e.target.value)} placeholder="Apartment, area (optional)" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div className="md:col-span-2">
                  <Label>Pincode *</Label>
                  <Input inputMode="numeric" maxLength={6} value={form.postcode} onChange={handlePincodeChange} placeholder="Enter 6-digit pincode" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                  <p className="text-[10px] text-muted-foreground mt-1">City and State will autofill</p>
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={form.city} onChange={e => setF('city', e.target.value)} className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
                <div>
                  <Label>State *</Label>
                  <Select value={form.state} onValueChange={v => setF('state', v)}>
                    <SelectTrigger className="mt-1 bg-stone-50 border-stone-200"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Order Notes</Label>
                  <Textarea value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Any special instructions for your order (optional)" className="mt-1 bg-stone-50 border-stone-200 focus-visible:ring-saffron-500" />
                </div>
              </div>

              <div className="mt-8 p-5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-saffron-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-maroon-500">Direct &amp; Secure Razorpay Payment</p>
                    <p className="text-xs text-muted-foreground mt-1">Razorpay opens instantly after you click Pay. UPI, Cards, NetBanking, Wallets supported. Your card details never touch this server.</p>
                  </div>
                </div>
              </div>

              <Button onClick={handlePlaceOrder} disabled={submitting}
                className="w-full mt-5 bg-saffron-500 hover:bg-saffron-600 text-white py-7 text-base font-semibold shadow-lg shadow-saffron-200">
                {submitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {stageLabel}</>
                  : <><CreditCard className="w-4 h-4 mr-2" /> Pay ₹{finalTotal.toFixed(0)} Securely</>}
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3">
                <ShieldCheck className="w-3 h-3" /> 256-bit SSL · PCI-DSS compliant payment by Razorpay
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
                      const key = cartKey(it.product_id, it.variation_id)
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

                  {/* Coupon Card */}
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
                          <p className="font-semibold text-emerald-700">Coupon applied: {appliedCoupon.code}</p>
                          <p className="text-[10px] text-emerald-600">₹{couponDiscount.toFixed(0)} discount applied to order</p>
                        </div>
                        <Button
                          onClick={() => {
                            setAppliedCoupon(null)
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
                    const displayDiscountDiff = displayRegularSubtotal - displaySubtotal
                    return (
                      <div className="border-t border-stone-200 mt-5 pt-4 space-y-2 text-sm text-stone-600">
                        <div className="flex justify-between">
                          <span>Subtotal (MRP)</span>
                          <span className="text-stone-800 font-medium">₹{displayRegularSubtotal.toFixed(0)}</span>
                        </div>
                        {displayDiscountDiff > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Product Discount</span>
                            <span>-₹{displayDiscountDiff.toFixed(0)}</span>
                          </div>
                        )}
                        {couponDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Coupon Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
                            <span>-₹{couponDiscount.toFixed(0)}</span>
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
                        {(displayDiscountDiff > 0 || couponDiscount > 0) && (
                          <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2.5 px-3 rounded-lg text-center mt-3 border border-emerald-100/60">
                            Congratulations! You saved ₹{(displayDiscountDiff + couponDiscount).toFixed(0)} ({Math.round(((displayDiscountDiff + couponDiscount) / displayRegularSubtotal) * 100)}%) on this order!
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
