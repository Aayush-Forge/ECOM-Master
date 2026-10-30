import { cache } from 'react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductCard from '@/components/products/product-card'
import Link from 'next/link'
import { normalizeStoreProduct } from '@/components/products/products-catalog-client'

export const revalidate = 3600

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

const getCategoryData = cache(async (slug) => {
  try {
    const [catRes, prodRes] = await Promise.all([
      fetch(`${BACKEND_URL}/categories/${encodeURIComponent(slug)}`, {
        next: { revalidate: 3600, tags: ['categories', `category-${slug}`] },
      }),
      fetch(`${BACKEND_URL}/all-products?category=${encodeURIComponent(slug)}&per_page=100`, {
        next: { revalidate: 3600, tags: ['products', `category-products-${slug}`] },
      }),
    ])

    if (!catRes.ok) return null
    const category = await catRes.json()

    let products = []
    if (prodRes.ok) {
      const pData = await prodRes.json()
      const raw = Array.isArray(pData) ? pData : pData?.data || []
      products = raw.map(normalizeStoreProduct).filter(Boolean)
    }

    return { category, products }
  } catch (error) {
    console.error('Error fetching category data:', error)
    return null
  }
})

export async function generateMetadata({ params }) {
  const { slug } = await params
  const data = await getCategoryData(slug)
  if (!data || !data.category) {
    return {
      title: 'Category Not Found',
      description: 'The requested category could not be found.',
    }
  }

  const { category } = data
  const title = category.metaTitle || `${category.name} | Incense & Sacred Fragrances`
  const description =
    category.metaDescription ||
    category.description ||
    `Explore our authentic collection of ${category.name} incense and traditional wellness fragrances.`
  const canonicalUrl = `${BASE_URL}/categories/${category.slug}`
  const ogImage = category.image || `${BASE_URL}/og-image.jpg`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: ogImage, alt: category.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function CategoryPage({ params }) {
  const { slug } = await params
  const data = await getCategoryData(slug)

  if (!data || !data.category) {
    return (
      <main className="bg-transparent min-h-screen relative z-10">
        <Header />
        <div className="py-32 container text-center">
          <h1 className="font-display text-2xl text-[#6B1024] font-bold">
            Category not found.
          </h1>
          <p className="mt-4">
            <Link href="/products" className="text-[#D7A65B] underline">
              Browse all products
            </Link>
          </p>
        </div>
        <Footer />
      </main>
    )
  }

  const { category, products } = data

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || `${category.name} collection by SRIDATTAM`,
    url: `${BASE_URL}/categories/${category.slug}`,
  }

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${BASE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${BASE_URL}/categories/${category.slug}` },
    ],
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <Header />
      <div className="py-12">
        <div className="container">
          {/* Breadcrumb nav */}
          <nav className="text-xs text-muted-foreground mb-6 flex gap-2">
            <Link href="/" className="hover:text-gold-700">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-gold-700">Products</Link>
            <span>/</span>
            <span className="text-[#6B1024] font-medium">{category.name}</span>
          </nav>

          <div className="mb-10 text-center">
            <p className="text-gold-700 text-sm tracking-[0.2em] uppercase">Sacred Category</p>
            <h1 className="font-display text-4xl md:text-5xl text-maroon-500 mt-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="max-w-2xl mx-auto text-muted-foreground mt-3 text-base leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl gold-text mb-4">ॐ</div>
              <p className="font-display text-xl text-maroon-500">No products found in this category</p>
              <p className="text-muted-foreground mt-2">Check back soon for new arrivals.</p>
              <Link href="/products" className="mt-6 inline-block text-gold-700 underline font-medium">
                View all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
