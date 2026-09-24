'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  getAnalyticsOverview,
  getTopProducts,
  getTopCategories,
  getCouponAnalytics,
  getOperationalSummary,
} from '@/lib/api/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  ShoppingCart,
  IndianRupee,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Tag,
  FolderTree,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  Box,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export default function DashboardOverviewView({ ordersBasePath = '/admin/orders' }) {
  const [rangePreset, setRangePreset] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  
  const [overview, setOverview] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [topCategories, setTopCategories] = useState([])
  const [coupons, setCoupons] = useState([])
  const [operational, setOperational] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const dateRange = useMemo(() => {
    const now = new Date()
    const end = now.toISOString().slice(0, 10)

    if (rangePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      return { startDate: start, endDate: now.toISOString() }
    }
    if (rangePreset === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      return { startDate: start, endDate: end }
    }
    if (rangePreset === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      return { startDate: start, endDate: end }
    }
    if (rangePreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      return { startDate: start, endDate: end }
    }
    if (rangePreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
      return { startDate: start, endDate: lastDay }
    }
    if (rangePreset === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
      return { startDate: start, endDate: end }
    }
    if (rangePreset === 'all') {
      return { startDate: '2020-01-01', endDate: end }
    }
    if (rangePreset === 'custom') {
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      }
    }
    return { startDate: undefined, endDate: undefined }
  }, [rangePreset, customStart, customEnd])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, productsRes, categoriesRes, couponsRes, opRes] = await Promise.all([
        getAnalyticsOverview(dateRange),
        getTopProducts({ ...dateRange, limit: 5 }),
        getTopCategories({ ...dateRange, limit: 5 }),
        getCouponAnalytics(dateRange),
        getOperationalSummary(),
      ])

      setOverview(overviewRes)
      setTopProducts(productsRes || [])
      setTopCategories(categoriesRes || [])
      setCoupons(couponsRes || [])
      setOperational(opRes || null)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError(err?.message || 'Failed to load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchDashboardData()

    const handleFocus = () => {
      fetchDashboardData()
    }
    const handleAuth = () => {
      fetchDashboardData()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('auth-change', handleAuth)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('auth-change', handleAuth)
    }
  }, [fetchDashboardData])

  const renderDelta = (delta) => {
    if (delta === undefined || delta === null) return null
    const isPositive = delta > 0
    const isNeutral = delta === 0
    return (
      <span
        className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-sm ${
          isNeutral
            ? 'bg-stone-100 text-stone-600'
            : isPositive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
        }`}
      >
        {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : !isNeutral ? <TrendingDown className="w-3 h-3 mr-0.5" /> : null}
        {isPositive ? `+${delta}%` : `${delta}%`}
        <span className="text-[10px] font-normal text-stone-400 ml-1">vs prev</span>
      </span>
    )
  }

  const getOrderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Shipped</Badge>
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>
      case 'payment_pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Payment Pending</Badge>
      case 'cancelled':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Cancelled</Badge>
      case 'refunded':
        return <Badge className="bg-stone-200 text-stone-800 border-stone-300">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const kpi = overview?.kpi

  return (
    <div className="space-y-8 pb-12">
      {/* Header + Date Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight text-stone-900">
            Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1 shadow-2xs">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'ytd', label: 'YTD' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setRangePreset(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  rangePreset === p.id
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            onClick={fetchDashboardData}
            variant="outline"
            size="sm"
            className="h-8 px-2.5 border-stone-200"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Custom Date Input Bar (shown when 'custom' is active) */}
      {rangePreset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
          <Calendar className="w-4 h-4 text-stone-500" />
          <span className="font-semibold text-stone-700">Date Range:</span>
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-36 h-8 text-xs bg-white"
          />
          <span className="text-stone-400">to</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-36 h-8 text-xs bg-white"
          />
          <Button onClick={fetchDashboardData} size="sm" className="h-8 text-xs bg-stone-900 text-white">
            Apply Filter
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button onClick={fetchDashboardData} variant="outline" size="sm" className="border-rose-300">
            Retry
          </Button>
        </div>
      )}

      {/* Operational Pipeline Funnel Bar */}
      {operational && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold font-inter uppercase tracking-wider text-stone-700">
                Fulfillment Funnel
              </h3>
            </div>
            {operational.toFulfillCount > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 font-semibold text-xs animate-pulse">
                {operational.toFulfillCount} Orders Awaiting Packing/Dispatch
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              {
                label: 'Payment Pending',
                count: operational.statusCounts?.payment_pending || 0,
                status: 'payment_pending',
                icon: Clock,
                color: 'text-amber-600 bg-amber-50 border-amber-200',
              },
              {
                label: 'Paid (To Pack)',
                count: operational.statusCounts?.paid || 0,
                status: 'paid',
                icon: Box,
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold ring-1 ring-emerald-300',
              },
              {
                label: 'Processing',
                count: operational.statusCounts?.processing || 0,
                status: 'processing',
                icon: Layers,
                color: 'text-blue-700 bg-blue-50 border-blue-200',
              },
              {
                label: 'Shipped',
                count: operational.statusCounts?.shipped || 0,
                status: 'shipped',
                icon: Truck,
                color: 'text-purple-700 bg-purple-50 border-purple-200',
              },
              {
                label: 'Delivered',
                count: operational.statusCounts?.delivered || 0,
                status: 'delivered',
                icon: CheckCircle2,
                color: 'text-green-700 bg-green-50 border-green-200',
              },
              {
                label: 'Cancelled',
                count: operational.statusCounts?.cancelled || 0,
                status: 'cancelled',
                icon: AlertTriangle,
                color: 'text-rose-700 bg-rose-50 border-rose-200',
              },
              {
                label: 'Refunded',
                count: operational.statusCounts?.refunded || 0,
                status: 'refunded',
                icon: RefreshCw,
                color: 'text-stone-700 bg-stone-100 border-stone-200',
              },
            ].map((st) => {
              const Icon = st.icon
              return (
                <Link
                  key={st.status}
                  href={`${ordersBasePath}?status=${st.status}`}
                  className={`p-3 rounded-lg border flex flex-col justify-between transition-all hover:shadow-xs hover:scale-[1.02] ${st.color}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4 opacity-70" />
                    <span className="text-xl font-bold font-inter">{st.count}</span>
                  </div>
                  <span className="text-[11px] font-medium mt-2 leading-tight">{st.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 6 Executive KPI Metric Cards (WooCommerce Analytics Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Net Sales */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wider">
              Net Sales
            </span>
            <div className="w-8 h-8 rounded-full bg-saffron/10 flex items-center justify-center text-saffron">
              <IndianRupee className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : (
              <div className="text-2xl font-bold font-inter text-stone-900">
                ₹{(kpi?.netSales?.value || 0).toLocaleString('en-IN')}
              </div>
            )}
            <div className="mt-1 flex items-center">{renderDelta(kpi?.netSales?.delta)}</div>
          </CardContent>
        </Card>

        {/* Gross Sales */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wider">
              Gross Sales
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : (
              <div className="text-2xl font-bold font-inter text-stone-900">
                ₹{(kpi?.grossSales?.value || 0).toLocaleString('en-IN')}
              </div>
            )}
            <div className="mt-1 flex items-center">{renderDelta(kpi?.grossSales?.delta)}</div>
          </CardContent>
        </Card>

        {/* Orders Placed */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wider">
              Orders Placed
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-8 w-16 my-1" />
            ) : (
              <div className="text-2xl font-bold font-inter text-stone-900">
                {kpi?.ordersCount?.value || 0}
              </div>
            )}
            <div className="mt-1 flex items-center">{renderDelta(kpi?.ordersCount?.delta)}</div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wider">
              Avg Order Value
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
              <Layers className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-8 w-20 my-1" />
            ) : (
              <div className="text-2xl font-bold font-inter text-stone-900">
                ₹{(kpi?.averageOrderValue?.value || 0).toLocaleString('en-IN')}
              </div>
            )}
            <div className="mt-1 flex items-center">{renderDelta(kpi?.averageOrderValue?.delta)}</div>
          </CardContent>
        </Card>

        {/* Units Sold */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wider">
              Products Sold
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-700">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-8 w-16 my-1" />
            ) : (
              <div className="text-2xl font-bold font-inter text-stone-900">
                {kpi?.itemsSold?.value || 0}
              </div>
            )}
            <div className="mt-1 flex items-center">{renderDelta(kpi?.itemsSold?.delta)}</div>
          </CardContent>
        </Card>

        {/* Discounts Given */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wider">
              Discounts Given
            </span>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-700">
              <Tag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <Skeleton className="h-8 w-20 my-1" />
            ) : (
              <div className="text-2xl font-bold font-inter text-stone-900">
                ₹{(kpi?.discountTotal?.value || 0).toLocaleString('en-IN')}
              </div>
            )}
            <div className="mt-1 flex items-center">
              <span className="text-xs text-stone-400 font-inter">Coupons &amp; Bundles</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales & Orders Interactive Time-Series Chart */}
      <Card className="border-stone-200 shadow-2xs bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold text-stone-900 font-inter">
              Sales &amp; Orders
            </CardTitle>
          </div>
          <div className="flex items-center gap-4 text-xs font-inter mt-2 sm:mt-0">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-stone-600 font-medium">Net Sales (₹)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-stone-600 font-medium">Orders Count</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <Skeleton className="w-full h-72 rounded-lg" />
          ) : !overview?.timeSeries || overview.timeSeries.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-stone-400 text-sm font-inter">
              No sales activity recorded in this date range.
            </div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={overview.timeSeries}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="netSalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    tickFormatter={(val) => {
                      if (!val) return ''
                      if (val.length > 10) return val.slice(11, 16)
                      const parts = val.split('-')
                      return `${parts[1]}/${parts[2] || parts[0]}`
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null
                      const netVal = payload.find((p) => p.dataKey === 'netSales')?.value || 0
                      const grossVal = payload.find((p) => p.payload?.grossSales)?.payload?.grossSales || 0
                      const ordVal = payload.find((p) => p.dataKey === 'ordersCount')?.value || 0
                      const itmVal = payload.find((p) => p.payload?.itemsSold)?.payload?.itemsSold || 0

                      return (
                        <div className="bg-stone-900 text-white text-xs p-3 rounded-lg shadow-lg space-y-1.5 font-inter">
                          <p className="font-semibold text-stone-300 border-b border-stone-800 pb-1">
                            {label}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-amber-400 font-medium">Net Sales:</span>
                            <span className="font-bold">₹{netVal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-stone-400">Gross Sales:</span>
                            <span>₹{grossVal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-blue-400 font-medium">Orders:</span>
                            <span className="font-bold">{ordVal}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-stone-400">Units Sold:</span>
                            <span>{itmVal}</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="netSales"
                    fill="url(#netSalesGradient)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    name="Net Sales"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="ordersCount"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                    name="Orders"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Column Breakdown: Top Products & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products Leaderboard */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 font-inter">
                Top Products
              </CardTitle>
            </div>
            <Package className="w-5 h-5 text-stone-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 font-inter">
                No product sales recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-stone-100 text-xs text-stone-500">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-stone-100">
                    {topProducts.map((p, idx) => (
                      <TableRow key={p.id} className="hover:bg-stone-50/50">
                        <TableCell className="font-semibold text-stone-500">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium text-stone-900 line-clamp-1">{p.title}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{p.sku}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-stone-900">
                          {p.unitsSold}
                        </TableCell>
                        <TableCell className="text-right font-bold text-stone-900">
                          ₹{p.revenue.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              p.stockQuantity <= 5
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {p.stockQuantity} left
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories Breakdown */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 font-inter">
                Category Breakdown
              </CardTitle>
            </div>
            <FolderTree className="w-5 h-5 text-stone-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 font-inter">
                No category data available for this range.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {topCategories.map((c) => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-inter">
                      <span className="font-semibold text-stone-800">{c.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-500">{c.unitsSold} units</span>
                        <span className="font-bold text-stone-900">
                          ₹{c.revenue.toLocaleString('en-IN')}
                        </span>
                        <span className="text-stone-400 w-10 text-right">{c.revenueShare}%</span>
                      </div>
                    </div>
                    <Progress value={c.revenueShare} className="h-2 bg-stone-100" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Coupons & Promotions Analytics + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Promotional & Coupon Performance */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 font-inter">
                Coupons &amp; Promotions
              </CardTitle>
            </div>
            <Tag className="w-5 h-5 text-stone-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 font-inter">
                No coupons or volume discount rules applied in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-stone-100 text-xs text-stone-500">
                      <TableHead>Coupon / Rule</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Discount</TableHead>
                      <TableHead className="text-right">Net Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-stone-100">
                    {coupons.map((c, i) => (
                      <TableRow key={i} className="hover:bg-stone-50/50">
                        <TableCell className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-saffron" />
                          <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">
                            {c.code}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-stone-800">
                          {c.ordersCount}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-700">
                          -₹{c.discountTotal.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-stone-900">
                          ₹{c.revenue.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low-Stock Inventory Radar */}
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 font-inter">
                Low Stock Alert
              </CardTitle>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !operational?.lowStockProducts || operational.lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-600 font-inter font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                All active products have healthy stock levels.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-stone-100 text-xs text-stone-500">
                      <TableHead>Product / SKU</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-stone-100">
                    {operational.lowStockProducts.map((p) => (
                      <TableRow key={p.id} className="hover:bg-stone-50/50">
                        <TableCell>
                          <div className="font-medium text-stone-900 line-clamp-1">{p.title}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{p.sku}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-stone-800">
                          ₹{p.price}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={`font-semibold text-xs px-2 py-0.5 ${
                              p.stockQuantity === 0
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-100 text-amber-900 border-amber-200'
                            }`}
                          >
                            {p.stockQuantity === 0 ? 'Out of Stock' : `${p.stockQuantity} left`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] border-stone-200 px-2"
                          >
                            <Link href="/admin/products">Manage</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Recent Orders Feed */}
      {operational?.recentOrders && operational.recentOrders.length > 0 && (
        <Card className="border-stone-200 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-stone-900 font-inter">
                Recent Orders
              </CardTitle>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs border-stone-200">
              <Link href={ordersBasePath}>
                View All Orders <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-100 text-xs text-stone-500">
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-stone-100">
                  {operational.recentOrders.map((o) => (
                    <TableRow key={o.id} className="hover:bg-stone-50/50">
                      <TableCell className="font-semibold text-stone-900">
                        {o.orderNumber || o.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium text-stone-800">{o.customerName}</TableCell>
                      <TableCell className="text-stone-500 whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-stone-700">
                        {o.itemsCount}
                      </TableCell>
                      <TableCell className="text-right font-bold text-stone-900">
                        ₹{o.grandTotal.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center">{getOrderStatusBadge(o.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] border-stone-200 px-2"
                        >
                          <Link href={`${ordersBasePath}/${o.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
