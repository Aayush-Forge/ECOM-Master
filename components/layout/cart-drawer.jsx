'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'
import { Minus, Plus, Trash2, Flame, Sparkles } from 'lucide-react'

export default function CartDrawer() {
  const { items, isOpen, closeDrawer, removeItem, updateQuantity, subtotal, cartKey } = useCart()

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col border-l border-stone-200">
        <div className="px-6 py-5 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-saffron-600" />
            <h2 className="font-display text-xl text-maroon-500">Your Cart</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 text-[#D7A65B] mb-4 animate-flicker flex items-center justify-center bg-[#6B1024]/10 rounded-full">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-display text-lg text-maroon-500">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-2 italic">Add products to begin your ritual journey.</p>
            <Button asChild onClick={closeDrawer} className="mt-6 bg-saffron-500 hover:bg-saffron-600 text-white">
              <Link href="/products">Explore Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map(item => {
                const key = cartKey(item.product_id, item.variation_id)
                const hasDiscount = item.regular_price > item.price
                return (
                  <div key={key} className="flex gap-3 pb-4 border-b border-stone-100 animate-fade-in">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-50 flex-shrink-0 border border-stone-150">
                      {item.image && <Image src={item.image} alt={item.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-midnight line-clamp-2">{item.name}</p>
                      {item.attrs?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.attrs.map(a => `${a.name}: ${a.option}`).join(' · ')}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-stone-200 rounded-full bg-stone-50">
                          <button onClick={() => updateQuantity(key, item.quantity - 1)} className="p-1.5 hover:bg-stone-100 rounded-l-full"><Minus className="w-3 h-3" /></button>
                          <span className="px-2 text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(key, item.quantity + 1)} className="p-1.5 hover:bg-stone-100 rounded-r-full"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1.5 justify-end">
                            {hasDiscount && (
                              <span className="text-xs text-muted-foreground line-through">₹{(item.regular_price * item.quantity).toFixed(0)}</span>
                            )}
                            <p className="font-bold text-saffron-600">₹{(item.price * item.quantity).toFixed(0)}</p>
                          </div>
                          {hasDiscount && (
                            <p className="text-[10px] text-emerald-600 font-bold">
                              Saved ₹{((item.regular_price - item.price) * item.quantity).toFixed(0)} ({Math.round(((item.regular_price - item.price) / item.regular_price) * 100)}%)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeItem(key)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            {(() => {
              const totalRegular = items.reduce((s, i) => s + (i.regular_price || i.price) * i.quantity, 0)
              const totalSaved = totalRegular - subtotal
              return (
                <div className="border-t border-stone-200 p-6 bg-stone-50/50 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (MRP)</span>
                      <span>₹{totalRegular.toFixed(0)}</span>
                    </div>
                    {totalSaved > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Product Discount</span>
                        <span>-₹{totalSaved.toFixed(0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-stone-200 text-midnight font-bold">
                      <span>Subtotal</span>
                      <span className="text-saffron-600">₹{subtotal.toFixed(0)}</span>
                    </div>
                  </div>

                  {totalSaved > 0 && (
                    <div className="bg-emerald-50 text-emerald-700 text-xs font-bold py-2 px-3 rounded text-center">
                      You are saving ₹{totalSaved.toFixed(0)} on this order!
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center">Shipping calculated at checkout</p>
                  <Button asChild onClick={closeDrawer} className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-semibold py-6 text-base">
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                  <Button asChild variant="ghost" onClick={closeDrawer} className="w-full text-maroon-500 mt-2">
                    <Link href="/products">Continue Shopping</Link>
                  </Button>
                </div>
              )
            })()}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
