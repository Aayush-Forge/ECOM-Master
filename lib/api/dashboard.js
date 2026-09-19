/**
 * Dashboard API client — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend dashboard endpoints are ready.
 */

import { getAllOrdersSync } from './orders';
import { getAdminProductsSync } from './products-api';

export function getDashboardStatsSync() {
  const orders = getAllOrdersSync();
  const products = getAdminProductsSync();

  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrdersCount = orders.filter(
    (o) => o.status?.toLowerCase() === 'pending' || o.status?.toLowerCase() === 'processing'
  ).length;

  const lowStockCount = products.filter(
    (p) => p.stock === undefined || p.stock <= 5
  ).length;

  return { totalOrders, totalRevenue, pendingOrdersCount, lowStockCount };
}

export function getRecentOrdersSync(limit = 5) {
  const orders = getAllOrdersSync();
  return [...orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

/**
 * Get dashboard stats: total order count, total revenue, pending orders count, low stock count.
 */
export async function getDashboardStats() {
  return getDashboardStatsSync();
}

/**
 * Get recent orders list (sorted by date descending).
 */
export async function getRecentOrders(limit = 5) {
  return getRecentOrdersSync(limit);
}
