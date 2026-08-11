'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getDashboardStats,
  getDashboardStatsSync,
  getRecentOrders,
  getRecentOrdersSync,
} from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, IndianRupee, Clock, AlertTriangle, ArrowRight, ChevronRight } from 'lucide-react'

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(() => getDashboardStatsSync())
  const [recentOrders, setRecentOrders] = useState(() => getRecentOrdersSync(5))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, ordersData] = await Promise.all([
          getDashboardStats(),
          getRecentOrders(5),
        ])
        if (statsData) setStats(statsData)
        if (ordersData) setRecentOrders(ordersData)
      } catch (error) {
        console.error('Failed to load dashboard overview data:', error)
      }
    }
    loadData()
  }, [])

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-stone-100 text-stone-800 border-stone-200'
    }
  }

  const totalOrders = stats?.totalOrders || 0
  const totalRevenue = stats?.totalRevenue || 0
  const pendingOrdersCount = stats?.pendingOrdersCount || 0
  const lowStockCount = stats?.lowStockCount || 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-stone-900">Dashboard Overview</h2>
        <p className="text-sm font-inter text-stone-500">Key metrics and recent customer order activity</p>
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Orders */}
        <Card className="shadow-2xs border-stone-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wide">
              Total Orders
            </CardTitle>
            <div className="h-10 w-10 bg-saffron/10 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-saffron" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-inter text-stone-900">{totalOrders}</div>
          </CardContent>
        </Card>

        {/* Card 2: Total Revenue */}
        <Card className="shadow-2xs border-stone-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wide">
              Total Revenue
            </CardTitle>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-amber-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-inter text-stone-900">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Orders */}
        <Card className="shadow-2xs border-stone-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wide">
              Pending Orders
            </CardTitle>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-inter text-stone-900">{pendingOrdersCount}</div>
          </CardContent>
        </Card>

        {/* Card 4: Low Stock Products */}
        <Card className="shadow-2xs border-stone-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-stone-500 font-inter uppercase tracking-wide">
              Low Stock Items
            </CardTitle>
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-inter text-stone-900">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display font-bold text-stone-900">Recent Orders</h3>
            <p className="text-xs font-inter text-stone-500">Most recently placed customer transactions</p>
          </div>
          <Button variant="outline" size="sm" asChild className="font-inter text-xs border-stone-300">
            <Link href="/admin/orders">
              View All Orders <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        <Card className="bg-white border border-stone-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700">Order #</TableHead>
                <TableHead className="font-semibold text-stone-700">Customer</TableHead>
                <TableHead className="font-semibold text-stone-700">Date</TableHead>
                <TableHead className="font-semibold text-stone-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Total</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-stone-500 font-inter text-sm">
                    No recent orders found.
                  </TableCell>
                </TableRow>
              ) : (
                recentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-stone-50/50">
                    <TableCell className="font-semibold text-stone-900 font-inter">
                      {order.orderNumber || order.id}
                    </TableCell>
                    <TableCell className="font-inter text-stone-800">{order.customer?.name}</TableCell>
                    <TableCell className="font-inter text-stone-600 text-sm whitespace-nowrap">
                      {new Date(order.date).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-stone-900 font-inter">
                      ₹{order.total?.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" asChild className="text-saffron hover:text-saffron/80 hover:bg-saffron/5 font-inter text-xs font-medium">
                        <Link href={`/admin/orders/${order.id}`}>
                          View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
