import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'sridattam-revalidate-secret-2026'

export async function POST(req) {
  try {
    const authHeader = req.headers.get('x-revalidate-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
    const url = new URL(req.url)
    const secretQuery = url.searchParams.get('secret')

    if (authHeader !== REVALIDATE_SECRET && secretQuery !== REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const tag = body.tag || url.searchParams.get('tag')
    const path = body.path || url.searchParams.get('path')
    const slug = body.slug || url.searchParams.get('slug')

    if (tag) {
      revalidateTag(tag)
    }

    if (slug) {
      revalidateTag(`product-${slug}`)
      revalidatePath(`/products/${slug}`)
    }

    if (path) {
      revalidatePath(path)
    }

    // Default: revalidate common dynamic product & category collections
    revalidateTag('products')
    revalidatePath('/')
    revalidatePath('/products')
    revalidatePath('/sitemap.xml')

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      tag: tag || null,
      path: path || null,
      slug: slug || null,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Revalidation failed' }, { status: 500 })
  }
}
