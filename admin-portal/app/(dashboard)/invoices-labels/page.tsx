"use client";

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/services/api';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    sku?: string;
  };
}

interface Order {
  id: string;
  invoiceNumber: string;
  status: string;
  shippingLabelStatus: string;
  totalAmount: number;
  subtotal?: number;
  shippingCharge: number;
  clubbingDiscount: number;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    region?: string;
  };
  items?: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Preview Modal State
  const [modalType, setModalType] = useState<'invoice' | 'label' | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/orders');
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.user?.name && order.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.shippingAddress?.city && order.shippingAddress.city.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalInvoices = orders.filter((o) => o.invoiceNumber).length;
  const labelsReady = orders.filter((o) => o.shippingLabelStatus === 'GENERATED').length;

  const openPreview = (orderId: string, type: 'invoice' | 'label') => {
    setSelectedOrderId(orderId);
    setModalType(type);
  };

  const closePreview = () => {
    setSelectedOrderId(null);
    setModalType(null);
  };

  const getDirectUrl = (orderId: string, type: 'invoice' | 'label') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${baseUrl}/orders/${orderId}/${type === 'invoice' ? 'invoice' : 'shipping-label'}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Logistics & Fulfillment
              </span>
              <span className="text-xs text-slate-400">GST Compliant & Auto-Barcode</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
              Orders, Invoices & Shipping Labels
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Generate print-ready Tax Invoices, dispatch-ready 4×6&quot; logistics shipping labels, and track customer shipments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/overview"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium transition"
            >
              ← Dashboard
            </a>
            <button
              onClick={loadOrders}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <a
              href="/shipping-slabs"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Manage Shipping Slabs
            </a>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-semibold tracking-wider">Total Orders</span>
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{orders.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active customer fulfillments</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-semibold tracking-wider">Total Volume</span>
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-emerald-400">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-500 mt-1">Gross merchandise value</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-semibold tracking-wider">Invoices Ready</span>
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-amber-300">{totalInvoices}</div>
            <p className="text-xs text-slate-500 mt-1">Tax Invoices generated</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-semibold tracking-wider">Shipping Labels</span>
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-cyan-300">{labelsReady}</div>
            <p className="text-xs text-slate-500 mt-1">Ready for courier dispatch</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Invoice #, customer..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            {['ALL', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p>Loading orders and fulfillment documents...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-base font-semibold text-slate-300">No orders found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or place a test order on the storefront.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 tracking-wider">
                    <th className="py-4 px-6">Order Details</th>
                    <th className="py-4 px-6">Customer & Destination</th>
                    <th className="py-4 px-6">Items & Weight</th>
                    <th className="py-4 px-6">Fulfillment Pricing</th>
                    <th className="py-4 px-6">Document Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredOrders.map((order) => {
                    const itemCount = order.items?.reduce((sum, it) => sum + it.quantity, 0) || 1;
                    const estimatedWeight = (itemCount * 0.25).toFixed(2);

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/30 transition">
                        {/* Order & Invoice ID */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white">#{order.id.slice(0, 10)}...</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {order.invoiceNumber || 'INV-PENDING'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-200">
                            {order.user?.name || 'Guest Customer'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {order.shippingAddress?.city || 'Delhi'}, {order.shippingAddress?.state || 'Delhi'}
                          </div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            PIN: {order.shippingAddress?.pincode || '110001'}
                          </div>
                        </td>

                        {/* Items & Weight */}
                        <td className="py-4 px-6">
                          <div className="text-slate-300 font-medium">
                            {itemCount} {itemCount === 1 ? 'pack' : 'packs'}
                          </div>
                          <div className="text-xs text-indigo-400 font-mono mt-0.5">
                            Approx. {estimatedWeight} kg
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {order.items && order.items[0]?.product?.name ? order.items[0].product.name : 'Vedic Incense / Dhoop'}
                          </div>
                        </td>

                        {/* Pricing */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">
                            ₹{order.totalAmount?.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs mt-0.5 flex items-center gap-1">
                            <span className="text-slate-400">Shipping:</span>
                            {order.shippingCharge === 0 ? (
                              <span className="text-emerald-400 font-semibold">FREE</span>
                            ) : (
                              <span className="text-slate-300 font-mono">₹{order.shippingCharge}</span>
                            )}
                          </div>
                          {order.clubbingDiscount > 0 && (
                            <div className="text-xs text-indigo-400">
                              -₹{order.clubbingDiscount} Clubbing
                            </div>
                          )}
                        </td>

                        {/* Status Badges */}
                        <td className="py-4 px-6 space-y-1.5">
                          <div>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                order.status === 'DELIVERED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : order.status === 'SHIPPED'
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              ● {order.status || 'CONFIRMED'}
                            </span>
                          </div>
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              Label: {order.shippingLabelStatus || 'GENERATED'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Invoice Button */}
                            <button
                              onClick={() => openPreview(order.id, 'invoice')}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Preview / Print GST Tax Invoice"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Invoice
                            </button>

                            {/* Shipping Label Button */}
                            <button
                              onClick={() => openPreview(order.id, 'label')}
                              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Preview / Print Logistics Shipping Label"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Label
                            </button>

                            {/* Direct Print in New Tab */}
                            <a
                              href={getDirectUrl(order.id, 'invoice')}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Open Raw Printable in New Tab"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Embedded Live Print Preview Modal */}
      {modalType && selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${modalType === 'invoice' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {modalType === 'invoice' ? 'Tax Invoice Preview (A4 Printable)' : 'Logistics Shipping Label (4"x6")'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Order Reference: #{selectedOrderId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={getDirectUrl(selectedOrderId, modalType)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </a>
                <button
                  onClick={closePreview}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body: Live IFrame */}
            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              <iframe
                src={getDirectUrl(selectedOrderId, modalType)}
                className="w-full h-full bg-white rounded-lg border-0 shadow-inner"
                title="Document Preview"
              />
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <span>Ready for high-resolution thermal or laser printing.</span>
              <span>Backend API: Port 5000</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
