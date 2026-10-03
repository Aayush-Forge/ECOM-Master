const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

function getAuthHeader() {
  if (typeof window === 'undefined') return {}
  try {
    const authData = localStorage.getItem('sridattam_auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      const token = parsed.token || parsed.access_token
      if (token) return { Authorization: `Bearer ${token}` }
    }
  } catch {}
  return {}
}

export async function createServerCart() {
  const res = await fetch(`${BACKEND_URL}/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  if (!res.ok) throw new Error('Failed to create server cart')
  return res.json()
}

export async function getServerCart(cartId, cartToken, couponCode) {
  if (!cartId) return null
  const headers = { ...getAuthHeader() }
  if (cartToken) headers['x-cart-token'] = cartToken

  const url = new URL(`${BACKEND_URL}/cart/${cartId}`)
  if (couponCode && couponCode.trim()) {
    url.searchParams.set('couponCode', couponCode.trim())
  }

  const res = await fetch(url.toString(), {
    headers,
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch server cart')
  return res.json()
}

export async function addServerCartItem(cartId, cartToken, { productId, variationId, quantity }) {
  if (!cartId) return null
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  }
  if (cartToken) headers['x-cart-token'] = cartToken

  const res = await fetch(`${BACKEND_URL}/cart/${cartId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId,
      variationId: variationId || undefined,
      quantity: Number(quantity) || 1,
    }),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to add item to cart')
  }
  return res.json()
}

export async function updateServerCartItem(cartId, cartToken, itemId, quantity) {
  if (!cartId) return null
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  }
  if (cartToken) headers['x-cart-token'] = cartToken

  const res = await fetch(`${BACKEND_URL}/cart/${cartId}/items/${itemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ quantity: Number(quantity) }),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to update cart item')
  }
  return res.json()
}

export async function removeServerCartItem(cartId, cartToken, itemId) {
  if (!cartId) return null
  const headers = { ...getAuthHeader() }
  if (cartToken) headers['x-cart-token'] = cartToken

  const res = await fetch(`${BACKEND_URL}/cart/${cartId}/items/${itemId}`, {
    method: 'DELETE',
    headers,
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to remove cart item')
  }
  return res.json()
}
