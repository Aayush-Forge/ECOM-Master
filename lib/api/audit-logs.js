/**
 * Audit Logs API client — real backend implementation.
 * Append-only immutable record of critical write actions across the system.
 * Connects to NestJS AuditLogsController via NEXT_PUBLIC_BACKEND_URL.
 * Visible ONLY to Admin users.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.access_token || session.token || null;
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function normalizeAuditLog(log) {
  if (!log) return null;
  return {
    ...log,
    id: log.id,
    timestamp: log.timestamp || log.createdAt,
    userId: log.userId,
    userName: log.user?.name || log.userName || log.userEmail || log.userId,
    userEmail: log.user?.email || log.userEmail || '',
    userRole: log.userRole || log.user?.role || 'admin',
    actionType: log.actionType,
    entityType: log.entityType,
    entityId: log.entityId,
    entityLabel: log.entityLabel || `${log.entityType}: ${log.entityId}`,
    beforeValue: log.beforeValue,
    afterValue: log.afterValue,
    ipAddress: log.ipAddress || '—',
  };
}

export function getAuditLogsSync() {
  return [];
}

/**
 * Asynchronous query for audit logs from real backend with filtering.
 * @param {Object} filters
 */
export async function getAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.userId && filters.userId !== 'all') params.set('userId', filters.userId);
  if (filters.actionType && filters.actionType !== 'all') params.set('actionType', filters.actionType);
  if (filters.entityType && filters.entityType !== 'all') params.set('entityType', filters.entityType);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.limit) params.set('limit', filters.limit);

  const url = `${BACKEND_URL}/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return [];
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch audit logs (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data || [];
  let result = list.map(normalizeAuditLog).filter(Boolean);

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (log) =>
        log.actionType?.toLowerCase().includes(q) ||
        log.entityId?.toLowerCase().includes(q) ||
        log.entityLabel?.toLowerCase().includes(q) ||
        log.userName?.toLowerCase().includes(q) ||
        log.userEmail?.toLowerCase().includes(q) ||
        log.ipAddress?.includes(q)
    );
  }

  return result;
}
