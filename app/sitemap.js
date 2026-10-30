const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

export const revalidate = 3600

export default async function sitemap() {
  const routes = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/refund-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms-conditions`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/shipping-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Fetch all active products (with pagination support)
  try {
    let page = 1
    let total = 0
    const perPage = 250

    do {
      const res = await fetch(`${BACKEND_URL}/all-products?page=${page}&per_page=${perPage}&status=active`, {
        next: { revalidate: 3600 },
      })
      if (!res.ok) break

      const result = await res.json()
      const list = Array.isArray(result) ? result : result.data || []
      total = result.meta?.total || list.length

      for (const p of list) {
        if (p.slug) {
          routes.push({
            url: `${BASE_URL}/products/${p.slug}`,
            lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          })
        }
      }

      if (list.length === 0 || routes.length >= total + 8) break
      page++
    } while (page <= 20)
  } catch (error) {
    console.error('Failed to generate product sitemap entries:', error)
  }

  // Fetch categories
  try {
    const res = await fetch(`${BACKEND_URL}/categories`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const categories = await res.json()
      if (Array.isArray(categories)) {
        for (const c of categories) {
          if (c.slug) {
            routes.push({
              url: `${BASE_URL}/categories/${c.slug}`,
              changeFrequency: 'weekly',
              priority: 0.7,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to generate category sitemap entries:', error)
  }

  return routes
}
