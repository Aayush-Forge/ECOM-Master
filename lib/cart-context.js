'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

// Build a stable cart-key combining product_id and variation_id (if any)
function cartKey(product_id, variation_id) {
  return variation_id ? `${product_id}:${variation_id}` : `${product_id}`
}

export default function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sridattam_cart_v2')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
    setHydrated(true)
    const handler = (e) => {
      if (e.key === 'sridattam_cart_v2' && e.newValue) {
        try { setItems(JSON.parse(e.newValue)) } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem('sridattam_cart_v2', JSON.stringify(items))
      } catch (err) {
        console.error('Failed to save cart to localStorage:', err)
        try {
          // Attempt to free up storage by clearing non-essential history/cache keys
          localStorage.removeItem('sd_viewed_history')
          localStorage.removeItem('sd_preferred_categories')
          localStorage.setItem('sridattam_cart_v2', JSON.stringify(items))
        } catch (innerErr) {
          console.error('Critical localStorage quota exceeded:', innerErr)
        }
      }
    }
  }, [items, hydrated])

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

  // Sync pricing and auto-heal missing regular_price for items in cart
  useEffect(() => {
    if (!hydrated || items.length === 0) return

    let active = true

    fetch(`${BACKEND_URL}/all-products?per_page=100`)
      .then(r => r.json())
      .then(res => {
        if (!active) return
        const products = Array.isArray(res) ? res : res?.data || []
        if (!Array.isArray(products) || products.length === 0) return

        setItems(prev => {
          let changed = false
          const next = prev.map(item => {
            const match = products.find(p => p.id === item.product_id || p.slug === item.slug)
            if (match) {
              const base = Number(match.basePrice ?? match.price ?? 0)
              const sale = match.salePrice != null ? Number(match.salePrice) : null
              const selPrice = sale !== null && sale > 0 ? sale : base
              const regPrice = base > 0 ? base : selPrice

              if (item.regular_price !== regPrice || item.price !== selPrice) {
                changed = true
                return { ...item, regular_price: regPrice, price: selPrice }
              }
            }
            return item
          })
          return changed ? next : prev
        })
      })
      .catch(console.error)

    return () => { active = false }
  }, [hydrated])

  // entry: { product_id, productId, variation_id?, name, slug, price, image, attrs?: [{name,option}], quantity }
  const addItem = useCallback((entry, qty = 1) => {
    const pId = entry.product_id || entry.productId || entry.id
    setItems(prev => {
      const key = cartKey(pId, entry.variation_id)
      const idx = prev.findIndex(i => cartKey(i.product_id, i.variation_id) === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
        return next
      }
      return [...prev, {
        product_id: pId,
        productId: pId,
        variation_id: entry.variation_id || null,
        name: entry.name || entry.title || '',
        slug: entry.slug,
        price: Number(entry.price) || 0,
        regular_price: Number(entry.regular_price) || Number(entry.price) || 0,
        image: entry.image || (entry.images?.[0]?.src || entry.images?.[0]) || null,
        weight: Number(entry.weight) || 0,
        attrs: entry.attrs || [],
        quantity: qty
      }]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(i => cartKey(i.product_id, i.variation_id) !== key))
  }, [])

  const updateQuantity = useCallback((key, qty) => {
    if (qty <= 0) { removeItem(key); return }
    setItems(prev => prev.map(i => cartKey(i.product_id, i.variation_id) === key ? { ...i, quantity: qty } : i))
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])
  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, isOpen, hydrated,
      addItem, removeItem, updateQuantity, clearCart,
      openDrawer, closeDrawer,
      totalItems, subtotal, cartKey
    }}>
      {children}
    </CartContext.Provider>
  )
}
