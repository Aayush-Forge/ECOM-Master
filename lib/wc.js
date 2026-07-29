// Server-side WooCommerce REST API client.
// All requests use Basic Auth (Consumer Key + Secret) and run on the
// Next.js server only. Secrets are NEVER sent to the browser.

const wcCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

function wcConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_WC_BASE_URL &&
    process.env.WC_CONSUMER_KEY &&
    process.env.WC_CONSUMER_SECRET
  )
}

function clearWcCache() {
  wcCache.clear()
}


function authHeader() {
  const token = Buffer.from(
    `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
  ).toString('base64')
  return `Basic ${token}`
}

async function wcRequest(path, { method = 'GET', body, query } = {}) {
  if (!wcConfigured()) {
    const err = new Error('WooCommerce is not configured')
    err.code = 'WC_NOT_CONFIGURED'
    err.status = 503
    throw err
  }

  if (method !== 'GET') {
    wcCache.clear()
  }


  const isCacheable = method === 'GET' && !path.startsWith('/orders') && !path.startsWith('/coupons')

  if (isCacheable) {
    const sortedQuery = query ? Object.keys(query).sort().reduce((acc, k) => {
      acc[k] = query[k]
      return acc
    }, {}) : {}
    const cacheKey = `${path}:${JSON.stringify(sortedQuery)}`
    
    const cached = wcCache.get(cacheKey)
    const now = Date.now()
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.promise ? await cached.promise : cached.data
    }

    let resolvePromise, rejectPromise
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })

    wcCache.set(cacheKey, { promise, timestamp: now })

    try {
      const base = process.env.NEXT_PUBLIC_WC_BASE_URL.replace(/\/$/, '')
      let url = `${base}${path}`
      const params = new URLSearchParams()
      if (query && Object.keys(query).length) {
        for (const [k, v] of Object.entries(query)) {
          if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
        }
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader()
        },
        cache: 'no-store'
      })

      const text = await res.text()
      let data
      try { data = text ? JSON.parse(text) : null } catch { data = text }

      if (!res.ok) {
        const err = new Error(data?.message || `WooCommerce API error (${res.status})`)
        err.status = res.status
        err.data = data
        throw err
      }

      wcCache.set(cacheKey, { data, timestamp: Date.now(), promise: null })
      resolvePromise(data)
      return data
    } catch (err) {
      wcCache.delete(cacheKey)
      rejectPromise(err)
      throw err
    }
  }

  const base = process.env.NEXT_PUBLIC_WC_BASE_URL.replace(/\/$/, '')
  let url = `${base}${path}`
  const params = new URLSearchParams()
  if (query && Object.keys(query).length) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
    }
  }
  if (method === 'GET') {
    params.set('_t', String(Date.now()))
  }
  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader()
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  })

  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const err = new Error(data?.message || `WooCommerce API error (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function extractAcfImages(acf) {
  if (!acf || typeof acf !== 'object') return []
  const list = []
  for (const [key, value] of Object.entries(acf)) {
    if (value && typeof value === 'object') {
      if (typeof value.url === 'string' && value.url.startsWith('http')) {
        list.push({ src: value.url, alt: value.alt || '' })
      }
    } else if (typeof value === 'string' && value.startsWith('http') && /\.(jpeg|jpg|gif|png|webp)/i.test(value)) {
      list.push({ src: value, alt: '' })
    }
  }
  return list
}

// Sanitize product output for the client (strip server-only fields)
function safeProduct(p) {
  if (!p) return null
  
  const stdImages = (p.images || []).map(i => ({ src: i.src, alt: i.alt || '' }))
  const acfImages = extractAcfImages(p.acf)
  const seenUrls = new Set(stdImages.map(i => i.src))
  for (const img of acfImages) {
    if (!seenUrls.has(img.src)) {
      stdImages.push(img)
      seenUrls.add(img.src)
    }
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    permalink: p.permalink,
    price: p.price,
    regular_price: p.regular_price,
    sale_price: p.sale_price,
    on_sale: p.on_sale,
    price_html: p.price_html,
    description: p.description,
    short_description: p.short_description,
    sku: p.sku,
    stock_status: p.stock_status,
    featured: p.featured,
    weight: p.weight,
    images: stdImages,
    acf: p.acf || null,
    average_rating: p.average_rating,
    rating_count: p.rating_count,
    categories: (p.categories || []).map(c => ({ id: c.id, name: c.name, slug: c.slug })),
    attributes: (p.attributes || []).map(a => ({
      id: a.id, name: a.name, slug: a.slug,
      options: a.options || [],
      variation: a.variation,
      visible: a.visible
    })),
    default_attributes: p.default_attributes || [],
    variations: p.variations || [],
    related_ids: p.related_ids || []
  }
}

function safeVariation(v) {
  return {
    id: v.id,
    sku: v.sku,
    price: v.price,
    regular_price: v.regular_price,
    sale_price: v.sale_price,
    on_sale: v.on_sale,
    price_html: v.price_html,
    stock_status: v.stock_status,
    weight: v.weight,
    image: v.image ? { src: v.image.src, alt: v.image.alt } : null,
    attributes: (v.attributes || []).map(a => ({ id: a.id, name: a.name, option: a.option }))
  }
}

function safeCategory(c) {
  return { id: c.id, name: c.name, slug: c.slug, count: c.count, description: c.description || '', image: c.image ? { src: c.image.src } : null }
}

function extractTrackingInfo(metaData) {
  if (!Array.isArray(metaData)) return { number: null, link: null, provider: null }
  
  let number = null
  let link = null
  let provider = null

  // 1. Check for standard individual tracking keys
  for (const m of metaData) {
    const k = String(m.key || '')
    const v = typeof m.value === 'string' ? m.value.trim() : (m.value !== undefined && m.value !== null ? String(m.value) : '')
    if (!v) continue

    if (k === '_tracking_number' || k === 'tracking_number' || k === '_custom_tracking_number') {
      number = v
    } else if (k === '_tracking_link' || k === 'tracking_link' || k === '_custom_tracking_link' || k === 'tracking_url') {
      link = v
    } else if (k === '_tracking_provider' || k === 'tracking_provider' || k === '_custom_tracking_provider') {
      provider = v
    }
  }

  // 2. Check for AST _wc_shipment_tracking_items
  const astMeta = metaData.find(m => m.key === '_wc_shipment_tracking_items')
  if (astMeta && astMeta.value) {
    try {
      let items = astMeta.value
      if (typeof items === 'string') {
        items = JSON.parse(items)
      }
      if (Array.isArray(items) && items.length > 0) {
        const first = items[0]
        if (first.tracking_number) number = String(first.tracking_number)
        if (first.custom_tracking_link) {
          link = String(first.custom_tracking_link)
        } else if (first.tracking_link) {
          link = String(first.tracking_link)
        }
        if (first.tracking_provider) provider = String(first.tracking_provider)
      }
    } catch (e) {
      console.error('Failed to parse AST tracking metadata:', e)
    }
  }

  return { number, link, provider }
}

function safeOrder(o) {
  if (!o) return null
  const tracking = extractTrackingInfo(o.meta_data)
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    currency: o.currency,
    date_created: o.date_created,
    total: o.total,
    subtotal: (o.line_items || []).reduce((s, i) => s + parseFloat(i.subtotal || 0), 0).toFixed(2),
    shipping_total: o.shipping_total,
    discount_total: o.discount_total || '0.00',
    coupon_lines: (o.coupon_lines || []).map(cl => ({
      id: cl.id,
      code: cl.code,
      discount: cl.discount
    })),
    payment_method: o.payment_method,
    payment_method_title: o.payment_method_title,
    payment_url: o.payment_url,
    order_key: o.order_key,
    billing: o.billing,
    shipping: o.shipping,
    tracking_number: tracking.number,
    tracking_link: tracking.link,
    tracking_provider: tracking.provider,
    line_items: (o.line_items || []).map(li => {
      const regMeta = (li.meta_data || []).find(m => m.key === '_regular_price')
      const regularPrice = regMeta ? parseFloat(regMeta.value) : parseFloat(li.price)
      return {
        id: li.id,
        product_id: li.product_id,
        variation_id: li.variation_id || null,
        name: li.name,
        quantity: li.quantity,
        price: li.price,
        regular_price: regularPrice,
        subtotal: li.subtotal,
        total: li.total,
        image: li.image ? { src: li.image.src } : null,
        meta_data: (li.meta_data || []).filter(m => !m.key.startsWith('_')).map(m => ({ key: m.key, value: m.value }))
      }
    })
  }
}

async function fetchWpMedia(mediaId) {
  if (!mediaId) return null
  try {
    const base = process.env.NEXT_PUBLIC_WC_BASE_URL.replace(/\/wc\/v3\/?$/, '')
    const url = `${base}/wp/v2/media/${mediaId}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store'
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      url: data.source_url || data.guid?.rendered || '',
      alt: data.alt_text || data.title?.rendered || ''
    }
  } catch (e) {
    console.error('Error fetching media:', e)
    return null
  }
}

async function resolveProductAcf(p) {
  if (!p) return null
  
  const acf = { ...(p.acf || {}) }
  
  if (Array.isArray(p.meta_data)) {
    for (const item of p.meta_data) {
      if (item && item.key && typeof item.key === 'string') {
        if (item.key.startsWith('feature_image_') || item.key.startsWith('feature_text_')) {
          if (acf[item.key] === undefined) {
            acf[item.key] = item.value
          }
        }
      }
    }
  }
  
  const mediaKeys = Object.keys(acf).filter(k => k.startsWith('feature_image_'))
  
  await Promise.all(
    mediaKeys.map(async (key) => {
      const val = acf[key]
      if (val && (typeof val === 'number' || (typeof val === 'string' && /^\d+$/.test(val)))) {
        const resolved = await fetchWpMedia(val)
        if (resolved) {
          acf[key] = resolved
        }
      }
    })
  )
  
  return acf
}

module.exports = { wcConfigured, wcRequest, safeProduct, safeVariation, safeCategory, safeOrder, resolveProductAcf, clearWcCache }
