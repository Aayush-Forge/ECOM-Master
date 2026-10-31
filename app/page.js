import HomeClientContent from '@/components/home/home-client-content'

export const revalidate = 3600

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

export const metadata = {
  title: 'SRIDATTAM — Premium Incense & Fragrance for Daily Rituals',
  description: 'Handcrafted premium incense sticks, natural resins, pure dhoop, and authentic wellness fragrances rooted in ancient Indian rituals.',
  alternates: {
    canonical: BASE_URL,
  },
}

export default async function HomePage() {
  let products = []
  let categories = []
  let topReviews = []
  let clubbingRules = []

  try {
    const [pRes, cRes, rRes, clRes] = await Promise.all([
      fetch(`${BACKEND_URL}/all-products?per_page=13`, { next: { revalidate: 3600, tags: ['products'] } }),
      fetch(`${BACKEND_URL}/categories`, { next: { revalidate: 3600, tags: ['categories'] } }),
      fetch(`${BACKEND_URL}/reviews/top?limit=10`, { next: { revalidate: 3600, tags: ['reviews'] } }).catch(() => null),
      fetch(`${BACKEND_URL}/clubbing-rules/active`, { next: { revalidate: 60, tags: ['clubbing-rules'] } }).catch(() => null),
    ])

    if (pRes?.ok) {
      const pData = await pRes.json()
      products = Array.isArray(pData) ? pData : pData?.data || []
    }
    if (cRes?.ok) {
      const cData = await cRes.json()
      categories = Array.isArray(cData) ? cData : []
    }
    if (rRes?.ok) {
      const rData = await rRes.json()
      topReviews = Array.isArray(rData) ? rData : []
    }
    if (clRes?.ok) {
      const clData = await clRes.json()
      clubbingRules = Array.isArray(clData) ? clData : []
    }
  } catch (err) {
    console.error('Failed to pre-fetch homepage data on server:', err)
  }

  return (
    <HomeClientContent
      initialProducts={products}
      initialCategories={categories}
      initialTopReviews={topReviews}
      initialClubbingRules={clubbingRules}
    />
  )
}
