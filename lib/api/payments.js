/**
 * Payments API client — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend payment endpoints are ready.
 */

const MOCK_PAYMENTS = [
  {
    id: 'pay_RZP001',
    orderId: 'ord_001',
    orderNumber: 'ORD-1001',
    customer: 'Meera Joshi',
    amount: 1047,
    method: 'Razorpay',
    status: 'pending',
    date: '2025-07-28T10:32:00Z',
  },
  {
    id: 'pay_RZP002',
    orderId: 'ord_002',
    orderNumber: 'ORD-1002',
    customer: 'Karan Singh',
    amount: 599,
    method: 'Razorpay',
    status: 'paid',
    date: '2025-07-30T14:18:00Z',
  },
  {
    id: 'pay_RZP003',
    orderId: 'ord_003',
    orderNumber: 'ORD-1003',
    customer: 'Ananya Reddy',
    amount: 1247,
    method: 'Razorpay',
    status: 'paid',
    date: '2025-08-01T09:48:00Z',
  },
  {
    id: 'pay_RZP004',
    orderId: 'ord_004',
    orderNumber: 'ORD-1004',
    customer: 'Vikram Desai',
    amount: 2298,
    method: 'UPI',
    status: 'paid',
    date: '2025-07-20T16:03:00Z',
  },
  {
    id: 'pay_RZP005',
    orderId: 'ord_005',
    orderNumber: 'ORD-1005',
    customer: 'Sonia Gupta',
    amount: 399,
    method: 'Razorpay',
    status: 'failed',
    date: '2025-08-03T11:22:00Z',
  },
  {
    id: 'pay_RZP006',
    orderId: 'ord_006',
    orderNumber: 'ORD-1006',
    customer: 'Meera Joshi',
    amount: 799,
    method: 'UPI',
    status: 'paid',
    date: '2025-07-10T08:05:00Z',
  },
  {
    id: 'pay_RZP007',
    orderId: 'ord_007',
    orderNumber: 'ORD-1007',
    customer: 'Karan Singh',
    amount: 499,
    method: 'Razorpay',
    status: 'pending',
    date: '2025-08-05T13:33:00Z',
  },
  {
    id: 'pay_RZP008',
    orderId: 'ord_008',
    orderNumber: 'ORD-1008',
    customer: 'Ananya Reddy',
    amount: 1499,
    method: 'Razorpay',
    status: 'paid',
    date: '2025-07-15T17:48:00Z',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllPaymentsSync(filter = {}) {
  let list = [...MOCK_PAYMENTS]
  if (filter.status && filter.status !== 'all') {
    list = list.filter(p => p.status.toLowerCase() === filter.status.toLowerCase())
  }
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** Get all payment records (staff/admin view). */
export async function getAllPayments(filter = {}) {
  return getAllPaymentsSync(filter);
}

/** Get payment record for a specific order. */
export async function getPaymentByOrderId(orderId) {
  // return fetch(`/api/admin/payments?orderId=${orderId}`).then(r => r.json());
  return MOCK_PAYMENTS.find((p) => p.orderId === orderId) || null;
}
