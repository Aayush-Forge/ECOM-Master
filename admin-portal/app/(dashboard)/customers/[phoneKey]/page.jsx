'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getAdminCustomerByPhoneKey } from '@/lib/api/admin-customers'
import OrderListView from '@/components/orders/order-list-view'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, User, AlertCircle } from 'lucide-react'

export default function CustomerDetailPage() {
  const params = useParams()
  const phoneKey = params.phoneKey

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCustomerInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminCustomerByPhoneKey(phoneKey, { page: 1, perPage: 1 })
      setCustomer(res.customer)
    } catch (err) {
      console.error('Failed to load customer:', err)
      setError(err?.message || 'Failed to load customer details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (phoneKey) {
      fetchCustomerInfo()
    }
  }, [phoneKey])

  const fetchCustomerOrders = useCallback(
    async (filter = {}) => {
      const res = await getAdminCustomerByPhoneKey(phoneKey, {
        page: filter.page || 1,
        perPage: filter.perPage || filter.per_page || 50,
      })
      let list = res.data || []
      if (filter.status && filter.status !== 'all') {
        list = list.filter((o) => o.status?.toLowerCase() === filter.status.toLowerCase())
      }
      if (filter.search) {
        const s = filter.search.toLowerCase()
        list = list.filter(
          (o) =>
            o.orderNumber?.toLowerCase().includes(s) ||
            o.id?.toLowerCase().includes(s),
        )
      }
      return {
        data: list,
        meta: res.meta,
      }
    },
    [phoneKey],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Button>
        <div className="bg-white p-6 rounded-lg border border-stone-200">
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
          </Link>
        </Button>
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-stone-700 font-medium">{error || 'Customer not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-2 bg-white text-stone-900 border-stone-300 hover:bg-stone-100 shadow-xs">
        <Link href="/customers">
          <ArrowLeft className="mr-2 h-4 w-4 text-stone-700" /> Back to Customers
        </Link>
      </Button>

      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#FF6B00]" />
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-display">
                {customer.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-600">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-stone-400" />
                {customer.phone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrderListView
        basePath="/orders"
        title="Customer Orders"
        fetchFn={fetchCustomerOrders}
        linkQuery={`?from=customer&phone=${encodeURIComponent(customer.phoneKey)}`}
      />
    </div>
  )
}
