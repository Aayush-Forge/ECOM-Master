import { cache } from 'react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProductDetailClient from '@/components/products/product-detail-client'

export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

// NOTE (Stopgap): Backend currently provides GET /all-products and GET /products/:id.
// Slug-based lookup is resolved via catalog list until a dedicated GET /products/slug/:slug endpoint is added.
const getProduct = cache(async (slug) => {
  try {
    const res = await fetch(`${BACKEND_URL}/all-products?per_page=100`, {
      cache: 'no-store',
    })
    if (!res.ok) return null

    const data = await res.json()
    const list = Array.isArray(data) ? data : data.data || []
    const product = list.find((p) => p.slug === slug)
    if (!product) return null

    const rawImages = Array.isArray(product.images) ? product.images : []
    const images = rawImages.map((img) =>
      typeof img === 'string' ? { src: img } : img
    )
    const basePrice = Number(product.basePrice ?? product.price ?? 0)
    const salePrice = product.salePrice ? Number(product.salePrice) : null
    const currentPrice = salePrice !== null ? salePrice : basePrice
    const inStock =
      product.stockQuantity !== undefined ? product.stockQuantity > 0 : true

    const related = list
      .filter((p) => p.id !== product.id)
      .slice(0, 4)
      .map((p) => ({
        ...p,
        name: p.title || p.name,
        price: Number(p.salePrice ?? p.basePrice ?? 0),
        regular_price: Number(p.basePrice ?? 0),
        images: (p.images || []).map((img) =>
          typeof img === 'string' ? { src: img } : img
        ),
        stock_status: (p.stockQuantity ?? 1) > 0 ? 'instock' : 'outofstock',
      }))

    return {
      ...product,
      id: product.id,
      name: product.title || product.name,
      slug: product.slug,
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
      average_rating: '5.00',
      rating_count: 8,
      attributes: [],
      variationsData: [],
      related,
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
      title: 'Product Not Found | SRIDATTAM',
      description: 'The requested product could not be found.',
    }
  }

  const plainDesc = product.short_description
    ? product.short_description.replace(/<[^>]*>/g, '').trim()
    : product.description
      ? product.description.replace(/<[^>]*>/g, '').trim()
      : ''

  return {
    title: `${product.name} | SRIDATTAM — Premium Incense & Fragrance`,
    description:
      plainDesc.slice(0, 160) ||
      'Handcrafted premium incense sticks, natural resins, and essential oils.',
    openGraph: {
      title: product.name,
      description: plainDesc.slice(0, 160),
      type: 'website',
      images: product.images?.[0] ? [{ url: product.images[0].src }] : [],
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

  const jsonLd = {
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
        product.stock_status === 'instock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `https://sridattam.in/products/${product.slug}`,
    },
  }

  return (
    <main className="bg-transparent min-h-screen relative z-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
