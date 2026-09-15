import DiscountFormView from '@/components/discounts/discount-form-view'

export default function StaffEditDiscountPage() {
  return <DiscountFormView basePath="/staff/discounts" isEdit={true} />
}
