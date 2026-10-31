'use client'

import { use } from 'react'
import ProductFormView from '@/components/products/product-form-view'

export default function EditProductPage({ params }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params
  return <ProductFormView productId={resolvedParams?.id} isEdit />
}
