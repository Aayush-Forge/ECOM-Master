import { wcConfigured, wcRequest } from '@/lib/wc'

export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const baseUrl = 'https://sridattam.in'
  
  const routes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/track-order`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/refund-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms-conditions`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/shipping-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  if (!wcConfigured()) {
    return routes
  }

  try {
    // 1. Fetch publish status products
    const products = await wcRequest('/products', { query: { status: 'publish', per_page: 100 } })
    if (Array.isArray(products)) {
      for (const p of products) {
        if (p.slug) {
          routes.push({
            url: `${baseUrl}/products/${p.slug}`,
            lastModified: p.date_modified ? new Date(p.date_modified) : new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
          })
        }
      }
    }

    // 2. Fetch categories
    const categories = await wcRequest('/products/categories', { query: { hide_empty: 'true', per_page: 100 } })
    if (Array.isArray(categories)) {
      for (const c of categories) {
        if (c.slug) {
          routes.push({
            url: `${baseUrl}/products?category=${c.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          })
        }
      }
    }
  } catch (e) {
    console.error('Failed to generate sitemap elements from WooCommerce:', e)
  }

  return routes
}
