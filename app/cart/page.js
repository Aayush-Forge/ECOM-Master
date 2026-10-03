'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, Trash2, ShoppingBag, ShieldCheck, Truck, Flame, Sparkles, Tag, Check, X } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'

function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    subtotal,
    discountTotal,
    shippingTotal,
    grandTotal,
    appliedCouponCode,
    applyCoupon,
    removeCoupon,
    hasIssues,
    hydrated,
    cartKey,
  } = useCart()

  const [inputCode, setInputCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  const handleApply = async () => {
    if (!inputCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      await applyCoupon(inputCode)
      toast.success(`Coupon "${inputCode.trim().toUpperCase()}" applied!`)
      setInputCode('')
    } catch (err) {
      const msg = err.message || 'Failed to apply coupon'
      setCouponError(msg)
      toast.error(msg)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemove = async () => {
    try {
      await removeCoupon()
      toast.info('Coupon removed')
      setCouponError('')
    } catch {}
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <div className="py-12">
        <div className="container">
          <div className="text-center mb-10">
            <p className="text-gold-700 text-sm tracking-[0.2em]">SHOPPING CART</p>
            <h1 className="font-display text-4xl md:text-5xl text-maroon-500 mt-1">Your Cart</h1>
          </div>

          {!hydrated ? null : items.length === 0 ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto text-[#D7A65B] mb-4 animate-flicker flex items-center justify-center bg-[#6B1024]/10 rounded-full">
                <Sparkles className="w-8 h-8" />
              </div>
              <p className="font-display text-xl text-maroon-500">Your cart is empty</p>
              <p className="text-muted-foreground mt-2 italic">Add products to begin your ritual journey.</p>
              <Button asChild className="mt-6 bg-saffron-500 hover:bg-saffron-600 text-white px-8 py-6">
                <Link href="/products">Explore Premium Incense</Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_400px] gap-8">
              <div className="space-y-3">
                {hasIssues && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm mb-4">
                    Some items in your cart have stock or availability issues. Please review them below before proceeding.
                  </div>
                )}
                {items.map(item => {
                  const key = cartKey(item.product_id || item.productId, item.variation_id || item.variationId)
                  return (
                    <div key={key} className="bg-white border border-stone-200 rounded-xl p-4 flex gap-4 animate-fade-in">
                      <Link href={`/products/${item.slug}`} className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden bg-stone-50 flex-shrink-0 border border-stone-150">
                        {item.image && <Image src={item.image} alt={item.name} width={120} height={120} className="w-full h-full object-cover" unoptimized />}
                      </Link>
                      <div className="flex-1">
                        <Link href={`/products/${item.slug}`} className="font-medium text-midnight hover:text-saffron-600 line-clamp-2">{item.name}</Link>
                        {item.attrs?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">{item.attrs.map(a => `${a.name}: ${a.option || a.value}`).join(' · ')}</p>
                        )}
                        <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
                          <span className="text-sm text-muted-foreground">₹{item.price} each</span>
                          {item.regular_price > item.price && (
                            <>
                              <span className="text-xs text-muted-foreground/60 line-through">₹{item.regular_price}</span>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded-sm">
                                Save {Math.round(((item.regular_price - item.price) / item.regular_price) * 100)}%
                              </span>
                            </>
                          )}
                        </div>

                        {item.issues?.length > 0 && (
                          <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 space-y-0.5">
                            {item.issues.map((iss, idx) => (
                              <p key={idx} className="font-medium">
                                {iss.reason === 'out_of_stock'
                                  ? 'Item is currently out of stock'
                                  : iss.reason === 'insufficient_stock'
                                    ? `Only ${iss.availableQuantity} available in stock`
                                    : 'Item is currently unavailable'}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-stone-200 rounded-full bg-stone-50">
                            <button onClick={() => updateQuantity(key, item.quantity - 1)} className="p-2 hover:bg-stone-100 rounded-l-full"><Minus className="w-3 h-3" /></button>
                            <span className="px-3 font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(key, item.quantity + 1)} className="p-2 hover:bg-stone-100 rounded-r-full"><Plus className="w-3 h-3" /></button>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1.5 justify-end">
                              {item.regular_price > item.price && (
                                <span className="text-sm text-muted-foreground line-through">₹{(item.regular_price * item.quantity).toFixed(0)}</span>
                              )}
                              <p className="font-display text-xl text-saffron-600">₹{(item.price * item.quantity).toFixed(0)}</p>
                            </div>
                            {item.regular_price > item.price && (
                              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                                Saved ₹{((item.regular_price - item.price) * item.quantity).toFixed(0)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeItem(key)} className="text-muted-foreground hover:text-destructive self-start p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )
                })}
              </div>

              {(() => {
                const totalRegular = items.reduce((s, i) => s + (i.regular_price || i.price) * i.quantity, 0)
                const totalSaved = Math.max(0, totalRegular - subtotal + discountTotal)
                const finalPayable = grandTotal > 0 ? grandTotal : Math.max(0, subtotal - discountTotal + shippingTotal)

                return (
                  <aside className="lg:sticky lg:top-24 self-start">
                    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
                      <div>
                        <h2 className="font-display text-xl text-maroon-500 font-bold">Order Summary</h2>
                      </div>
                      {/* Coupon Code Section */}
                      <div className="border-t border-b border-stone-200 py-3 my-2">
                        {!appliedCouponCode ? (
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter coupon code"
                                value={inputCode}
                                onChange={(e) => {
                                  setInputCode(e.target.value.toUpperCase())
                                  setCouponError('')
                                }}
                                className="bg-stone-50 border-stone-200 text-xs h-9 uppercase"
                              />
                              <Button
                                onClick={handleApply}
                                disabled={couponLoading || !inputCode.trim()}
                                className="bg-maroon-500 hover:bg-maroon-600 text-white text-xs h-9 px-4 shrink-0"
                              >
                                {couponLoading ? '...' : 'Apply'}
                              </Button>
                            </div>
                            {couponError && (
                              <p className="text-xs text-rose-600 font-medium">{couponError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-emerald-800">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold font-mono">{appliedCouponCode}</span>
                              <span className="text-emerald-600">applied</span>
                            </div>
                            <button
                              onClick={handleRemove}
                              className="text-rose-600 hover:text-rose-800 text-xs font-semibold p-1 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">₹{subtotal.toFixed(0)}</span></div>
                        {discountTotal > 0 && (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span>{appliedCouponCode ? `Coupon (${appliedCouponCode}) & Offers` : 'Bundle & Offers Discount'}</span>
                            <span>-₹{discountTotal.toFixed(0)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <span>Shipping</span>
                          <span className="font-medium text-midnight">
                            {shippingTotal === 0 ? (
                              <span className="text-emerald-600 font-bold">FREE</span>
                            ) : (
                              `₹${shippingTotal.toFixed(0)}`
                            )}
                          </span>
                        </div>
                        <div className="border-t border-stone-200 pt-3 mt-3 flex justify-between">
                          <span className="font-display text-lg">Total</span>
                          <div className="text-right">
                            <span className="font-display text-2xl text-saffron-600">₹{finalPayable.toFixed(0)}</span>
                          </div>
                        </div>
                        {totalSaved > 0 && (
                          <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2.5 px-3 rounded-lg text-center mt-3 border border-emerald-100/60">
                            Congratulations! You save ₹{totalSaved.toFixed(0)} on this order!
                          </div>
                        )}
                      </div>
                      {hasIssues ? (
                        <div className="space-y-2">
                          <Button disabled className="w-full bg-stone-300 text-stone-500 py-6 text-base font-semibold cursor-not-allowed">
                            <ShoppingBag className="w-4 h-4 mr-2" /> Resolve Issues to Proceed
                          </Button>
                          <p className="text-xs text-amber-700 text-center">Remove or reduce quantity of out-of-stock items.</p>
                        </div>
                      ) : (
                        <Button asChild className="w-full bg-saffron-500 hover:bg-saffron-600 text-white py-6 text-base font-semibold">
                          <Link href="/checkout"><ShoppingBag className="w-4 h-4 mr-2" /> Proceed to Checkout</Link>
                        </Button>
                      )}
                      <Button asChild variant="ghost" className="w-full text-maroon-500">
                        <Link href="/products">Continue Shopping</Link>
                      </Button>
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-200">
                        {[{ i: ShieldCheck, t: 'Secure' }, { i: Flame, t: 'Pure' }, { i: Truck, t: 'Fast Ship' }].map(({ i: Icon, t }, k) => (
                          <div key={k} className="flex flex-col items-center gap-1">
                            <Icon className="w-5 h-5 text-saffron-600" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                )
              })()}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}

function App() { return <CartPage /> }
export default App
