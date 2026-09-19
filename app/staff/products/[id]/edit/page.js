import ProductFormView from '@/components/products/product-form-view'

export default function StaffEditProductPage() {
  return <ProductFormView basePath="/staff/products" isEdit={true} />
}
