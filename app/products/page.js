import { Suspense } from 'react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductsCatalogClient from '@/components/products/products-catalog-client'

export const revalidate = 3600

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const category = params?.category

  if (category) {
    return {
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Fragrances & Incense`,
      description: `Explore our collection of authentic ${category} incense and natural fragrances.`,
      alternates: {
        canonical: `${BASE_URL}/categories/${category}`,
      },
    }
  }

  return {
    title: 'All Products & Sacred Fragrances',
    description: 'Browse our complete catalog of handcrafted incense sticks, natural dhoop, and pure aromatic wellness items.',
    alternates: {
      canonical: `${BASE_URL}/products`,
    },
  }
}

export default async function ProductsPage() {
  let products = []
  let categories = []

  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${BACKEND_URL}/all-products?per_page=100`, { next: { revalidate: 3600, tags: ['products'] } }),
      fetch(`${BACKEND_URL}/categories`, { next: { revalidate: 3600, tags: ['categories'] } }),
    ])

    if (pRes.ok) {
      const pData = await pRes.json()
      products = Array.isArray(pData) ? pData : pData?.data || []
    }
    if (cRes.ok) {
      const cData = await cRes.json()
      categories = Array.isArray(cData) ? cData : []
    }
  } catch (err) {
    console.error('Failed to pre-fetch products on server:', err)
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <Header />
      <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
        <ProductsCatalogClient initialProducts={products} initialCategories={categories} />
      </Suspense>
      <Footer />
    </main>
  )
}
