'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyOrders, getMyOrdersSync } from '@/lib/api/orders';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState(() => getMyOrdersSync());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await getMyOrders();
        setOrders(data || []);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    }
    fetchOrders();
  }, []);

  const getFulfillmentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-stone-900">Orders & Payments</h2>
          <p className="text-xs font-inter text-stone-500">Track active shipments and monitor per-order payment status</p>
        </div>
        <span className="text-sm font-inter text-stone-500 font-medium">
          {loading ? 'Loading...' : `Total: ${orders.length} orders`}
        </span>
      </div>

      <Card className="bg-white border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50/80">
              <TableRow className="border-b border-stone-200">
                <TableHead className="font-inter font-semibold text-stone-700">Order #</TableHead>
                <TableHead className="font-inter font-semibold text-stone-700">Products</TableHead>
                <TableHead className="font-inter font-semibold text-stone-700">Date</TableHead>
                <TableHead className="font-inter font-semibold text-stone-700">Fulfillment</TableHead>
                <TableHead className="font-inter font-semibold text-stone-700">Payment</TableHead>
                <TableHead className="text-right font-inter font-semibold text-stone-700">Total</TableHead>
                <TableHead className="text-right font-inter font-semibold text-stone-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-stone-100 p-4 rounded-full mb-4">
                        <ShoppingBag className="w-8 h-8 text-stone-400" />
                      </div>
                      <h3 className="text-lg font-semibold font-inter text-stone-900 mb-1">No orders yet</h3>
                      <p className="text-stone-600 font-inter text-sm mb-6 max-w-sm">When you place orders, they will appear here with payment and shipping status.</p>
                      <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-inter shadow-xs font-bold">
                        <Link href="/">Continue Shopping</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const totalItemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                  const pmtStatus = order.paymentStatus || 'paid';
                  return (
                    <TableRow key={order.id} className="hover:bg-stone-50/50 transition-colors">
                      <TableCell className="font-semibold font-inter text-stone-900 shrink-0">
                        {order.orderNumber || order.id}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-3 overflow-hidden shrink-0">
                            {order.items?.slice(0, 3).map((item, i) => (
                              <div key={i} className="inline-block h-10 w-10 rounded-lg overflow-hidden border-2 border-white shadow-2xs bg-stone-100 relative">
                                <img
                                  src={item.imageUrl || 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300'}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-inter font-medium text-stone-900 text-sm truncate max-w-[160px] sm:max-w-[220px]">
                              {order.items?.[0]?.title || 'Product'}
                            </span>
                            <span className="text-xs font-inter text-stone-500">
                              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-inter text-stone-600 text-sm whitespace-nowrap">
                        {new Date(order.date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getFulfillmentStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getPaymentStatusColor(pmtStatus)}`}>
                          {pmtStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-inter font-semibold text-stone-900 whitespace-nowrap">
                        ₹{order.total?.toLocaleString('en-IN') || '0'}
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" asChild className="text-saffron hover:text-saffron/80 hover:bg-saffron/5 font-inter text-xs font-medium">
                          <Link href={`/account/orders/${order.id}`}>
                            View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
