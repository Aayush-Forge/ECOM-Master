'use client'

import { use } from 'react'
import OrderDetailView from '@/components/orders/order-detail-view'

export default function OrderDetailPage({ params }) {
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params
  return <OrderDetailView orderId={resolvedParams?.id} />
}
