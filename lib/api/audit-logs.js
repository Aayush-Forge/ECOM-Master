/**
 * Audit Logs API client — mock implementation.
 *
 * Append-only immutable record of critical write actions across the system.
 * Visible ONLY to Admin users.
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend audit-logs endpoints are ready.
 */

let MOCK_AUDIT_LOGS = [
  {
    id: 'aud_001',
    timestamp: '2025-08-19T16:45:12Z',
    userId: 'usr_001',
    userName: 'Aayush Sharma',
    userEmail: 'aayush@sridattam.com',
    userRole: 'admin',
    actionType: 'product.price_updated',
    entityType: 'product',
    entityId: 'prod_001',
    entityLabel: 'Premium Sandalwood Agarbatti (SD-001)',
    beforeValue: {
      sku: 'SD-001',
      title: 'Premium Sandalwood Agarbatti',
      basePrice: 499,
      salePrice: 449,
    },
    afterValue: {
      sku: 'SD-001',
      title: 'Premium Sandalwood Agarbatti',
      basePrice: 599,
      salePrice: 549,
    },
    ipAddress: '203.0.113.195',
  },
  {
    id: 'aud_002',
    timestamp: '2025-08-19T14:22:05Z',
    userId: 'usr_002',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@sridattam.com',
    userRole: 'editor',
    actionType: 'order.status_changed',
    entityType: 'order',
    entityId: 'ord_002',
    entityLabel: 'Order #ORD-1002 (Karan Singh)',
    beforeValue: {
      orderNumber: 'ORD-1002',
      status: 'pending',
      paymentStatus: 'paid',
      updatedAt: '2025-08-19T10:00:00Z',
    },
    afterValue: {
      orderNumber: 'ORD-1002',
      status: 'processing',
      paymentStatus: 'paid',
      updatedAt: '2025-08-19T14:22:05Z',
    },
    ipAddress: '198.51.100.42',
  },
  {
    id: 'aud_003',
    timestamp: '2025-08-18T11:15:30Z',
    userId: 'usr_002',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@sridattam.com',
    userRole: 'editor',
    actionType: 'refund.issued',
    entityType: 'order',
    entityId: 'ord_005',
    entityLabel: 'Order #ORD-1005 (Sonia Gupta)',
    beforeValue: {
      orderNumber: 'ORD-1005',
      paymentStatus: 'failed',
      total: 399,
      refundAmount: 0,
    },
    afterValue: {
      orderNumber: 'ORD-1005',
      paymentStatus: 'refunded',
      total: 399,
      refundAmount: 399,
      reason: 'Failed delivery & customer cancellation request',
    },
    ipAddress: '198.51.100.42',
  },
  {
    id: 'aud_004',
    timestamp: '2025-08-17T09:30:00Z',
    userId: 'usr_001',
    userName: 'Aayush Sharma',
    userEmail: 'aayush@sridattam.com',
    userRole: 'admin',
    actionType: 'user.role_changed',
    entityType: 'user',
    entityId: 'usr_002',
    entityLabel: 'User: Priya Patel (priya.patel@sridattam.com)',
    beforeValue: {
      id: 'usr_002',
      email: 'priya.patel@sridattam.com',
      role: 'read_only',
    },
    afterValue: {
      id: 'usr_002',
      email: 'priya.patel@sridattam.com',
      role: 'editor',
    },
    ipAddress: '203.0.113.195',
  },
  {
    id: 'aud_005',
    timestamp: '2025-08-16T17:05:44Z',
    userId: 'usr_001',
    userName: 'Aayush Sharma',
    userEmail: 'aayush@sridattam.com',
    userRole: 'admin',
    actionType: 'product.deleted',
    entityType: 'product',
    entityId: 'prod_008',
    entityLabel: 'Discontinued Brass Incense Burner',
    beforeValue: {
      id: 'prod_008',
      sku: 'SD-008',
      title: 'Discontinued Brass Incense Burner',
      basePrice: 899,
      stockQuantity: 0,
    },
    afterValue: null,
    ipAddress: '203.0.113.195',
  },
  {
    id: 'aud_006',
    timestamp: '2025-08-15T12:10:19Z',
    userId: 'usr_002',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@sridattam.com',
    userRole: 'editor',
    actionType: 'discount.created',
    entityType: 'discount',
    entityId: 'disc_003',
    entityLabel: 'Diwali Festive Combo 20%',
    beforeValue: null,
    afterValue: {
      id: 'disc_003',
      name: 'Diwali Festive Combo 20%',
      type: 'percentage_off_bundle',
      percentageOff: 20,
      requiredQuantity: 3,
      isActive: true,
    },
    ipAddress: '198.51.100.42',
  },
  {
    id: 'aud_007',
    timestamp: '2025-08-14T15:40:00Z',
    userId: 'usr_002',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@sridattam.com',
    userRole: 'editor',
    actionType: 'discount.updated',
    entityType: 'discount',
    entityId: 'disc_001',
    entityLabel: 'Puja Special Trio Bundle',
    beforeValue: {
      id: 'disc_001',
      name: 'Puja Special Trio Bundle',
      fixedPrice: 799,
      isActive: true,
    },
    afterValue: {
      id: 'disc_001',
      name: 'Puja Special Trio Bundle',
      fixedPrice: 699,
      isActive: true,
    },
    ipAddress: '198.51.100.42',
  },
  {
    id: 'aud_008',
    timestamp: '2025-08-13T10:00:22Z',
    userId: 'usr_001',
    userName: 'Aayush Sharma',
    userEmail: 'aayush@sridattam.com',
    userRole: 'admin',
    actionType: 'discount.deleted',
    entityType: 'discount',
    entityId: 'disc_004',
    entityLabel: 'Monsoon Flash Sale 15%',
    beforeValue: {
      id: 'disc_004',
      name: 'Monsoon Flash Sale 15%',
      percentageOff: 15,
      isActive: false,
    },
    afterValue: null,
    ipAddress: '203.0.113.195',
  },
  {
    id: 'aud_009',
    timestamp: '2025-08-12T16:20:10Z',
    userId: 'usr_002',
    userName: 'Priya Patel',
    userEmail: 'priya.patel@sridattam.com',
    userRole: 'editor',
    actionType: 'inventory.updated',
    entityType: 'inventory',
    entityId: 'prod_003',
    entityLabel: 'Guggul Resin Blend (SD-003)',
    beforeValue: {
      productId: 'prod_003',
      sku: 'SD-003',
      title: 'Guggul Resin Blend',
      stockQuantity: 12,
    },
    afterValue: {
      productId: 'prod_003',
      sku: 'SD-003',
      title: 'Guggul Resin Blend',
      stockQuantity: 50,
    },
    ipAddress: '198.51.100.42',
  },
  {
    id: 'aud_010',
    timestamp: '2025-08-11T11:05:00Z',
    userId: 'usr_001',
    userName: 'Aayush Sharma',
    userEmail: 'aayush@sridattam.com',
    userRole: 'admin',
    actionType: 'product.created',
    entityType: 'product',
    entityId: 'prod_009',
    entityLabel: 'Organic Vedic Hawan Samagri',
    beforeValue: null,
    afterValue: {
      id: 'prod_009',
      sku: 'SD-009',
      title: 'Organic Vedic Hawan Samagri',
      basePrice: 349,
      stockQuantity: 100,
      status: 'active',
    },
    ipAddress: '203.0.113.195',
  },
];

// ---------------------------------------------------------------------------
// Public Query API (Append-only: No delete or update exports exist)
// ---------------------------------------------------------------------------

/**
 * Synchronous query for audit logs with filtering.
 * @param {Object} filters
 */
export function getAuditLogsSync(filters = {}) {
  let list = [...MOCK_AUDIT_LOGS];

  if (filters.userId && filters.userId !== 'all') {
    list = list.filter((log) => log.userId === filters.userId);
  }

  if (filters.actionType && filters.actionType !== 'all') {
    list = list.filter((log) => log.actionType.toLowerCase() === filters.actionType.toLowerCase());
  }

  if (filters.entityType && filters.entityType !== 'all') {
    list = list.filter((log) => log.entityType.toLowerCase() === filters.entityType.toLowerCase());
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    list = list.filter((log) => new Date(log.timestamp).getTime() >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    list = list.filter((log) => new Date(log.timestamp).getTime() <= end);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (log) =>
        log.actionType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        (log.entityLabel && log.entityLabel.toLowerCase().includes(q)) ||
        log.userName.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        (log.ipAddress && log.ipAddress.includes(q))
    );
  }

  return list;
}

/**
 * Asynchronous query for audit logs with filtering.
 * @param {Object} filters
 */
export async function getAuditLogs(filters = {}) {
  // Simulates network latency
  return getAuditLogsSync(filters);
}
