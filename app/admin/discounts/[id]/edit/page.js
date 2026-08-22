import DiscountFormView from '@/components/discounts/discount-form-view'

export default function AdminEditDiscountPage() {
  return <DiscountFormView basePath="/admin/discounts" isEdit={true} />
}
