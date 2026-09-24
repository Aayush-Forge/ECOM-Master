'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllOrders, getAllOrdersSync } from '@/lib/api/orders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterX, RefreshCw, Search } from 'lucide-react'

export function OrderListView({ basePath = '/staff/orders', title = 'Orders' }) {
  const [orders, setOrders] = useState(() => getAllOrdersSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllOrders({
        status: statusFilter,
        search: searchTerm.trim() || undefined,
      })
      setOrders(data || [])
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError(err?.message || 'Failed to load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    const handleFocus = () => {
      fetchOrders()
    }
    const handleAuth = () => {
      fetchOrders()
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('auth-change', handleAuth)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('auth-change', handleAuth)
    }
  }, [statusFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchOrders()
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'payment_pending':
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'refunded':
        return 'bg-stone-200 text-stone-800 border-stone-300'
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              type="search"
              placeholder="Search order # or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-stone-200 text-xs h-9"
            />
          </form>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white border-stone-200 text-xs h-9">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="payment_pending">Payment Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchOrders} variant="outline" size="sm" className="h-9 px-3 border-stone-200">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={fetchOrders} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
            {error.toLowerCase().includes('sign in') && (
              <Button asChild size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700">Order #</TableHead>
                <TableHead className="font-semibold text-stone-700">Customer</TableHead>
                <TableHead className="font-semibold text-stone-700">Date</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Items</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Total</TableHead>
                <TableHead className="font-semibold text-stone-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FilterX className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">
                        {statusFilter !== 'all'
                          ? `No orders match the "${statusFilter}" status filter.`
                          : 'No orders found.'}
                      </p>
                      {statusFilter !== 'all' && (
                        <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                          Clear Status Filter
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-stone-50/50">
                    <TableCell className="font-semibold text-stone-900">{order.orderNumber || order.id?.slice(0, 8)}</TableCell>
                    <TableCell className="font-inter text-stone-800">{order.customer?.name || order.shippingAddress?.name || 'Guest'}</TableCell>
                    <TableCell className="font-inter text-stone-600 text-sm whitespace-nowrap">
                      {new Date(order.date).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right font-inter text-stone-800">{order.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-semibold text-stone-900">₹{order.total?.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getStatusColor(order.status)}`}>
                        {order.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild className="border-stone-300 font-inter text-xs">
                        <Link href={`${basePath}/${order.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default OrderListView
