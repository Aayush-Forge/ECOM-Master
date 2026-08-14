'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getOrderById, getOrderByIdSync } from '@/lib/api/orders';
import { useCart } from '@/lib/cart-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ExternalLink,
  Package,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  AlertCircle,
} from 'lucide-react';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderDetailsPage() {
  const params = useParams();
  const [order, setOrder] = useState(() => (params?.id ? getOrderByIdSync(params.id) : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { addItem, openDrawer } = useCart();

  const fetchOrder = async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrderById(params.id);
      if (!data) {
        setError('Order not found');
      } else {
        setOrder(data);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('Something went wrong while fetching order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const handleReorder = () => {
    if (!order?.items?.length) return;
    let count = 0;
    order.items.forEach((item) => {
      addItem(
        {
          product_id: item.productId || 'prod_001',
          name: item.title,
          price: item.unitPrice,
          image: item.imageUrl,
        },
        item.quantity || 1
      );
      count += item.quantity || 1;
    });
    toast.success(`Added ${count} item${count > 1 ? 's' : ''} to your cart!`);
    if (openDrawer) openDrawer();
  };

  const getFulfillmentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getStepIndex = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      default: return -1;
    }
  };

  const currentStepIndex = getStepIndex(order?.status);
  const isCancelled = order?.status?.toLowerCase() === 'cancelled';
  const pmtStatus = order?.paymentStatus || 'paid';

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-stone-200 p-8 max-w-md mx-auto my-8 shadow-xs">
        <div className="bg-red-50 p-3 rounded-full w-fit mx-auto mb-4 text-red-600">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-display font-bold text-stone-900 mb-2">{error}</h3>
        <p className="text-stone-600 font-inter text-sm mb-6">We couldn't retrieve the details for this order.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/account/orders">Back to Orders</Link>
          </Button>
          <Button onClick={fetchOrder} className="bg-[#FF6B00] hover:bg-[#e05e00] text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-2xs">
        <div className="flex flex-col gap-2">
          <Link href="/account/orders" className="inline-flex items-center text-xs sm:text-sm font-inter text-stone-600 hover:text-saffron transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Orders
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-display font-bold text-stone-900">
              {loading ? <Skeleton className="h-8 w-40" /> : `Order #${order?.orderNumber || order?.id}`}
            </h2>
            {!loading && order && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getFulfillmentStatusColor(order.status)}`}>
                  Fulfillment: {order.status}
                </Badge>
                <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getPaymentStatusColor(pmtStatus)}`}>
                  Payment: {pmtStatus}
                </Badge>
              </div>
            )}
          </div>
          <span className="text-xs sm:text-sm font-inter text-stone-500">
            {loading ? <Skeleton className="h-4 w-48" /> : `Placed on ${new Date(order?.date).toLocaleDateString('en-IN', {
              year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
            })}`}
          </span>
        </div>

        {order && (
          <Button
            onClick={handleReorder}
            className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs shrink-0 self-start sm:self-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Buy Again
          </Button>
        )}
      </div>

      {/* Customer-Facing Step Tracker / Cancelled Banner */}
      {!loading && order && (
        <Card className="bg-white border border-stone-200 shadow-xs p-6">
          {isCancelled ? (
            <div className="flex items-center gap-4 bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
              <XCircle className="w-8 h-8 shrink-0 text-red-600" />
              <div>
                <h4 className="font-display font-bold text-base">Order Cancelled</h4>
                <p className="font-inter text-xs text-red-700">
                  This order was cancelled and is no longer being processed. Payment status: <span className="font-semibold capitalize">{pmtStatus}</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-display font-semibold text-sm text-stone-700">Order Progress</h4>
              <div className="relative flex items-center justify-between max-w-2xl mx-auto px-4">
                {/* Background Connecting Line */}
                <div className="absolute left-8 right-8 top-4 h-0.5 bg-stone-200 -z-0" />
                {/* Active Connecting Line */}
                <div
                  className="absolute left-8 top-4 h-0.5 bg-[#FF6B00] transition-all duration-500 -z-0"
                  style={{
                    width: `${(Math.max(0, currentStepIndex) / (ORDER_STEPS.length - 1)) * 85}%`,
                  }}
                />

                {ORDER_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10 space-y-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-inter text-xs font-bold transition-colors ${
                          isDone
                            ? 'bg-[#FF6B00] text-white shadow-xs'
                            : 'bg-stone-100 text-stone-400 border border-stone-300'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span
                        className={`text-xs font-inter text-center whitespace-nowrap ${
                          isCurrent
                            ? 'font-bold text-stone-900'
                            : isDone
                            ? 'font-medium text-stone-700'
                            : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Main Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      ) : order && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Line Items */}
            <Card className="bg-white border border-stone-200/80 shadow-xs overflow-hidden">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-4 flex flex-row items-center justify-between">
                <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-saffron" /> Items in Order
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleReorder} className="text-xs font-inter font-medium border-stone-300">
                  Buy Again
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-stone-50/80">
                    <TableRow className="border-b border-stone-200">
                      <TableHead className="font-inter font-semibold text-stone-700">Product</TableHead>
                      <TableHead className="font-inter font-semibold text-stone-700">SKU</TableHead>
                      <TableHead className="text-center font-inter font-semibold text-stone-700">Qty</TableHead>
                      <TableHead className="text-right font-inter font-semibold text-stone-700">Unit Price</TableHead>
                      <TableHead className="text-right font-inter font-semibold text-stone-700">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-stone-100">
                    {order.items?.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-stone-50/50">
                        <TableCell className="font-inter">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-50 shrink-0 relative shadow-2xs">
                              <img
                                src={item.imageUrl || item.product?.imageUrl || 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300'}
                                alt={item.title || item.product?.title || 'Product Image'}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span className="font-semibold text-stone-900 text-sm">
                              {item.title || item.product?.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-stone-500 font-inter text-sm">{item.sku || '-'}</TableCell>
                        <TableCell className="text-center font-inter text-stone-800 font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-right font-inter text-stone-800">₹{item.unitPrice?.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right font-inter font-semibold text-stone-900">₹{item.lineTotal.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Order Summary with Labeled Badges */}
            <Card className="bg-white border border-stone-200/80 shadow-xs">
              <CardHeader className="border-b border-stone-100 py-4">
                <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-stone-500" /> Order & Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex justify-between font-inter text-sm text-stone-600 items-center">
                  <span>Payment Status</span>
                  <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getPaymentStatusColor(pmtStatus)}`}>
                    {pmtStatus}
                  </Badge>
                </div>
                <div className="flex justify-between font-inter text-sm text-stone-600 items-center">
                  <span>Fulfillment Status</span>
                  <Badge variant="outline" className={`capitalize font-inter text-xs px-2.5 py-0.5 ${getFulfillmentStatusColor(order.status)}`}>
                    {order.status}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between font-inter text-sm text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-stone-900">₹{order.subtotal?.toLocaleString('en-IN') || order.total?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-inter text-sm text-stone-600">
                  <span>Shipping</span>
                  <span className="font-medium text-stone-900">{order.shipping ? `₹${order.shipping.toLocaleString('en-IN')}` : 'Free'}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-inter font-bold text-lg text-stone-900">
                  <span>Total Paid</span>
                  <span>₹{order.total?.toLocaleString('en-IN')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card className="bg-white border border-stone-200/80 shadow-xs">
                <CardHeader className="border-b border-stone-100 py-4">
                  <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-stone-500" /> Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-inter text-sm text-stone-600 space-y-1 pt-4">
                  <p className="font-semibold text-stone-900">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                  <p className="pt-2 text-stone-500 font-medium">Phone: {order.shippingAddress.phone}</p>
                </CardContent>
              </Card>
            )}

            {/* Tracking Info */}
            {order.tracking && (
              <Card className="bg-white border border-stone-200/80 shadow-xs">
                <CardHeader className="border-b border-stone-100 py-4">
                  <CardTitle className="font-display text-lg text-stone-900">Tracking Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="font-inter text-sm flex justify-between">
                    <span className="text-stone-500">Carrier:</span>
                    <span className="font-medium text-stone-900">{order.tracking.carrier}</span>
                  </div>
                  <div className="font-inter text-sm flex justify-between">
                    <span className="text-stone-500">Tracking Number:</span>
                    <span className="font-medium text-stone-900 font-mono">{order.tracking.trackingNumber}</span>
                  </div>
                  {order.tracking.url && (
                    <Button asChild variant="outline" className="w-full font-inter border-stone-300 text-stone-800 hover:bg-stone-50">
                      <a href={order.tracking.url} target="_blank" rel="noreferrer">
                        Track Package
                        <ExternalLink className="ml-2 w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
