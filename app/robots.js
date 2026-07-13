export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/checkout', '/order-confirmation'],
    },
    sitemap: 'https://sridattam.in/sitemap.xml',
  }
}
