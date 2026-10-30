'use client'

import DiscountFormView from '@/components/discounts/discount-form-view'

export default function EditDiscountPage({ params }) {
  return <DiscountFormView ruleId={params.id} isEdit />
}
