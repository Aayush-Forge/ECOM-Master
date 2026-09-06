import ProductFormView from '@/components/products/product-form-view'

export default function AdminEditProductPage() {
  return <ProductFormView basePath="/admin/products" isEdit={true} />
}
