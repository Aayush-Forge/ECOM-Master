"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/services/api';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  hsn: string;
  rate: number;
}

interface FinancialOrder {
  id: string;
  dbId: string;
  invoice: string;
  date: string;
  customer: string;
  email: string;
  state: string;
  type: 'intra' | 'inter';
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'Paid' | 'Pending' | 'Refunded' | string;
  gateway: string;
  ref: string;
  refund: number;
  items: OrderItem[];
}

interface FinancialSummary {
  grossOrderValue: number;
  paymentsCollected: number;
  refundsRecorded: number;
  totalTaxCollected: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxableAmount: number;
  totalShipping: number;
  totalDiscounts: number;
  estimatedGatewayFees: number;
  netProfit: number;
  ordersCount: number;
}

interface DailyBreakdownItem {
  date: string;
  sales: number;
  collections: number;
  ordersCount: number;
}

const DEFAULT_SUMMARY: FinancialSummary = {
  grossOrderValue: 0,
  paymentsCollected: 0,
  refundsRecorded: 0,
  totalTaxCollected: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  taxableAmount: 0,
  totalShipping: 0,
  totalDiscounts: 0,
  estimatedGatewayFees: 0,
  netProfit: 0,
  ordersCount: 0,
};

export default function AccountingPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live data states
  const [summary, setSummary] = useState<FinancialSummary>(DEFAULT_SUMMARY);
  const [breakdown, setBreakdown] = useState<DailyBreakdownItem[]>([]);
  const [orders, setOrders] = useState<FinancialOrder[]>([]);

  // Filter states
  const [dateRange, setDateRange] = useState<string>('all_time');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState<FinancialOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const money = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n || 0);
  };

  const fmtDate = (s: string) => {
    try {
      if (!s) return '—';
      const d = new Date(s.includes('T') ? s : `${s}T00:00:00`);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return s;
    }
  };

  // Fetch live accounting data from backend
  const loadAccountingData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange && dateRange !== 'all_time') params.append('range', dateRange);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter.toLowerCase());
      if (stateFilter && stateFilter !== 'all') params.append('state', stateFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const queryStr = params.toString() ? `?${params.toString()}` : '';

      // Concurrent fetch for summary, breakdown, and ledger
      const [sumRes, breakRes, ordRes] = await Promise.allSettled([
        fetchWithAuth(`/admin/accounting/summary${queryStr}`),
        fetchWithAuth(`/admin/accounting/daily-breakdown${dateRange ? `?range=${dateRange}` : ''}`),
        fetchWithAuth(`/admin/accounting/orders${queryStr}`),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value?.summary) {
        setSummary(sumRes.value.summary);
      }

      if (breakRes.status === 'fulfilled' && Array.isArray(breakRes.value)) {
        setBreakdown(breakRes.value);
      }

      if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value)) {
        setOrders(ordRes.value);
      }

      if (isRefresh) {
        showToast('Accounting ledger refreshed successfully.');
      }
    } catch (err: any) {
      console.error('Failed to load accounting data:', err);
      setError(err?.message || 'Unable to sync live financial records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, statusFilter, stateFilter, searchQuery]);

  useEffect(() => {
    loadAccountingData();
  }, [loadAccountingData]);

  // Direct CSV Export download via backend stream
  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (dateRange && dateRange !== 'all_time') params.append('range', dateRange);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter.toLowerCase());
    if (stateFilter && stateFilter !== 'all') params.append('state', stateFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    const url = `${API_BASE_URL}/admin/accounting/export-csv?${params.toString()}`;
    window.open(url, '_blank');
    showToast('Exporting financial ledger to CSV...');
  };

  const handleResetFilters = () => {
    setDateRange('all_time');
    setStatusFilter('all');
    setStateFilter('all');
    setSearchQuery('');
  };

  // Chart data calculations
  const chartItems = useMemo(() => {
    if (!breakdown || breakdown.length === 0) return [];
    return breakdown.slice(-12);
  }, [breakdown]);

  const maxChartSales = useMemo(() => {
    if (chartItems.length === 0) return 1000;
    const maxVal = Math.max(...chartItems.map((c) => Math.max(c.sales, c.collections)));
    return maxVal > 0 ? maxVal * 1.15 : 1000;
  }, [chartItems]);

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#182230] font-sans pb-16">
      {/* Top Banner & Breadcrumb Header */}
      <div className="bg-white border-b border-zinc-200 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
          <Link href="/overview" className="hover:text-zinc-800 transition">Finance</Link>
          <span>/</span>
          <strong className="text-zinc-800 font-semibold">Accounting &amp; Tax Compliance</strong>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Sridattam Financial Ledger (GST Compliant)
          </span>
          <button
            onClick={() => showToast('Financial ledger computes live SQL sales, intra/inter GST, refunds, and gateway fees.')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" /> Guide
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-8 pt-7 space-y-6">
        
        {/* Workspace Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
              Finance &amp; Statutory Accounts
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-0.5">
              Accounting &amp; Finance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-normal mt-0.5">
              Real-time sales revenue, Razorpay collections, Indian GST (HSN 33074100), and CA audit ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-2xs hover:bg-zinc-50 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <button
              onClick={() => loadAccountingData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-2xs hover:bg-zinc-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Sync Live
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-2xs hover:bg-zinc-50 transition"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-2xs hover:bg-zinc-50 transition"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-600" /> Print Report
            </button>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-900 hover:bg-rose-950 border border-rose-950 rounded-lg shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5" /> View Orders
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Gross Order Value */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>Gross order value</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-800 font-bold flex items-center justify-center text-sm">
                ₹
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-mono">
              {money(summary.grossOrderValue)}
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
              <span className="font-bold text-zinc-700">{summary.ordersCount}</span> total order transactions
            </div>
          </div>

          {/* Card 2: Payments Collected */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>Payments collected</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-mono">
              {money(summary.paymentsCollected)}
            </div>
            <div className="text-[11px] text-zinc-500">
              Realized captured gateway funds
            </div>
          </div>

          {/* Card 3: GST Collected */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>GST collected / payable</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-sm">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-mono">
              {money(summary.totalTaxCollected)}
            </div>
            <div className="text-[11px] text-zinc-500">
              Output GST (CGST/SGST/IGST)
            </div>
          </div>

          {/* Card 4: Net Estimated Profit */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>Estimated net earnings</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-mono">
              {money(summary.netProfit)}
            </div>
            <div className="text-[11px] text-zinc-500">
              After refunds, ~2.36% gateway fee &amp; GST
            </div>
          </div>
        </div>

        {/* Sales & Collections Trend Chart Panel */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Sales &amp; collections timeline</h2>
              <p className="text-[11px] text-zinc-500">Time-series daily performance from live database records · ₹</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-xs font-semibold bg-white border border-zinc-300 text-zinc-700 px-3 py-1.5 rounded-lg outline-none focus:border-rose-900"
              >
                <option value="all_time">All Time</option>
                <option value="this_month">This Month</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="today">Today</option>
              </select>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#C5D0E2]"></span>
                  Gross Order Value
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-900"></span>
                  Collected Cash
                </span>
              </div>
              <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                {chartItems.length} active period date buckets
              </span>
            </div>

            {/* Custom Bar Chart Canvas */}
            {chartItems.length === 0 ? (
              <div className="h-40 border border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center text-xs text-zinc-400">
                <Clock className="w-6 h-6 mb-1 text-zinc-300" />
                No daily order activity recorded for this period.
              </div>
            ) : (
              <div>
                <div className="h-44 border-b border-zinc-200 relative flex items-end justify-around px-2 pb-1 gap-4 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_34px,#F3F4F6_35px,#F3F4F6_36px)]">
                  {chartItems.map((item, idx) => {
                    const salesHeight = Math.min(100, Math.max(8, (item.sales / maxChartSales) * 100));
                    const paidHeight = Math.min(100, Math.max(6, (item.collections / maxChartSales) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex items-end justify-center gap-1.5 h-full relative group cursor-pointer"
                        title={`${item.date}: Sales ${money(item.sales)}, Collected ${money(item.collections)}`}
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-zinc-900 text-white text-[10px] font-mono py-1 px-2.5 rounded-md shadow-lg transition-opacity whitespace-nowrap">
                          {fmtDate(item.date)}: Sales {money(item.sales)} | Paid {money(item.collections)}
                        </div>

                        {/* Order Value Bar */}
                        <div
                          style={{ height: `${salesHeight}%` }}
                          className="w-4 sm:w-6 bg-[#C5D0E2] rounded-t-sm transition-all duration-500 group-hover:bg-[#B3C0D6]"
                        />
                        {/* Collected Bar */}
                        <div
                          style={{ height: `${paidHeight}%` }}
                          className="w-4 sm:w-6 bg-rose-900 rounded-t-sm transition-all duration-500 group-hover:bg-rose-950"
                        />
                      </div>
                    );
                  })}
                </div>
                {/* Axis Labels */}
                <div className="flex justify-around text-xs text-zinc-500 pt-2 font-medium">
                  {chartItems.map((item, idx) => (
                    <span key={idx} className="text-[10px] sm:text-xs">
                      {fmtDate(item.date).split(' ')[0]} {fmtDate(item.date).split(' ')[1]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Accounting Ledger Section */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Order accounting ledger</h2>
              <p className="text-[11px] text-zinc-500">Live order-level sales, GST tax split, gateway references, and tax invoices</p>
            </div>
            <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full font-mono">
              {orders.length} records
            </span>
          </div>

          {/* Filters Toolbar */}
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <input
                type="text"
                placeholder="Search order number, invoice, customer, or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-white border border-zinc-300 text-zinc-800 placeholder-zinc-400 px-3 py-2 rounded-lg outline-none focus:border-rose-900 w-full sm:w-72"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg outline-none focus:border-rose-900"
              >
                <option value="all">All payment statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="text-xs bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg outline-none focus:border-rose-900"
              >
                <option value="all">All destination states</option>
                <option value="Karnataka">Karnataka (Intra-state)</option>
                <option value="Maharashtra">Maharashtra (Inter-state)</option>
                <option value="Tamil Nadu">Tamil Nadu (Inter-state)</option>
                <option value="Telangana">Telangana (Inter-state)</option>
                <option value="Delhi">Delhi (Inter-state)</option>
                <option value="Uttar Pradesh">Uttar Pradesh (Inter-state)</option>
              </select>
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset filters
            </button>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#FAFBFD] text-zinc-500 uppercase text-[10px] tracking-wider font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Order / Invoice</th>
                  <th className="py-3 px-4">Order date</th>
                  <th className="py-3 px-4">Customer / State</th>
                  <th className="py-3 px-4">Taxable value</th>
                  <th className="py-3 px-4">GST split</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Reference / Gateway</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-rose-900" />
                        <span>Synchronizing live database ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400 text-sm">
                      No financial records match the specified filters.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const isIntra = order.type === 'intra';
                    const cgst = isIntra ? order.tax / 2 : 0;
                    const sgst = isIntra ? order.tax / 2 : 0;
                    const igst = isIntra ? 0 : order.tax;

                    return (
                      <tr key={order.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <span 
                            className="font-bold text-rose-900 hover:underline cursor-pointer" 
                            onClick={() => setSelectedOrder(order)}
                          >
                            {order.id}
                          </span>
                          <div className="text-[11px] text-zinc-400 font-normal">
                            {order.invoice}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-700 font-medium">
                          {fmtDate(order.date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-zinc-800">{order.customer || 'Guest'}</span>
                          <div className="text-[11px] text-zinc-400">{order.state || 'Karnataka'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-800">
                          {money(order.subtotal)}
                          {order.discount > 0 && (
                            <div className="text-[10px] text-emerald-600 font-sans font-normal">
                              -Disc {money(order.discount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isIntra ? (
                            <div>
                              <span className="font-semibold text-zinc-700 font-mono">CGST {money(cgst)}</span>
                              <div className="text-[10px] text-zinc-400 font-mono">SGST {money(sgst)}</div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-zinc-700 font-mono">IGST {money(igst)}</span>
                              <div className="text-[10px] text-zinc-400 font-sans">Inter-state</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                          {money(order.total)}
                          <div className="text-[10px] text-zinc-400 font-sans font-normal">
                            Ship {order.shipping > 0 ? money(order.shipping) : 'FREE'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-600">
                          {order.ref === '—' || !order.ref ? (
                            <span className="text-zinc-400 italic">Not captured</span>
                          ) : (
                            <span className="font-medium text-zinc-700">{order.ref}</span>
                          )}
                          <div className="text-[10px] text-zinc-400 font-sans">{order.gateway}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Print GST Tax Invoice"
                              onClick={() => window.open(`${API_BASE_URL}/admin/orders/${order.dbId}/invoice`, '_blank')}
                              className="p-1.5 text-zinc-600 hover:text-rose-900 bg-white border border-zinc-200 hover:border-zinc-300 rounded-md shadow-2xs transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Print Shipping Label (4x6)"
                              onClick={() => window.open(`${API_BASE_URL}/admin/orders/${order.dbId}/shipping-label`, '_blank')}
                              className="p-1.5 text-zinc-600 hover:text-rose-900 bg-white border border-zinc-200 hover:border-zinc-300 rounded-md shadow-2xs transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 hover:text-rose-900 bg-white border border-zinc-200 hover:border-zinc-300 px-2.5 py-1 rounded-md shadow-2xs transition"
                            >
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
            <span>Showing {orders.length} orders from live database</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">HSN Code 33074100 (Incense &amp; Sacred Aromas)</span>
            </div>
          </div>
        </div>

        {/* Lower Grid: GST Summary & Payment Reconciliation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: GST Summary */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">GST statutory breakdown</h3>
                  <p className="text-[11px] text-zinc-500">Live output tax liability calculated per GST Rule 46</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 px-2.5 py-1 rounded-md transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3 text-zinc-600" /> Export
                </button>
              </div>

              <div className="divide-y divide-zinc-100 text-xs">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold">
                      ↔
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">Net Taxable Goods Value</div>
                      <div className="text-[11px] text-zinc-400">Excludes shipping, after bundle &amp; coupon discounts</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-zinc-900">{money(summary.taxableAmount)}</div>
                </div>

                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold">
                      ⌂
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">CGST (Central Tax)</div>
                      <div className="text-[11px] text-zinc-400">Intra-state supplies (Karnataka consignees)</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-zinc-900">{money(summary.cgst)}</div>
                </div>

                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold">
                      ⌂
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">SGST / UTGST (State Tax)</div>
                      <div className="text-[11px] text-zinc-400">Intra-state supplies (Karnataka consignees)</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-zinc-900">{money(summary.sgst)}</div>
                </div>

                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold">
                      ⇢
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">IGST (Integrated Tax)</div>
                      <div className="text-[11px] text-zinc-400">Inter-state supplies (Outside Karnataka consignees)</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-zinc-900">{money(summary.igst)}</div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-[#F8FAFF] border-t border-zinc-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-900 text-xs">Total Statutory Output GST</div>
                <div className="text-[10px] text-zinc-500">To be filed in GSTR-1 / GSTR-3B</div>
              </div>
              <div className="font-mono font-black text-rose-900 text-sm">
                {money(summary.totalTaxCollected)}
              </div>
            </div>
          </div>

          {/* Card 2: Payment Reconciliation */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Payment reconciliation &amp; costs</h3>
                  <p className="text-[11px] text-zinc-500">Razorpay / UPI collections and platform gateway fees</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Reconciled
                </span>
              </div>

              <div className="divide-y divide-zinc-100 text-xs">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">Successful Collections</div>
                      <div className="text-[11px] text-zinc-400">Funds captured via Razorpay / Online PG</div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-zinc-800">
                    {money(summary.paymentsCollected)}
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">Refunds Recorded</div>
                      <div className="text-[11px] text-zinc-400">Processed order cancellations &amp; refunds</div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-zinc-800">
                    {money(summary.refundsRecorded)}
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      %
                    </div>
                    <div>
                      <div className="font-bold text-zinc-800">Estimated Gateway Charges</div>
                      <div className="text-[11px] text-zinc-400">2% Razorpay transaction fee + 18% GST (2.36%)</div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-zinc-800">
                    -{money(summary.estimatedGatewayFees)}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-[#F8FAFF] border-t border-zinc-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-900 text-xs">Net Realized Cash Inflow</div>
                <div className="text-[10px] text-zinc-500">Collected minus refunds and gateway processing fees</div>
              </div>
              <div className="font-mono font-black text-emerald-700 text-sm">
                {money(summary.paymentsCollected - summary.refundsRecorded - summary.estimatedGatewayFees)}
              </div>
            </div>
          </div>
        </div>

        {/* Footnote Compliance Notice */}
        <p className="text-[11px] text-zinc-500 leading-relaxed max-w-4xl pt-2">
          * Tax amounts are calculated in accordance with the Indian Central Goods and Services Tax Act (CGST), Karnataka State GST (SGST), and Integrated GST (IGST) for HSN Code 33074100 (Incense Sticks &amp; Sacred Aromas). Official tax invoices are verifiable under Rule 46.
        </p>

      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 font-mono">
                  {selectedOrder.id} · {selectedOrder.invoice}
                </h3>
                <p className="text-xs text-zinc-500">
                  Order placed {fmtDate(selectedOrder.date)} · Status: <span className="font-bold text-zinc-800">{selectedOrder.status}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center text-lg font-bold transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Meta Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase">Customer</span>
                  <strong className="text-zinc-800 block mt-0.5">{selectedOrder.customer || 'Guest'}</strong>
                  <span className="text-zinc-500 text-[11px]">{selectedOrder.email || '—'}</span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase">Place of supply</span>
                  <strong className="text-zinc-800 block mt-0.5">{selectedOrder.state || 'Karnataka'}</strong>
                  <span className="text-zinc-500 text-[11px]">
                    {selectedOrder.type === 'intra' ? 'Intra-state (CGST+SGST)' : 'Inter-state (IGST)'}
                  </span>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase">Payment reference</span>
                  <strong className="text-zinc-800 font-mono block mt-0.5">{selectedOrder.ref}</strong>
                  <span className="text-zinc-500 text-[11px]">{selectedOrder.gateway}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Items Purchased
                </h4>
                <div className="border border-zinc-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-500 text-[10px]">
                      <tr>
                        <th className="p-2.5">Product / HSN</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Taxable</th>
                        <th className="p-2.5 text-right">GST Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-medium text-zinc-800">
                              {it.name}
                              <div className="text-[10px] text-zinc-400 font-mono">HSN {it.hsn || '33074100'}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono">{it.qty}</td>
                            <td className="p-2.5 text-right font-mono">{money(it.price)}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{money(it.qty * it.price)}</td>
                            <td className="p-2.5 text-right font-mono text-zinc-500">{it.rate || 18}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-zinc-400 italic">
                            Order items details available via Tax Invoice.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Calculations breakdown */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs space-y-2">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal (Taxable Value)</span>
                  <span className="font-mono font-medium">{money(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount Applied</span>
                    <span className="font-mono">-{money(selectedOrder.discount)}</span>
                  </div>
                )}
                {selectedOrder.type === 'intra' ? (
                  <>
                    <div className="flex justify-between text-zinc-600">
                      <span>CGST (Central GST)</span>
                      <span className="font-mono font-medium">{money(selectedOrder.tax / 2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>SGST (State GST)</span>
                      <span className="font-mono font-medium">{money(selectedOrder.tax / 2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-zinc-600">
                    <span>IGST (Integrated GST)</span>
                    <span className="font-mono font-medium">{money(selectedOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping Charges</span>
                  <span className="font-mono font-medium">{selectedOrder.shipping > 0 ? money(selectedOrder.shipping) : 'FREE'}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-zinc-900 border-t border-zinc-200 pt-2">
                  <span>Order Grand Total</span>
                  <span className="font-mono text-rose-900">{money(selectedOrder.total)}</span>
                </div>
                {selectedOrder.refund > 0 && (
                  <div className="flex justify-between text-xs font-bold text-rose-600 pt-1">
                    <span>Refund Recorded</span>
                    <span className="font-mono">-{money(selectedOrder.refund)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2.5">
              <Link
                href={`/orders/${selectedOrder.dbId}`}
                className="px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Order Operations
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/shipping-label`, '_blank')}
                  className="px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-600" /> Print Shipping Label
                </button>
                <button
                  onClick={() => window.open(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/invoice`, '_blank')}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-900 hover:bg-rose-950 rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Print Tax Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
