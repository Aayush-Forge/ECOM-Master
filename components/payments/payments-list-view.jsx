'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllPayments, getAllPaymentsSync } from '@/lib/api/payments'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterX, RefreshCw } from 'lucide-react'

export function PaymentsListView({ basePath = '/staff/orders', title = 'Payment Records' }) {
  const [payments, setPayments] = useState(() => getAllPaymentsSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllPayments({ status: statusFilter })
      setPayments(data || [])
    } catch (err) {
      console.error('Failed to fetch payments:', err)
      setError(err?.message || 'Failed to load payment records. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()

    const handleFocus = () => {
      fetchPayments()
    }
    const handleAuth = () => {
      fetchPayments()
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('auth-change', handleAuth)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('auth-change', handleAuth)
    }
  }, [statusFilter])

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'captured':
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'created':
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'failed':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border-blue-200'
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
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white border-stone-200 text-xs h-9">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="captured">Captured</SelectItem>
              <SelectItem value="created">Created (Pending)</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchPayments} variant="outline" size="sm" className="h-9 px-3 border-stone-200">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={fetchPayments} variant="outline" size="sm">
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
                <TableHead className="font-semibold text-stone-700">Payment ID</TableHead>
                <TableHead className="font-semibold text-stone-700">Order #</TableHead>
                <TableHead className="font-semibold text-stone-700">Customer</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Amount</TableHead>
                <TableHead className="font-semibold text-stone-700">Method</TableHead>
                <TableHead className="font-semibold text-stone-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FilterX className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">
                        {statusFilter !== 'all'
                          ? `No payments match the "${statusFilter}" status filter.`
                          : 'No payments found.'}
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
                payments.map((pmt) => (
                  <TableRow key={pmt.id} className="hover:bg-stone-50/50">
                    <TableCell className="font-mono text-xs text-stone-800 font-medium">
                      {pmt.razorpayPaymentId || pmt.id?.slice(0, 12)}
                    </TableCell>
                    <TableCell>
                      <Link href={`${basePath}/${pmt.orderId}`} className="font-semibold text-saffron hover:underline">
                        {pmt.orderNumber || pmt.orderId?.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-inter text-stone-800">{pmt.customerName}</TableCell>
                    <TableCell className="text-right font-semibold text-stone-900">₹{pmt.amount?.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-inter text-xs text-stone-600 uppercase">{pmt.method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getPaymentStatusColor(pmt.status)}`}>
                        {pmt.status?.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-inter text-stone-600 text-sm whitespace-nowrap">
                      {new Date(pmt.date).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
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

export default PaymentsListView
