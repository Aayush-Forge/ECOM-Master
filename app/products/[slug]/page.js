import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductDetailClient from '@/components/products/product-detail-client'
import { wcConfigured, wcRequest, safeProduct, safeVariation, safeCategory, resolveProductAcf } from '@/lib/wc'

async function getProduct(slug) {
  if (!wcConfigured()) return null
  try {
    const list = await wcRequest('/products', { query: { slug, status: 'publish' } })
    const product = list?.[0]
    if (!product) return null

    product.acf = await resolveProductAcf(product)

    let reviews = []
    try {
      reviews = await wcRequest('/products/reviews', { query: { product: product.id } })
    } catch {}
    if (Array.isArray(reviews) && reviews.length > 0) {
      const sum = reviews.reduce((s, r) => s + r.rating, 0)
      product.average_rating = String((sum / reviews.length).toFixed(2))
      product.rating_count = reviews.length
    }

    let variations = []
    if (product.type === 'variable' && Array.isArray(product.variations) && product.variations.length) {
      try {
        const vs = await wcRequest(`/products/${product.id}/variations`, { query: { per_page: 100 } })
        variations = (vs || []).map(safeVariation)
      } catch (e) {}
    }

    let related = []
    if (Array.isArray(product.related_ids) && product.related_ids.length) {
      try {
        const r = await wcRequest('/products', { query: { include: product.related_ids.slice(0, 6).join(','), per_page: 6 } })
        related = (r || []).map(safeProduct)
      } catch {}
    }

    return { ...safeProduct(product), variationsData: variations, related }
  } catch (e) {
    console.error('Error fetching product in SSR:', e)
    return null
  }
}

export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug)
  if (!product) {
    return {
      title: 'Product Not Found | SRIDATTAM',
      description: 'The requested product could not be found.'
    }
  }

  const plainDesc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim()
    : (product.description ? product.description.replace(/<[^>]*>/g, '').trim() : '')

  return {
    title: `${product.name} | SRIDATTAM — Premium Incense & Fragrance`,
    description: plainDesc.slice(0, 160) || 'Handcrafted premium incense sticks, natural resins, and essential oils.',
    openGraph: {
      title: product.name,
      description: plainDesc.slice(0, 160),
      type: 'website',
      images: product.images?.[0] ? [{ url: product.images[0].src }] : []
    }
  }
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.slug)

  if (!product) {
    return (
      <main className="bg-transparent min-h-screen relative z-10">
        <Header />
        <div className="py-32 container text-center">
          <h1 className="font-display text-2xl text-[#6B1024] font-bold">Product not found.</h1>
        </div>
        <Footer />
      </main>
    )
  }

  const plainDesc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim()
    : (product.description ? product.description.replace(/<[^>]*>/g, '').trim() : '')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images?.map(img => img.src) || [],
    description: plainDesc,
    sku: product.sku || undefined,
    brand: {
      '@type': 'Brand',
      name: 'SRIDATTAM'
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability: product.stock_status === 'instock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://sridattam.in/products/${product.slug}`
    }
  }

  if (product.average_rating && product.rating_count) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.average_rating,
      reviewCount: product.rating_count
    }
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      {/* JSON-LD Schema for Google Search Console / Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <Header />
      
      {/* Fallback layout hidden but indexable by basic crawlers */}
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
