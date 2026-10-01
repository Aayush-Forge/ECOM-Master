'use client'

import OrderDetailView from '@/components/orders/order-detail-view'

export default function OrderDetailPage({ params }) {
  return <OrderDetailView orderId={params.id} />
}
