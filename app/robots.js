export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sridattam.in'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/checkout',
        '/cart',
        '/order-confirmation',
        '/account',
        '/login',
        '/register',
        '/track-order',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
