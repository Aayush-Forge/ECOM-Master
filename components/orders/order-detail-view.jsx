'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getOrderById, updateOrderStatus, getValidTransitions, initiateRefund } from '@/lib/api/orders'
import { getPaymentByOrderId } from '@/lib/api/payments'
import { currentUser } from '@/lib/mock-user'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Truck, Package, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

export default function OrderDetailView() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const orderId = params.id
  
  const basePath = pathname.startsWith('/admin') ? '/admin/orders' : '/staff/orders'

  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [validTransitions, setValidTransitions] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')
  
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchOrderData = async () => {
    setLoading(true)
    try {
      const orderData = await getOrderById(orderId)
      if (!orderData) {
        toast.error('Order not found')
        return
      }
      setOrder(orderData)
      
      const transitions = await getValidTransitions(orderData.status)
      setValidTransitions(transitions || [])
      if (transitions?.length > 0) {
        setSelectedStatus(transitions[0])
      }

      const paymentData = await getPaymentByOrderId(orderId)
      setPayment(paymentData)
      
      setRefundAmount(orderData.total.toString())
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrderData()
    }
  }, [orderId])

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return
    setUpdating(true)
    try {
      await updateOrderStatus(orderId, selectedStatus)
      toast.success(`Status updated to ${selectedStatus}`)
      setStatusDialogOpen(false)
      await fetchOrderData()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleRefund = async () => {
    setUpdating(true)
    try {
      const res = await initiateRefund(orderId, parseFloat(refundAmount), refundReason)
      toast.success(res?.message || 'Refund initiated successfully')
      setRefundDialogOpen(false)
      await fetchOrderData()
    } catch (error) {
      console.error('Error initiating refund:', error)
      toast.error('Failed to initiate refund')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) return (
    <div className="space-y-6">
      <Button variant="ghost" disabled><ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders</Button>
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
  
  if (!order) return <div className="text-center py-12">Order not found.</div>

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4 bg-white text-stone-900 border-stone-300 hover:bg-stone-100 hover:text-stone-900 font-semibold shadow-xs">
        <Link href={basePath}>
          <ArrowLeft className="mr-2 h-4 w-4 text-stone-700" /> Back to Orders
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-stone-900">Order #{order.id}</h1>
          <p className="text-stone-600 text-sm flex flex-col sm:flex-row sm:items-center gap-2">
            <span>{new Date(order.date).toLocaleString()}</span>
            <span className="hidden sm:inline">•</span>
            <span className="font-medium text-stone-900">{order.customer?.name} ({order.customer?.email})</span>
          </p>
        </div>
        <Badge className={`text-base px-3 py-1 ${getStatusColor(order.status)} hover:opacity-80`} variant="secondary">
          {order.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Line Items */}
          <Card className="bg-white border-stone-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-900"><Package className="h-5 w-5" /> Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-stone-700 font-semibold">Product</TableHead>
                    <TableHead className="text-stone-700 font-semibold">SKU</TableHead>
                    <TableHead className="text-right text-stone-700 font-semibold">Qty</TableHead>
                    <TableHead className="text-right text-stone-700 font-semibold">Price</TableHead>
                    <TableHead className="text-right text-stone-700 font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold text-stone-900">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-50 shrink-0 relative">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300'}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span>{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-stone-600">{item.sku || '-'}</TableCell>
                      <TableCell className="text-right text-stone-800">{item.quantity}</TableCell>
                      <TableCell className="text-right text-stone-800">₹{item.unitPrice.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-semibold text-stone-900">₹{item.lineTotal.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-medium text-stone-900">₹{order.subtotal?.toLocaleString('en-IN') || order.total?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Shipping</span>
                  <span className="font-medium text-stone-900">₹{(order.shipping || 0).toLocaleString('en-IN')}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base text-stone-900">
                  <span>Total</span>
                  <span>₹{order.total?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fulfillment Status Update Section */}
          <Card className="border-saffron/30 shadow-sm bg-white">
            <CardHeader className="bg-saffron/10 pb-4 border-b border-saffron/20">
              <CardTitle className="text-lg flex items-center gap-2 text-stone-900 font-bold">
                <RefreshCw className="h-5 w-5 text-saffron" /> 
                Update Fulfillment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <p className="text-sm font-semibold text-stone-800 mb-2 flex items-center gap-2">
                    Current Status: <Badge variant="secondary" className={getStatusColor(order.status)}>{order.status}</Badge>
                  </p>
                  {validTransitions.length > 0 ? (
                    <div className="flex items-center gap-3 w-full max-w-sm mt-4">
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="bg-white border-stone-300 text-stone-900 font-medium">
                          <SelectValue placeholder="Select next status" />
                        </SelectTrigger>
                        <SelectContent>
                          {validTransitions.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold shadow-sm px-5 disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 shrink-0" 
                            disabled={!selectedStatus}
                          >
                            Update Status
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-stone-900 font-bold">Change Order Status</AlertDialogTitle>
                            <AlertDialogDescription className="text-stone-600">
                              Are you sure you want to change the status of order #{order.id} from <strong className="text-stone-900">{order.status}</strong> to <strong className="text-saffron">{selectedStatus}</strong>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-stone-300 text-stone-800">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUpdateStatus} disabled={updating} className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold">
                              {updating ? 'Updating...' : 'Confirm'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="p-3 bg-stone-100 border border-stone-200 rounded-md text-sm text-stone-600 font-medium mt-4">
                      No further status updates available (order is in terminal state).
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ADMIN REFUND SECTION */}
          {currentUser.role === 'admin' && order.paymentStatus === 'paid' && (
            <Card className="border-red-200 shadow-sm bg-red-50/50">
              <CardHeader className="pb-3 border-b border-red-100">
                <CardTitle className="text-red-700 text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Refund Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-red-600 mb-4">
                  Warning: Refunding this order will reverse the transaction. This action cannot be undone.
                </p>
                <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Issue Refund</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Issue Refund for Order #{order.id}</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will initiate a refund. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Refund Amount (₹)</label>
                        <Input 
                          type="number" 
                          value={refundAmount} 
                          onChange={(e) => setRefundAmount(e.target.value)}
                          max={order.total}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for Refund</label>
                        <Textarea 
                          placeholder="Enter reason..." 
                          value={refundReason} 
                          onChange={(e) => setRefundReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleRefund} 
                        disabled={updating || !refundAmount}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {updating ? 'Processing...' : 'Confirm Refund'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /> Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {order.shippingAddress ? (
                <>
                  <p className="font-medium text-base mb-1">{order.shippingAddress.name || order.customer?.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                  <p className="pt-2">{order.shippingAddress.phone}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No shipping address provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /> Payment Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {payment ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <span className="font-medium font-mono text-xs">{payment.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="uppercase font-medium">{payment.method}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={
                      payment.status === 'paid' ? 'border-green-500 text-green-700' :
                      payment.status === 'refunded' ? 'border-blue-500 text-blue-700' : 'border-amber-500 text-amber-700'
                    }>
                      {payment.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium text-base">₹{payment.amount?.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={
                    order.paymentStatus === 'paid' ? 'border-green-500 text-green-700' :
                    order.paymentStatus === 'refunded' ? 'border-blue-500 text-blue-700' : 'border-amber-500 text-amber-700'
                  }>
                    {order.paymentStatus || 'unknown'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking Details */}
          {order.tracking && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /> Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Carrier:</span>
                  <span className="font-medium">{order.tracking.carrier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tracking #:</span>
                  <span className="font-medium font-mono">{order.tracking.trackingNumber}</span>
                </div>
                {order.tracking.url && (
                  <div className="pt-2">
                    <a href={order.tracking.url} target="_blank" rel="noopener noreferrer" className="text-saffron hover:underline font-medium text-sm flex items-center">
                      Track Package ↗
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
