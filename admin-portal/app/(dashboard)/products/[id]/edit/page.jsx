'use client'

import ProductFormView from '@/components/products/product-form-view'

export default function EditProductPage({ params }) {
  return <ProductFormView productId={params.id} isEdit />
}
