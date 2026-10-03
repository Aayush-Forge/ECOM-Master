'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  createServerCart,
  getServerCart,
  addServerCartItem,
  updateServerCartItem,
  removeServerCartItem,
} from '@/lib/api/cart'

const CartContext = createContext(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function cartKey(product_id, variation_id) {
  return variation_id ? `${product_id}:${variation_id}` : `${product_id}`
}

const CART_META_KEY = 'sridattam_cart_meta'
const OLD_CART_KEY = 'sridattam_cart_v2'
const CART_COUPON_KEY = 'sridattam_coupon_code'

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const cartTokenRef = useRef(null)

  const saveMeta = (id, token) => {
    try {
      if (id && token) {
        localStorage.setItem(CART_META_KEY, JSON.stringify({ cartId: id, cartToken: token }))
      } else {
        localStorage.removeItem(CART_META_KEY)
      }
    } catch {}
  }

  const loadMeta = () => {
    try {
      const saved = localStorage.getItem(CART_META_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  }

  const initCart = useCallback(async () => {
    try {
      // 1. Check for legacy localStorage cart items to migrate
      let oldItems = []
      try {
        const oldSaved = localStorage.getItem(OLD_CART_KEY)
        if (oldSaved) {
          oldItems = JSON.parse(oldSaved)
        }
      } catch {}

      if (Array.isArray(oldItems) && oldItems.length > 0) {
        const newCart = await createServerCart()
        cartTokenRef.current = newCart.token
        saveMeta(newCart.id, newCart.token)

        let latest = newCart
        for (const it of oldItems) {
          const pId = it.product_id || it.productId || it.id
          const vId = it.variation_id || it.variationId || null
          const qty = Number(it.quantity) || 1
          if (pId) {
            try {
              const res = await addServerCartItem(newCart.id, newCart.token, {
                productId: pId,
                variationId: vId,
                quantity: qty,
              })
              if (res) latest = res
            } catch {}
          }
        }
        try { localStorage.removeItem(OLD_CART_KEY) } catch {}
        setCart(latest)
        setHydrated(true)
        return
      }

      // 2. Load existing server cart from meta
      const savedCode = localStorage.getItem(CART_COUPON_KEY) || ''
      if (savedCode) setCouponCode(savedCode)

      const meta = loadMeta()
      if (meta?.cartId && meta?.cartToken) {
        cartTokenRef.current = meta.cartToken
        const serverCart = await getServerCart(meta.cartId, meta.cartToken, savedCode)
        if (serverCart && serverCart.status !== 'converted') {
          setCart(serverCart)
          setHydrated(true)
          return
        }
      }

      // 3. Fallback: start a new empty cart
      const freshCart = await createServerCart()
      cartTokenRef.current = freshCart.token
      saveMeta(freshCart.id, freshCart.token)
      setCart(freshCart)
    } catch (err) {
      console.error('Failed to initialize cart:', err)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    initCart()
  }, [initCart])

  const ensureActiveCart = async () => {
    if (cart?.id && cartTokenRef.current && cart.status !== 'converted') {
      return { cartId: cart.id, cartToken: cartTokenRef.current }
    }
    const freshCart = await createServerCart()
    cartTokenRef.current = freshCart.token
    saveMeta(freshCart.id, freshCart.token)
    setCart(freshCart)
    return { cartId: freshCart.id, cartToken: freshCart.token }
  }

  const addItem = useCallback(async (entry, qty = 1) => {
    try {
      const { cartId, cartToken } = await ensureActiveCart()
      const pId = entry.product_id || entry.productId || entry.id
      const vId = entry.variation_id || entry.variationId || null
      const updated = await addServerCartItem(cartId, cartToken, {
        productId: pId,
        variationId: vId,
        quantity: Number(qty) || 1,
      })
      if (updated) {
        setCart(updated)
      }
      return updated
    } catch (err) {
      console.error('Failed to add item to server cart:', err)
      throw err
    }
  }, [cart])

  const findItem = (keyOrId, itemsList = []) => {
    return itemsList.find(
      i => i.id === keyOrId ||
        cartKey(i.productId || i.product_id, i.variationId || i.variation_id) === keyOrId
    )
  }

  const removeItem = useCallback(async (keyOrId) => {
    if (!cart?.id || !cartTokenRef.current) return
    const item = findItem(keyOrId, cart.items || [])
    if (!item) return

    try {
      const updated = await removeServerCartItem(cart.id, cartTokenRef.current, item.id)
      if (updated) setCart(updated)
    } catch (err) {
      console.error('Failed to remove item from server cart:', err)
    }
  }, [cart])

  const updateQuantity = useCallback(async (keyOrId, qty) => {
    if (!cart?.id || !cartTokenRef.current) return
    const item = findItem(keyOrId, cart.items || [])
    if (!item) return

    if (qty <= 0) {
      return removeItem(keyOrId)
    }

    try {
      const updated = await updateServerCartItem(cart.id, cartTokenRef.current, item.id, qty)
      if (updated) setCart(updated)
    } catch (err) {
      console.error('Failed to update item quantity in server cart:', err)
    }
  }, [cart, removeItem])

  const clearCart = useCallback(async () => {
    saveMeta(null, null)
    cartTokenRef.current = null
    try {
      const freshCart = await createServerCart()
      cartTokenRef.current = freshCart.token
      saveMeta(freshCart.id, freshCart.token)
      setCart(freshCart)
    } catch {
      setCart(null)
    }
  }, [])

  const refreshCart = useCallback(async () => {
    if (!cart?.id || !cartTokenRef.current) {
      return ensureActiveCart()
    }
    try {
      const updated = await getServerCart(cart.id, cartTokenRef.current, couponCode)
      if (updated && updated.status !== 'converted') {
        setCart(updated)
        return updated
      }
      // If 404 or converted, start fresh
      const freshCart = await createServerCart()
      cartTokenRef.current = freshCart.token
      saveMeta(freshCart.id, freshCart.token)
      setCart(freshCart)
      return freshCart
    } catch {
      return cart
    }
  }, [cart, couponCode])

  const applyCoupon = useCallback(async (code) => {
    const trimmed = (code || '').trim().toUpperCase()
    if (!trimmed) throw new Error('Please enter a coupon code')
    if (!cart?.id || !cartTokenRef.current) {
      await ensureActiveCart()
    }
    const updated = await getServerCart(cart.id, cartTokenRef.current, trimmed)
    if (!updated) throw new Error('Could not validate coupon')
    if (!updated.appliedCouponCode) {
      throw new Error('Coupon code is not applicable to the items in your cart')
    }
    setCouponCode(trimmed)
    try { localStorage.setItem(CART_COUPON_KEY, trimmed) } catch {}
    setCart(updated)
    return updated
  }, [cart])

  const removeCoupon = useCallback(async () => {
    setCouponCode('')
    try { localStorage.removeItem(CART_COUPON_KEY) } catch {}
    if (cart?.id && cartTokenRef.current) {
      const updated = await getServerCart(cart.id, cartTokenRef.current, '')
      if (updated) setCart(updated)
    }
  }, [cart])

  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])

  const items = cart?.items || []
  const totalItems = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
  const subtotal = Number(cart?.subtotal || 0)
  const discountTotal = Number(cart?.discountTotal || 0)
  const shippingTotal = Number(cart?.shippingTotal || 0)
  const taxTotal = Number(cart?.taxTotal || 0)
  const grandTotal = Number(cart?.grandTotal || 0)
  const appliedCouponCode = cart?.appliedCouponCode || null
  const hasIssues = items.some(i => Array.isArray(i.issues) && i.issues.length > 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        cartId: cart?.id || null,
        cartToken: cartTokenRef.current,
        items,
        isOpen,
        hydrated,
        couponCode,
        appliedCouponCode,
        applyCoupon,
        removeCoupon,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        openDrawer,
        closeDrawer,
        totalItems,
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        grandTotal,
        hasIssues,
        cartKey,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
