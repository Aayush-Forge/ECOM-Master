export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { wcConfigured, wcRequest, safeProduct, safeVariation, safeCategory, safeOrder, resolveProductAcf, clearWcCache } from '@/lib/wc'
import { findCouponByCode } from '@/lib/coupons'
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'

const RICH_FALLBACK_CATEGORIES = [
  { id: 1, name: 'Mysore Sandalwood', slug: 'sandalwood', count: 6, description: 'Premium slow-burning natural Mysore sandalwood formulations.', image: { src: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80' } },
  { id: 2, name: 'Floral Notes', slug: 'floral', count: 5, description: 'Velvety damask rose, Mogra jasmine and garden flora.', image: { src: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80' } },
  { id: 3, name: 'Sacred Resins', slug: 'resins', count: 4, description: 'Oman frankincense, Loban and golden guggulu gum crystals.', image: { src: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&w=600&q=80' } },
  { id: 4, name: 'Wood Samidha', slug: 'samidha', count: 4, description: 'Aromatic mango logs pre-soaked in Desi ghee & honey.', image: { src: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80' } },
  { id: 5, name: 'Pure Camphor', slug: 'camphor', count: 3, description: 'Pure Bhimseni camphor crystals for daily cleanses.', image: { src: 'https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80' } },
  { id: 6, name: 'Luxury Bundles', slug: 'combos', count: 6, description: 'Curated wellness bundles and starter sets.', image: { src: 'https://images.unsplash.com/photo-1617954095840-0427f79be4cf?auto=format&fit=crop&w=600&q=80' } },
  { id: 7, name: 'Incense Sticks', slug: 'incense-sticks', count: 8, description: 'Pure wood base and botanical flower fragrances.', image: { src: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=600&q=80' } },
]

async function getFallbackProducts(q = {}) {
  let list = []
  try {
    const res = await fetch('http://localhost:5000/products', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        list = data
      }
    }
  } catch (e) {
    // backend unreachable, fallback to seed
  }

  if (list.length === 0) {
    list = [...SEED_PRODUCTS]
  }

  // Filter by category
  if (q.category) {
    const cat = String(q.category).toLowerCase()
    list = list.filter(p => {
      const cats = Array.isArray(p.categories)
        ? p.categories.map(c => (typeof c === 'string' ? c.toLowerCase() : c.slug?.toLowerCase()))
        : []
      return cats.includes(cat) || cats.some(c => c && c.includes(cat))
    })
  }

  // Filter by search
  if (q.search) {
    const term = String(q.search).toLowerCase()
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    )
  }

  // Filter by featured
  if (q.featured) {
    list = list.filter(p => !!p.featured)
  }

  // Filter by include
  if (q.include) {
    const ids = String(q.include).split(',').map(s => s.trim().toLowerCase())
    list = list.filter(p => ids.includes(String(p.id).toLowerCase()) || ids.includes(String(p.slug).toLowerCase()))
  }

  // Sorting
  if (q.orderby === 'price') {
    list.sort((a, b) => {
      const pa = parseFloat(a.price) || 0
      const pb = parseFloat(b.price) || 0
      return q.order === 'asc' ? pa - pb : pb - pa
    })
  } else if (q.orderby === 'popularity' || q.orderby === 'rating') {
    list.sort((a, b) => (parseFloat(b.average_rating) || 0) - (parseFloat(a.average_rating) || 0))
  }

  // Pagination
  const page = q.page || 1
  const perPage = q.per_page || 20
  const start = (page - 1) * perPage
  const paginated = list.slice(start, start + perPage)

  return paginated.map(safeProduct)
}

async function getFallbackSingleProduct(slug) {
  try {
    const res = await fetch(`http://localhost:5000/products/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data && data.id) {
        return { ...safeProduct(data), variationsData: [], related: [] }
      }
    }
  } catch {}

  const found = SEED_PRODUCTS.find(p => p.slug === slug || String(p.id) === slug)
  if (found) {
    const related = SEED_PRODUCTS.filter(p => p.id !== found.id).slice(0, 4).map(safeProduct)
    return { ...safeProduct(found), variationsData: [], related }
  }
  return null
}

const CORS_ORIGINS = process.env.CORS_ORIGINS || '*'

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', CORS_ORIGINS)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}


function json(data, status = 200) { return cors(NextResponse.json(data, { status })) }
function err(message, status = 400, code) { return json({ error: message, code }, status) }

export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

// ----- Validators -----
// Allow any Unicode letter/digit/mark/hyphen so slugs in Kannada/Hindi/Tamil/etc. work.
const SLUG_RE = /^[\p{L}\p{M}\p{N}_-]{1,200}$/u
const ID_RE = /^[0-9]{1,12}$/
const KEY_RE = /^wc_order_[A-Za-z0-9]{6,40}$/

function sanitizeBilling(input) {
  if (!input || typeof input !== 'object') return null
  const get = (k, max = 200) => String(input[k] || '').trim().slice(0, max)
  const required = ['first_name', 'last_name', 'address_1', 'city', 'state', 'postcode', 'email', 'phone']
  const out = {
    first_name: get('first_name', 60),
    last_name: get('last_name', 60),
    address_1: get('address_1', 200),
    address_2: get('address_2', 200),
    city: get('city', 80),
    state: get('state', 80),
    postcode: get('postcode', 12),
    country: get('country', 2) || 'IN',
    email: get('email', 120),
    phone: get('phone', 20)
  }
  for (const r of required) if (!out[r]) return null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) return null
  if (!/^[0-9]{6}$/.test(out.postcode)) return null
  if (!/^[0-9]{10}$/.test(out.phone.replace(/\D/g, ''))) return null
  return out
}

function sanitizeLineItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) return null
  const out = []
  for (const i of items) {
    const product_id = parseInt(i.product_id, 10)
    const quantity = parseInt(i.quantity, 10)
    if (!product_id || product_id <= 0 || !quantity || quantity <= 0 || quantity > 999) return null
    const li = { product_id, quantity }
    if (i.variation_id) {
      const vid = parseInt(i.variation_id, 10)
      if (vid > 0) li.variation_id = vid
    }
    if (Array.isArray(i.meta_data)) {
      li.meta_data = i.meta_data.map(m => ({
        key: String(m.key || ''),
        value: String(m.value || '')
      })).filter(m => m.key !== '')
    }
    out.push(li)
  }
  return out
}

function sanitizeCouponLines(coupons) {
  if (!coupons || !Array.isArray(coupons)) return undefined
  const out = []
  for (const c of coupons) {
    if (c && typeof c === 'object' && c.code) {
      const code = String(c.code).trim().slice(0, 100)
      if (code) {
        out.push({ code })
      }
    }
  }
  return out.length > 0 ? out : undefined
}

// ----- Router -----
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    // Health
    if ((route === '/' || route === '/root' || route === '/health') && method === 'GET') {
      return json({ ok: true, wc_configured: wcConfigured() })
    }

    // ---- VALIDATE COUPON ----
    if (route === '/coupons/validate' && method === 'POST') {
      let body
      try { body = await request.json() } catch { return err('Invalid JSON', 400) }
      const code = String(body.code || '').trim()
      if (!code) return err('Coupon code is required', 400)

      // 1. If WooCommerce is configured, try fetching live WooCommerce coupon
      if (wcConfigured()) {
        try {
          const list = await wcRequest('/coupons', { query: { code: code.toLowerCase() } })
          const coupon = (list || []).find(c => String(c.code).toLowerCase() === code.toLowerCase())
          if (coupon) {
            const now = new Date()
            if (coupon.date_expires) {
              const expires = new Date(coupon.date_expires)
              if (expires < now) {
                return err('This coupon has expired.', 400)
              }
            }

            if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
              return err('This coupon has reached its usage limit.', 400)
            }

            return json({
              id: coupon.id,
              code: coupon.code,
              discount_type: coupon.discount_type,
              amount: coupon.amount,
              minimum_amount: coupon.minimum_amount,
              maximum_amount: coupon.maximum_amount,
              individual_use: coupon.individual_use,
              exclude_sale_items: coupon.exclude_sale_items,
              product_ids: coupon.product_ids || [],
              excluded_product_ids: coupon.excluded_product_ids || [],
              product_categories: coupon.product_categories || [],
              excluded_product_categories: coupon.excluded_product_categories || [],
              free_shipping: coupon.free_shipping
            })
          }
        } catch (e) {
          console.warn('WooCommerce coupon lookup error, checking active local catalog:', e?.message || e)
        }
      }

      // 2. Resilient Fallback to built-in Active Store Coupons
      const fallbackCoupon = findCouponByCode(code)
      if (fallbackCoupon) {
        return json({
          id: fallbackCoupon.id,
          code: fallbackCoupon.code,
          discount_type: fallbackCoupon.discount_type,
          amount: fallbackCoupon.amount,
          minimum_amount: fallbackCoupon.minimum_amount,
          maximum_amount: fallbackCoupon.maximum_amount,
          individual_use: fallbackCoupon.individual_use,
          exclude_sale_items: fallbackCoupon.exclude_sale_items,
          product_ids: fallbackCoupon.product_ids || [],
          excluded_product_ids: fallbackCoupon.excluded_product_ids || [],
          product_categories: fallbackCoupon.product_categories || [],
          excluded_product_categories: fallbackCoupon.excluded_product_categories || [],
          free_shipping: fallbackCoupon.free_shipping
        })
      }

      return err('Invalid coupon code. Try WELCOME10, DIWALI2026, or FESTIVE100.', 404)
    }

    // ---- PRODUCTS LIST ----
    if (route === '/products' && method === 'GET') {
      const u = new URL(request.url)
      const q = {
        per_page: Math.min(parseInt(u.searchParams.get('limit') || '20', 10), 100),
        page: Math.max(parseInt(u.searchParams.get('page') || '1', 10), 1),
        status: 'publish',
        category: u.searchParams.get('category') || undefined,
        search: u.searchParams.get('search') || undefined,
        featured: u.searchParams.get('featured') === 'true' ? 'true' : undefined,
        include: u.searchParams.get('include') || undefined,
        orderby: 'date', order: 'desc'
      }
      const sort = u.searchParams.get('sort')
      if (sort === 'price_asc') { q.orderby = 'price'; q.order = 'asc' }
      else if (sort === 'price_desc') { q.orderby = 'price'; q.order = 'desc' }
      else if (sort === 'newest') { q.orderby = 'date'; q.order = 'desc' }
      else if (sort === 'featured') { q.orderby = 'popularity'; q.order = 'desc' }

      if (wcConfigured()) {
        try {
          // category param: WC expects category ID, but we accept slug too. If slug, look it up.
          if (q.category && !/^[0-9]+$/.test(q.category)) {
            try {
              const cats = await wcRequest('/products/categories', { query: { slug: q.category } })
              q.category = cats?.[0]?.id ? String(cats[0].id) : undefined
            } catch { q.category = undefined }
          }

          const [products, reviews] = await Promise.all([
            wcRequest('/products', { query: q }),
            wcRequest('/products/reviews', { query: { per_page: 100 } }).catch(() => [])
          ])
          const reviewMap = {}

          if (Array.isArray(reviews)) {
            for (const r of reviews) {
              const pid = r.product_id
              if (!reviewMap[pid]) reviewMap[pid] = { sum: 0, count: 0 }
              reviewMap[pid].sum += r.rating
              reviewMap[pid].count += 1
            }
          }
          if (Array.isArray(products) && products.length > 0) {
            const safeProducts = products.map(p => {
              const stats = reviewMap[p.id]
              if (stats) {
                p.average_rating = String((stats.sum / stats.count).toFixed(2))
                p.rating_count = stats.count
              }
              return safeProduct(p)
            })
            return json(safeProducts)
          }
        } catch (e) {
          console.warn('WooCommerce products fetch failed, using backend/seed catalog:', e?.message || e)
        }
      }

      // Resilient Fallback to NestJS backend or seed catalog
      const fallbackProducts = await getFallbackProducts(q)
      return json(fallbackProducts)
    }

    // ---- PRODUCT REVIEWS ----
    if (route === '/products/reviews') {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      if (method === 'GET') {
        const u = new URL(request.url)
        const productId = u.searchParams.get('product')
        try {
          const targetUrl = productId ? backendUrl + '/reviews?productId=' + encodeURIComponent(productId) : backendUrl + '/reviews'
          const res = await fetch(targetUrl, {
            cache: 'no-store',
          })
          if (res.ok) {
            const raw = await res.json()
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
            const reviews = list.map(r => ({
              id: r.id,
              reviewer: r.customerName || 'Anonymous',
              review: r.description || '',
              rating: Number(r.stars) || 5,
              date_created: r.createdAt || new Date().toISOString(),
              product_id: r.productId,
              is_verified_buyer: r.isVerifiedBuyer ?? true,
            }))
            return json(reviews)
          }
        } catch {}
        if (wcConfigured()) {
          const q = { per_page: 100 }
          if (productId) q.product = productId
          const reviews = await wcRequest('/products/reviews', { query: q }).catch(() => [])
          return json(reviews)
        }
        return json([])
      }
      if (method === 'POST') {
        if (!wcConfigured()) return err('WooCommerce keys not configured', 503, 'WC_NOT_CONFIGURED')
        let body
        try { body = await request.json() } catch { return err('Invalid JSON', 400) }
        const { product_id, review, reviewer, rating, email, phone } = body || {}
        if (!product_id || !review || !reviewer || !rating) {
          return err('Missing required fields (product_id, review, reviewer, rating)', 400)
        }
        if (!email && !phone) {
          return err('Please provide the email or phone number used during your purchase to verify your delivery.', 400)
        }
        try {
          const res = await fetch(backendUrl + '/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: String(product_id),
              customerName: String(reviewer),
              description: String(review),
              stars: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
              email: email ? String(email).trim() : undefined,
              phone: phone ? String(phone).trim() : undefined,
            }),
          })
          if (res.ok) {
            const saved = await res.json()
            return json({
              id: saved.id,
              reviewer: saved.customerName,
              review: saved.description,
              rating: saved.stars,
              date_created: saved.createdAt,
              product_id: saved.productId,
              is_verified_buyer: saved.isVerifiedBuyer ?? true,
            })
          } else {
            const errBody = await res.json().catch(() => null)
            return err(errBody?.message || 'Failed to submit review', res.status)
          }
        } catch {
          return err('Failed to connect to backend review service', 502)
        }
      }
    }

    // ---- SINGLE PRODUCT (with variations) ----
    if (route.startsWith('/products/') && method === 'GET') {
      const slug = decodeURIComponent(route.replace('/products/', ''))
      if (!SLUG_RE.test(slug)) return err('Invalid product slug', 400)

      if (wcConfigured()) {
        try {
          const list = await wcRequest('/products', { query: { slug, status: 'publish' } })
          const product = list?.[0]
          if (product) {
            const [acf, reviews, variationsData, relatedData] = await Promise.all([
              resolveProductAcf(product),
              (async () => {
                try {
                  const bUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
                  const rRes = await fetch(bUrl + '/reviews?productId=' + encodeURIComponent(product.id), { cache: 'no-store' })
                  if (rRes.ok) {
                    const list = await rRes.json()
                    if (Array.isArray(list) && list.length > 0) {
                      return list.map(r => ({ rating: r.stars }))
                    }
                  }
                } catch {}
                return wcRequest('/products/reviews', { query: { product: product.id } }).catch(() => [])
              })(),
              (product.type === 'variable' && Array.isArray(product.variations) && product.variations.length)
                ? wcRequest(`/products/${product.id}/variations`, { query: { per_page: 100 } }).catch(() => [])
                : Promise.resolve([]),
              (Array.isArray(product.related_ids) && product.related_ids.length)
                ? wcRequest('/products', { query: { include: product.related_ids.slice(0, 6).join(','), per_page: 6 } }).catch(() => [])
                : Promise.resolve([])
            ])

            product.acf = acf
            if (Array.isArray(reviews) && reviews.length > 0) {
              const sum = reviews.reduce((s, r) => s + r.rating, 0)
              product.average_rating = String((sum / reviews.length).toFixed(2))
              product.rating_count = reviews.length
            } else {
              product.average_rating = '0.00'
              product.rating_count = 0
            }

            const variations = (variationsData || []).map(safeVariation)
            const related = (relatedData || []).map(safeProduct)

            return json({ ...safeProduct(product), variationsData: variations, related })
          }
        } catch (e) {
          console.warn('WC single product fetch failed, trying backend/seed fallback:', e?.message)
        }
      }

      // Resilient Fallback to NestJS backend or seed catalog
      const fallbackSingle = await getFallbackSingleProduct(slug)
      if (fallbackSingle) return json(fallbackSingle)

      return err('Product not found', 404)
    }

    // ---- CATEGORIES ----
    if (route === '/categories' && method === 'GET') {
      if (wcConfigured()) {
        try {
          const cats = await wcRequest('/products/categories', { query: { per_page: 100, hide_empty: 'true', orderby: 'count', order: 'desc' } })
          if (Array.isArray(cats) && cats.length > 0) {
            return json(cats.map(safeCategory))
          }
        } catch (e) {
          console.warn('WC categories fetch failed, using fallback categories:', e?.message)
        }
      }
      return json(RICH_FALLBACK_CATEGORIES)
    }

    // ---- ACTIVE CLUBBING RULE / CAMPAIGN ----
    if ((route === '/clubbing/active' || route === '/clubbing-rules/active') && method === 'GET') {
      try {
        const res = await fetch('http://localhost:5000/clubbing/active', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          return json(data)
        }
      } catch (e) {
        console.warn('Backend active clubbing fetch failed in route.js:', e?.message)
      }
      return json([])
    }

    // ---- CREATE ORDER (returns WC payment_url) ----
    if (route === '/orders' && method === 'POST') {
      if (!wcConfigured()) return err('WooCommerce keys not configured', 503, 'WC_NOT_CONFIGURED')

      let body
      try { body = await request.json() } catch { return err('Invalid JSON', 400) }

      const billing = sanitizeBilling(body.billing)
      if (!billing) return err('Please provide complete and valid billing details (name, email, 10-digit phone, address, city, state, 6-digit pincode).', 400)
      const line_items = sanitizeLineItems(body.line_items)
      if (!line_items) return err('Cart is empty or invalid.', 400)

      const customer_note = String(body.customer_note || '').slice(0, 1000)
      const shipping = sanitizeBilling(body.shipping || body.billing) || billing
      const shipping_lines = Array.isArray(body.shipping_lines) ? body.shipping_lines : []
      const coupon_lines = sanitizeCouponLines(body.coupon_lines)

      const payload = {
        status: 'pending',
        set_paid: false,
        billing,
        shipping,
        line_items,
        shipping_lines,
        coupon_lines,
        customer_note
      }

      const order = await wcRequest('/orders', { method: 'POST', body: payload })

      // Return ONLY what client needs for redirect to WC payment page.
      return json({
        id: order.id,
        number: order.number,
        order_key: order.order_key,
        payment_url: order.payment_url,
        total: order.total,
        currency: order.currency,
        status: order.status
      })
    }

    // ---- TRACK ORDER ----
    if (route === '/orders/track' && (method === 'POST' || method === 'GET')) {
      if (!wcConfigured()) return err('WooCommerce keys not configured', 503, 'WC_NOT_CONFIGURED')
      
      let orderId = ''
      let email = ''
      if (method === 'POST') {
        let body
        try { body = await request.json() } catch { return err('Invalid JSON', 400) }
        orderId = String(body.orderId || '').trim()
        email = String(body.email || '').trim()
      } else {
        const u = new URL(request.url)
        orderId = String(u.searchParams.get('orderId') || '').trim()
        email = String(u.searchParams.get('email') || '').trim()
      }

      if (!orderId || !ID_RE.test(orderId)) {
        return err('Please enter a valid numeric Order ID.', 400)
      }
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return err('Please enter a valid Email ID.', 400)
      }

      try {
        const order = await wcRequest(`/orders/${orderId}`)
        if (!order) {
          return err('Order number or billing email does not match.', 404)
        }
        
        const billingEmail = String(order.billing?.email || '').trim().toLowerCase()
        if (billingEmail !== email.toLowerCase()) {
          return err('Order number or billing email does not match.', 404)
        }
        
        return json(safeOrder(order))
      } catch (e) {
        console.error('Track order error:', e?.message || e)
        return err('Order number or billing email does not match.', 404)
      }
    }

    // ---- GET ORDER (requires order_key for security) ----
    if (route.startsWith('/orders/') && method === 'GET') {
      if (!wcConfigured()) return err('WooCommerce keys not configured', 503, 'WC_NOT_CONFIGURED')
      const id = route.replace('/orders/', '')
      if (!ID_RE.test(id)) return err('Invalid order id', 400)
      const u = new URL(request.url)
      const key = u.searchParams.get('key') || ''
      if (!KEY_RE.test(key)) return err('Order key required', 401)

      const order = await wcRequest(`/orders/${id}`)
      if (!order || order.order_key !== key) return err('Not authorized to view this order', 401)
      return json(safeOrder(order))
    }

    // ---- RAZORPAY: create payment order ----
    if (route === '/payment/create-rzp-order' && method === 'POST') {
      if (!wcConfigured()) return err('WooCommerce keys not configured', 503, 'WC_NOT_CONFIGURED')
      const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET
      if (!RZP_KEY || !RZP_SECRET) {
        return err('Razorpay keys not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to /app/.env then restart.', 503, 'RZP_NOT_CONFIGURED')
      }

      let body
      try { body = await request.json() } catch { return err('Invalid JSON', 400) }
      const { orderId, orderKey } = body || {}
      if (!ID_RE.test(String(orderId))) return err('Invalid order id', 400)
      if (!KEY_RE.test(String(orderKey || ''))) return err('Invalid order key', 401)

      // Fetch the WC order to get the authoritative amount
      const wcOrder = await wcRequest(`/orders/${orderId}`)
      if (!wcOrder || wcOrder.order_key !== orderKey) return err('Not authorized', 401)
      if (wcOrder.status === 'processing' || wcOrder.status === 'completed') {
        return err('Order is already paid', 400)
      }

      const amountPaise = Math.round(parseFloat(wcOrder.total) * 100)
      if (!amountPaise || amountPaise < 100) return err('Invalid order amount', 400)

      // Create Razorpay order
      const auth = Buffer.from(`${RZP_KEY}:${RZP_SECRET}`).toString('base64')
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: amountPaise,
          currency: wcOrder.currency || 'INR',
          receipt: `wc_${orderId}`,
          notes: { wc_order_id: String(orderId) }
        })
      })
      const rzpData = await rzpRes.json()
      if (!rzpRes.ok) {
        console.error('Razorpay order error:', rzpData)
        return err(rzpData?.error?.description || 'Could not create Razorpay order', 502)
      }

      return json({
        rzp_order_id: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        key_id: RZP_KEY,
        wc_order_id: orderId,
        prefill: {
          name: `${wcOrder.billing?.first_name || ''} ${wcOrder.billing?.last_name || ''}`.trim(),
          email: wcOrder.billing?.email || '',
          contact: wcOrder.billing?.phone || ''
        }
      })
    }

    // ---- RAZORPAY: verify payment + mark WC order paid ----
    if (route === '/payment/verify' && method === 'POST') {
      if (!wcConfigured()) return err('WooCommerce keys not configured', 503, 'WC_NOT_CONFIGURED')
      const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET
      if (!RZP_SECRET) return err('Razorpay secret not configured', 503, 'RZP_NOT_CONFIGURED')

      let body
      try { body = await request.json() } catch { return err('Invalid JSON', 400) }
      const { orderId, orderKey, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {}
      if (!ID_RE.test(String(orderId))) return err('Invalid order id', 400)
      if (!KEY_RE.test(String(orderKey || ''))) return err('Invalid order key', 401)
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return err('Missing payment payload', 400)
      }

      // HMAC SHA256 signature verification
      const crypto = require('crypto')
      const expected = crypto
        .createHmac('sha256', RZP_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')
      if (expected !== razorpay_signature) {
        return err('Payment signature verification failed', 400)
      }

      // Verify order key matches before mutating
      const wcOrder = await wcRequest(`/orders/${orderId}`)
      if (!wcOrder || wcOrder.order_key !== orderKey) return err('Not authorized', 401)

      // Mark WooCommerce order as paid
      try {
        await wcRequest(`/orders/${orderId}`, {
          method: 'PUT',
          body: {
            status: 'processing',
            set_paid: true,
            transaction_id: razorpay_payment_id,
            payment_method: 'razorpay',
            payment_method_title: 'Razorpay',
            meta_data: [
              { key: '_razorpay_payment_id', value: razorpay_payment_id },
              { key: '_razorpay_order_id', value: razorpay_order_id },
              { key: '_razorpay_signature', value: razorpay_signature }
            ]
          }
        })
      } catch (e) {
        console.error('WC update failed after RZP success:', e?.message)
        // Payment is verified; even if WC update fails we shouldn't fail the user.
      }

      return json({ success: true, orderId, orderKey })
    }

    return err(`Route ${route} not found`, 404)
  } catch (e) {
    console.error('API Error:', e?.code || '', e?.message || e)
    if (e?.code === 'WC_NOT_CONFIGURED') return err(e.message, 503, 'WC_NOT_CONFIGURED')
    if (e?.status) return err(e.message, e.status)
    return err('We could not complete this request. Please try again.', 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const OPTIONS_HANDLER = OPTIONS
