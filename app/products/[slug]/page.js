import { cache } from 'react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductDetailClient from '@/components/products/product-detail-client'

export const revalidate = 3600

const BACKEND_URL = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

const getProduct = cache(async (slug) => {
  try {
    const res = await fetch(`${BACKEND_URL}/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600, tags: ['products', `product-${slug}`] },
    })
    if (!res.ok) return null

    const product = await res.json()
    if (!product || !product.id) return null

    const rawImages = Array.isArray(product.images) ? product.images : []
    const images = rawImages.map((img) =>
      typeof img === 'string' ? { src: img } : img
    )
    const attributes = Array.isArray(product.attributes) ? product.attributes : []
    const variationsData = Array.isArray(product.variationsData) ? product.variationsData : []
    const isVariable =
      product.productType === 'variable' ||
      product.type === 'variable' ||
      variationsData.length > 0

    const activeVarPrices = isVariable && variationsData.length > 0
      ? variationsData
          .filter((v) => v.isActive !== false && v.stock_status !== 'outofstock')
          .map((v) => Number(v.price || v.sale_price || v.salePrice || v.regular_price || v.regularPrice || 0))
          .filter((pr) => pr > 0)
      : []

    const minVarPrice = activeVarPrices.length > 0 ? Math.min(...activeVarPrices) : null
    const basePrice = Number(product.basePrice ?? product.price ?? 0)
    const salePrice = isVariable ? null : (product.salePrice ? Number(product.salePrice) : null)
    const currentPrice = isVariable && minVarPrice !== null ? minVarPrice : (salePrice !== null ? salePrice : basePrice)
    const inStock =
      product.stockQuantity !== undefined ? product.stockQuantity > 0 : true

    return {
      ...product,
      id: product.id,
      name: product.title || product.name,
      slug: product.slug,
      type: isVariable ? 'variable' : 'simple',
      price: currentPrice,
      regular_price: basePrice,
      sale_price: salePrice,
      on_sale: salePrice !== null && salePrice < basePrice,
      images:
        images.length > 0
          ? images
          : [
              {
                src: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
              },
            ],
      short_description: product.shortDescription || '',
      description: product.description || '',
      stock_status: inStock ? 'instock' : 'outofstock',
      in_stock: inStock,
      average_rating: product.averageRating !== undefined ? String(product.averageRating) : undefined,
      rating_count: product.ratingCount || 0,
      reviews: Array.isArray(product.reviews) ? product.reviews : [],
      attributes,
      variationsData,
      related: [],
    }
  } catch (e) {
    console.error('Error fetching product by slug from backend:', e)
    return null
  }
})

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    }
  }

  const plainDesc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim()
    : product.description
      ? product.description.replace(/<[^>]*>/g, '').trim()
      : ''

  const title = product.metaTitle || product.name
  const description =
    product.metaDescription ||
    plainDesc.slice(0, 160) ||
    'Handcrafted premium incense sticks, natural resins, and essential oils.'
  const canonicalUrl = `${BASE_URL}/products/${product.slug}`
  const mainImage = product.images?.[0]?.src || `${BASE_URL}/og-image.jpg`

  return {
    title,
    description,
    keywords: product.metaKeywords || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: mainImage, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [mainImage],
    },
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return (
      <main className="bg-transparent min-h-screen relative z-10">
        <Header />
        <div className="py-32 container text-center">
          <h1 className="font-display text-2xl text-[#6B1024] font-bold">
            Product not found.
          </h1>
        </div>
        <Footer />
      </main>
    )
  }

  const plainDesc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim()
    : product.description
      ? product.description.replace(/<[^>]*>/g, '').trim()
      : ''

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images?.map((img) => img.src) || [],
    description: plainDesc,
    sku: product.sku || undefined,
    brand: {
      '@type': 'Brand',
      name: 'SRIDATTAM',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability:
        product.in_stock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/products/${product.slug}`,
    },
    ...(product.rating_count > 0 && product.average_rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(product.average_rating),
            reviewCount: String(product.rating_count),
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    ...(product.reviews && product.reviews.length > 0
      ? {
          review: product.reviews.map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.customerName || 'Verified Buyer' },
            datePublished: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : undefined,
            reviewBody: r.description,
            reviewRating: {
              '@type': 'Rating',
              ratingValue: String(r.stars),
              bestRating: '5',
              worstRating: '1',
            },
          })),
        }
      : {}),
  }

  const categoryName = typeof product.category === 'object' ? product.category?.name : product.category
  const categorySlug = typeof product.category === 'object' ? product.category?.slug : product.category_slug

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${BASE_URL}/products` },
      ...(categoryName && categorySlug
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: categoryName,
              item: `${BASE_URL}/categories/${categorySlug}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: product.name,
              item: `${BASE_URL}/products/${product.slug}`,
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 3,
              name: product.name,
              item: `${BASE_URL}/products/${product.slug}`,
            },
          ]),
    ],
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <Header />
      <div className="sr-only">
        <h1>{product.name}</h1>
        <p>{plainDesc}</p>
        <div>Price: INR {product.price}</div>
        <div>SKU: {product.sku}</div>
        <div>Status: {product.stock_status}</div>
      </div>
      <ProductDetailClient initialProduct={product} />
      <Footer />
    </main>
  )
}
