'use client'

import { use } from 'react'
import DiscountFormView from '@/components/discounts/discount-form-view'

export default function EditDiscountPage({ params }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params
  return <DiscountFormView ruleId={resolvedParams?.id} isEdit />
}
