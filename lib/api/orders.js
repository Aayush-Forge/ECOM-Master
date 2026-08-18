/**
 * Orders API client — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend order endpoints are ready.
 */

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

let MOCK_ORDERS = [
  {
    id: 'ord_001',
    orderNumber: 'ORD-1001',
    customer: { id: 'usr_001', name: 'Aayush Sharma', email: 'aayush@sridattam.com' },
    date: '2025-07-28T10:30:00Z',
    status: 'pending',
    paymentStatus: 'pending',
    items: [
      { productId: 'prod_001', title: 'Premium Sandalwood Agarbatti', sku: 'SD-001', quantity: 1, unitPrice: 599, lineTotal: 599, imageUrl: 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300' },
      { productId: 'prod_004', title: 'Sacred Camphor Tablets', sku: 'SD-004', quantity: 2, unitPrice: 199, lineTotal: 398, imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300' },
    ],
    subtotal: 997,
    shipping: 50,
    total: 1047,
    shippingAddress: {
      name: 'Aayush Sharma', line1: '42, Lotus Apartments', line2: 'Bandra West',
      city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '+91 98765 12345',
    },
    tracking: null,
  },
  {
    id: 'ord_002',
    orderNumber: 'ORD-1002',
    customer: { id: 'usr_005', name: 'Karan Singh', email: 'karan.singh@example.com' },
    date: '2025-07-30T14:15:00Z',
    status: 'processing',
    paymentStatus: 'paid',
    items: [
      { productId: 'prod_001', title: 'Premium Sandalwood Agarbatti', sku: 'SD-001', quantity: 1, unitPrice: 599, lineTotal: 599, imageUrl: 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300' },
    ],
    subtotal: 599,
    shipping: 0,
    total: 599,
    shippingAddress: {
      name: 'Karan Singh', line1: '15, Green Park', line2: '',
      city: 'New Delhi', state: 'Delhi', pincode: '110016', phone: '+91 99887 76655',
    },
    tracking: null,
  },
  {
    id: 'ord_003',
    orderNumber: 'ORD-1003',
    customer: { id: 'usr_006', name: 'Ananya Reddy', email: 'ananya.r@example.com' },
    date: '2025-08-01T09:45:00Z',
    status: 'shipped',
    paymentStatus: 'paid',
    items: [
      { productId: 'prod_002', title: 'Rose Petal Dhoop Sticks', sku: 'SD-002', quantity: 2, unitPrice: 349, lineTotal: 698, imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300' },
      { productId: 'prod_005', title: 'Jasmine Masala Incense', sku: 'SD-005', quantity: 1, unitPrice: 449, lineTotal: 449, imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300' },
    ],
    subtotal: 1147,
    shipping: 100,
    total: 1247,
    shippingAddress: {
      name: 'Ananya Reddy', line1: '8-3-231, Jubilee Hills', line2: 'Road No. 5',
      city: 'Hyderabad', state: 'Telangana', pincode: '500033', phone: '+91 90001 23456',
    },
    tracking: { carrier: 'Delhivery', trackingNumber: 'DL9283746510', url: 'https://www.delhivery.com/track/package/DL9283746510' },
  },
  {
    id: 'ord_004',
    orderNumber: 'ORD-1004',
    customer: { id: 'usr_001', name: 'Aayush Sharma', email: 'aayush@sridattam.com' },
    date: '2025-07-20T16:00:00Z',
    status: 'delivered',
    paymentStatus: 'paid',
    items: [
      { productId: 'prod_003', title: 'Guggul Resin Blend', sku: 'SD-003', quantity: 1, unitPrice: 799, lineTotal: 799, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' },
      { productId: 'prod_006', title: 'Temple Essentials Combo', sku: 'SD-006', quantity: 1, unitPrice: 1499, lineTotal: 1499, imageUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=300' },
    ],
    subtotal: 2298,
    shipping: 0,
    total: 2298,
    shippingAddress: {
      name: 'Aayush Sharma', line1: '302, Shanti Towers', line2: 'FC Road',
      city: 'Pune', state: 'Maharashtra', pincode: '411005', phone: '+91 88776 65544',
    },
    tracking: { carrier: 'BlueDart', trackingNumber: 'BD7788991122', url: 'https://www.bluedart.com/tracking/BD7788991122' },
  },
  {
    id: 'ord_005',
    orderNumber: 'ORD-1005',
    customer: { id: 'usr_008', name: 'Sonia Gupta', email: 'sonia.g@example.com' },
    date: '2025-08-03T11:20:00Z',
    status: 'cancelled',
    paymentStatus: 'failed',
    items: [
      { productId: 'prod_002', title: 'Rose Petal Dhoop Sticks', sku: 'SD-002', quantity: 1, unitPrice: 349, lineTotal: 349, imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300' },
    ],
    subtotal: 349,
    shipping: 50,
    total: 399,
    shippingAddress: {
      name: 'Sonia Gupta', line1: '77, MG Road', line2: '',
      city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phone: '+91 77665 54433',
    },
    tracking: null,
  },
  {
    id: 'ord_006',
    orderNumber: 'ORD-1006',
    customer: { id: 'usr_004', name: 'Meera Joshi', email: 'meera.joshi@example.com' },
    date: '2025-07-10T08:00:00Z',
    status: 'delivered',
    paymentStatus: 'paid',
    items: [
      { productId: 'prod_003', title: 'Guggul Resin Blend', sku: 'SD-003', quantity: 1, unitPrice: 799, lineTotal: 799, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' },
    ],
    subtotal: 799,
    shipping: 0,
    total: 799,
    shippingAddress: {
      name: 'Meera Joshi', line1: '42, Lotus Apartments', line2: 'Bandra West',
      city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '+91 98765 12345',
    },
    tracking: { carrier: 'DTDC', trackingNumber: 'DTDC44556677', url: 'https://www.dtdc.in/tracking/DTDC44556677' },
  },
  {
    id: 'ord_007',
    orderNumber: 'ORD-1007',
    customer: { id: 'usr_005', name: 'Karan Singh', email: 'karan.singh@example.com' },
    date: '2025-08-05T13:30:00Z',
    status: 'pending',
    paymentStatus: 'pending',
    items: [
      { productId: 'prod_005', title: 'Jasmine Masala Incense', sku: 'SD-005', quantity: 1, unitPrice: 449, lineTotal: 449, imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300' },
    ],
    subtotal: 449,
    shipping: 50,
    total: 499,
    shippingAddress: {
      name: 'Karan Singh', line1: '15, Green Park', line2: '',
      city: 'New Delhi', state: 'Delhi', pincode: '110016', phone: '+91 99887 76655',
    },
    tracking: null,
  },
  {
    id: 'ord_008',
    orderNumber: 'ORD-1008',
    customer: { id: 'usr_006', name: 'Ananya Reddy', email: 'ananya.r@example.com' },
    date: '2025-08-06T15:00:00Z',
    status: 'processing',
    paymentStatus: 'paid',
    items: [
      { productId: 'prod_006', title: 'Temple Essentials Combo', sku: 'SD-006', quantity: 1, unitPrice: 1499, lineTotal: 1499, imageUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=300' },
    ],
    subtotal: 1499,
    shipping: 0,
    total: 1499,
    shippingAddress: {
      name: 'Ananya Reddy', line1: '8-3-231, Jubilee Hills', line2: 'Road No. 5',
      city: 'Hyderabad', state: 'Telangana', pincode: '500033', phone: '+91 90001 23456',
    },
    tracking: null,
  },
]

// Forward-only transition rules
const VALID_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export async function getAllOrders(filter = {}) {
  let list = [...MOCK_ORDERS]
  if (filter.status && filter.status !== 'all') {
    list = list.filter(o => o.status.toLowerCase() === filter.status.toLowerCase())
  }
  return list
}

export async function getMyOrders() {
  const { currentUser } = await import('../mock-user.js')
  return MOCK_ORDERS.filter(o => o.customer?.id === currentUser.id)
}

export function getMyOrdersSync() {
  const { currentUser } = require('../mock-user.js')
  return MOCK_ORDERS.filter(o => o.customer?.id === currentUser.id)
}

export function getOrderByIdSync(id) {
  return MOCK_ORDERS.find(o => o.id === id || o.orderNumber === id) || null
}

export function getAllOrdersSync(filter = {}) {
  let list = [...MOCK_ORDERS]
  if (filter.status && filter.status !== 'all') {
    list = list.filter(o => o.status.toLowerCase() === filter.status.toLowerCase())
  }
  return list
}

export async function getOrderById(id) {
  return getOrderByIdSync(id)
}

export async function updateOrderStatus(orderId, newStatus) {
  const order = MOCK_ORDERS.find(o => o.id === orderId)
  if (!order) throw new Error('Order not found')

  const validNext = VALID_TRANSITIONS[order.status] || []
  if (!validNext.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`)
  }

  order.status = newStatus
  return order
}

export async function getValidTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || []
}

import { requireRole } from '../roles.js'
import { currentUser } from '../mock-user.js'

export async function initiateRefund(orderId, amount, reason, user = currentUser) {
  requireRole('editor', user)

  const order = MOCK_ORDERS.find(o => o.id === orderId)
  if (!order) throw new Error('Order not found')

  order.paymentStatus = 'refunded'
  return {
    success: true,
    message: `Refund of ₹${amount} initiated for order ${orderId}. Reason: ${reason}`,
  }
}
