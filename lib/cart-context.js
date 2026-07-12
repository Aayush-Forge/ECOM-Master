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
    if (hydrated) localStorage.setItem('sridattam_cart_v2', JSON.stringify(items))
  }, [items, hydrated])

  // Sync pricing and auto-heal missing regular_price for items in cart
  useEffect(() => {
    if (!hydrated || items.length === 0) return
    const productIds = [...new Set(items.map(i => i.product_id))]
    if (productIds.length === 0) return

    let active = true

    // 1. Sync simple products
    fetch(`/api/products?include=${productIds.join(',')}&limit=100`)
      .then(r => r.json())
      .then(products => {
        if (!active || !Array.isArray(products)) return
        setItems(prev => {
          let changed = false
          const next = prev.map(item => {
            const match = products.find(p => p.id === item.product_id)
            if (match && !item.variation_id && match.type !== 'variable') {
              const regPrice = Number(match.regular_price) || Number(match.price) || 0
              const selPrice = Number(match.price) || 0
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

    // 2. Sync and heal variable products by fetching slug details (which contains variationsData)
    const variableItems = items.filter(i => i.variation_id)
    if (variableItems.length > 0) {
      const uniqueSlugs = [...new Set(variableItems.map(i => i.slug))]
      uniqueSlugs.forEach(slug => {
        fetch(`/api/products/${slug}`)
          .then(r => r.json())
          .then(data => {
            if (!active || !data || !Array.isArray(data.variationsData)) return
            setItems(prev => {
              let changed = false
              const next = prev.map(item => {
                if (item.slug === slug && item.variation_id) {
                  const vMatch = data.variationsData.find(v => v.id === item.variation_id)
                  if (vMatch) {
                    const regPrice = Number(vMatch.regular_price) || Number(vMatch.price) || 0
                    const selPrice = Number(vMatch.price) || 0
                    if (item.regular_price !== regPrice || item.price !== selPrice) {
                      changed = true
                      return { ...item, regular_price: regPrice, price: selPrice }
                    }
                  }
                }
                return item
              })
              return changed ? next : prev
            })
          })
          .catch(console.error)
      })
    }

    return () => { active = false }
  }, [hydrated])

  // entry: { product_id, variation_id?, name, slug, price, image, attrs?: [{name,option}], quantity }
  const addItem = useCallback((entry, qty = 1) => {
    setItems(prev => {
      const key = cartKey(entry.product_id, entry.variation_id)
      const idx = prev.findIndex(i => cartKey(i.product_id, i.variation_id) === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
        return next
      }
      return [...prev, {
        product_id: entry.product_id,
        variation_id: entry.variation_id || null,
        name: entry.name,
        slug: entry.slug,
        price: Number(entry.price) || 0,
        regular_price: Number(entry.regular_price) || Number(entry.price) || 0,
        image: entry.image || null,
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
