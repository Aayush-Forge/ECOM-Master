"use client";

import { openAuthenticatedUrl, downloadAuthenticatedDocument } from '@/lib/utils';

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
  AlertCircle,
  Calendar,
  Filter
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


function getDatePresetRange(preset: string) {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (preset === 'today') {
    const s = formatYMD(now);
    return { start: s, end: s };
  }
  if (preset === 'last_7_days') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: formatYMD(from), end: formatYMD(now) };
  }
  if (preset === 'last_30_days') {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: formatYMD(from), end: formatYMD(now) };
  }
  if (preset === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: formatYMD(from), end: formatYMD(now) };
  }
  if (preset === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: formatYMD(from), end: formatYMD(to) };
  }
  return { start: '', end: '' };
}

function generateOrdersReportHtml({
  orders,
  dateFrom,
  dateTo,
  dateRangeLabel,
  statusFilter,
  stateFilter,
}: {
  orders: FinancialOrder[];
  dateFrom?: string;
  dateTo?: string;
  dateRangeLabel: string;
  statusFilter: string;
  stateFilter: string;
}) {
  const formatNumber = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  const now = new Date();
  const generatedAt = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const periodText = dateFrom || dateTo
    ? `${dateFrom || 'Earliest'} to ${dateTo || 'Today'}`
    : dateRangeLabel.replace(/_/g, ' ').toUpperCase();

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;
  let totalGrand = 0;

  const rows = orders.map((o, idx) => {
    const isIntra = o.type === 'intra';
    const cgst = isIntra ? o.tax / 2 : 0;
    const sgst = isIntra ? o.tax / 2 : 0;
    const igst = isIntra ? 0 : o.tax;

    totalTaxable += o.subtotal;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    totalTax += o.tax;
    totalGrand += o.total;

    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    const statusBg = o.status === 'Paid' ? '#ecfdf5' : o.status === 'Pending' ? '#fffbeb' : '#fef2f2';
    const statusColor = o.status === 'Paid' ? '#065f46' : o.status === 'Pending' ? '#92400e' : '#991b1b';

    return `
      <tr style="background: ${bg};">
        <td style="padding: 5px 6px; text-align: center; border: 1px solid #e5e7eb; font-family: monospace;">${idx + 1}</td>
        <td style="padding: 5px 6px; font-weight: 700; border: 1px solid #e5e7eb; font-family: monospace; color: #881337;">${o.id}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-family: monospace; color: #4b5563;">${o.invoice || '—'}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">${o.date}</td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${o.customer || 'Guest'}</div>
          <div style="font-size: 7.5px; color: #6b7280;">${o.state || 'Karnataka'}</div>
        </td>
        <td style="padding: 5px 6px; text-align: right; border: 1px solid #e5e7eb; font-family: monospace;">${formatNumber(o.subtotal)}</td>
        <td style="padding: 5px 6px; text-align: right; border: 1px solid #e5e7eb; font-family: monospace;">
          ${isIntra 
            ? `<div>C: ${formatNumber(cgst)}</div><div style="color: #6b7280; font-size: 7.5px;">S: ${formatNumber(sgst)}</div>` 
            : `<div>I: ${formatNumber(igst)}</div>`}
        </td>
        <td style="padding: 5px 6px; text-align: right; border: 1px solid #e5e7eb; font-family: monospace; font-weight: 700; color: #111827;">${formatNumber(o.total)}</td>
        <td style="padding: 5px 6px; text-align: center; border: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: 700; font-size: 7.5px; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">${o.status}</span>
        </td>
        <td style="padding: 5px 6px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 7.5px; color: #4b5563;">
          <div>${o.ref && o.ref !== '—' ? o.ref : 'None'}</div>
          <div style="color: #9ca3af; font-family: sans-serif;">${o.gateway || 'Razorpay'}</div>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sridattam Orders Report - ${periodText}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #111827;
      background: #ffffff;
      font-size: 8.5px;
      line-height: 1.35;
    }
    .report-sheet {
      width: 100%;
      max-width: 100%;
      background: #ffffff;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8px;
      border-bottom: 2px solid #881337;
      margin-bottom: 8px;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 900;
      color: #881337;
      letter-spacing: 0.05em;
      line-height: 1.1;
    }
    .report-title {
      font-size: 11px;
      font-weight: 700;
      color: #1f2937;
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.02em;
    }
    .report-sub {
      font-size: 8px;
      color: #6b7280;
      margin-top: 1px;
    }
    .meta-box {
      text-align: right;
      font-size: 8.5px;
      color: #374151;
      line-height: 1.45;
    }
    .summary-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }
    .summary-cell {
      border-right: 1px solid #e2e8f0;
      padding-right: 6px;
    }
    .summary-cell:last-child {
      border-right: none;
      padding-right: 0;
    }
    .summary-label {
      font-size: 7.5px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .summary-val {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
      margin-top: 1px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      font-size: 8px;
    }
    table.report-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7.5px;
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      letter-spacing: 0.03em;
    }
    table.report-table td {
      border: 1px solid #e2e8f0;
    }
    .report-footer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5px;
      color: #94a3b8;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-sheet" id="printable-orders-report">
    <div class="report-header">
      <div>
        <div class="brand-name">SRIDATTAM VEDIC</div>
        <div class="report-title">Orders Accounting &amp; GST Audit Report</div>
        <div class="report-sub">Compliant with Central Goods and Services Tax (CGST) &amp; SGST Rules (HSN 33074100)</div>
      </div>
      <div class="meta-box">
        <div><strong>Period:</strong> ${periodText}</div>
        <div><strong>Generated:</strong> ${generatedAt}</div>
        <div><strong>Filters:</strong> Status: ${statusFilter.toUpperCase()} • State: ${stateFilter}</div>
        <div><strong>Total Records:</strong> ${orders.length} orders</div>
      </div>
    </div>

    <div class="summary-strip">
      <div class="summary-cell">
        <div class="summary-label">Total Orders</div>
        <div class="summary-val">${orders.length}</div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Taxable Value</div>
        <div class="summary-val">₹${formatNumber(totalTaxable)}</div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">CGST Output</div>
        <div class="summary-val">₹${formatNumber(totalCgst)}</div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">SGST Output</div>
        <div class="summary-val">₹${formatNumber(totalSgst)}</div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">IGST Output</div>
        <div class="summary-val">₹${formatNumber(totalIgst)}</div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Total Grand Value</div>
        <div class="summary-val" style="color: #881337;">₹${formatNumber(totalGrand)}</div>
      </div>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 24px; text-align: center;">#</th>
          <th style="width: 70px; text-align: left;">Order #</th>
          <th style="width: 85px; text-align: left;">Invoice #</th>
          <th style="width: 65px; text-align: left;">Date</th>
          <th style="text-align: left;">Customer / State</th>
          <th style="width: 75px; text-align: right;">Taxable (₹)</th>
          <th style="width: 85px; text-align: right;">GST Split (₹)</th>
          <th style="width: 75px; text-align: right;">Total (₹)</th>
          <th style="width: 60px; text-align: center;">Status</th>
          <th style="width: 105px; text-align: left;">Ref / Gateway</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="10" style="padding: 16px; text-align: center; color: #94a3b8;">No orders recorded for this selected period.</td></tr>'}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 800; border-top: 1.5px solid #cbd5e1;">
          <td colspan="5" style="padding: 6px 8px; text-align: right; text-transform: uppercase;">Totals (${orders.length} orders):</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace;">₹${formatNumber(totalTaxable)}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace;">₹${formatNumber(totalTax)}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #881337;">₹${formatNumber(totalGrand)}</td>
          <td colspan="2" style="padding: 6px 8px; text-align: center; font-size: 7.5px; color: #64748b;">CA Ledger Verified</td>
        </tr>
      </tfoot>
    </table>

    <div class="report-footer">
      <span>Official Document • Sridattam Enterprises Pvt Ltd</span>
      <span>GST Rule 46 Compliant Tax Accounting Record</span>
      <span>Confidential Audit Copy</span>
    </div>
  </div>
</body>
</html>`;
}

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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Print & Export Orders Report Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [modalDateRange, setModalDateRange] = useState<string>('all_time');
  const [modalStartDate, setModalStartDate] = useState<string>('');
  const [modalEndDate, setModalEndDate] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<string>('all');
  const [modalState, setModalState] = useState<string>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

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
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (dateRange && dateRange !== 'all_time' && !startDate && !endDate) params.append('range', dateRange);
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
  }, [dateRange, startDate, endDate, statusFilter, stateFilter, searchQuery]);

  useEffect(() => {
    loadAccountingData();
  }, [loadAccountingData]);

  const handlePresetSelect = (preset: string) => {
    setDateRange(preset);
    if (preset === 'all_time') {
      setStartDate('');
      setEndDate('');
    } else {
      const { start, end } = getDatePresetRange(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleModalPresetSelect = (preset: string) => {
    setModalDateRange(preset);
    if (preset === 'all_time') {
      setModalStartDate('');
      setModalEndDate('');
    } else {
      const { start, end } = getDatePresetRange(preset);
      setModalStartDate(start);
      setModalEndDate(end);
    }
  };

  // Direct CSV Export download via backend stream
  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (dateRange && dateRange !== 'all_time' && !startDate && !endDate) params.append('range', dateRange);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter.toLowerCase());
    if (stateFilter && stateFilter !== 'all') params.append('state', stateFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    const url = `${API_BASE_URL}/admin/accounting/export-csv?${params.toString()}`;
    openAuthenticatedUrl(url);
    showToast('Exporting financial ledger to CSV...');
  };

  const handleResetFilters = () => {
    setDateRange('all_time');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setStateFilter('all');
    setSearchQuery('');
  };

  // Print orders report (A4 landscape PDF, clean orders table without screen UI)
  const executePrintOrders = (targetOrders: FinancialOrder[], fromStr: string, toStr: string, status: string, state: string) => {
    const html = generateOrdersReportHtml({
      orders: targetOrders,
      dateFrom: fromStr,
      dateTo: toStr,
      dateRangeLabel: dateRange,
      statusFilter: status,
      stateFilter: state,
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1000px';
    iframe.style.height = '1000px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      showToast('Failed to open print context.');
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print trigger error:', e);
      }
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    }, 400);
  };

  // Download orders report as A4 landscape PDF via vector print / Save as PDF
  const executeDownloadOrdersPdf = (targetOrders: FinancialOrder[], fromStr: string, toStr: string, status: string, state: string) => {
    executePrintOrders(targetOrders, fromStr, toStr, status, state);
  };

  const openPrintModal = () => {
    setModalDateRange(dateRange);
    setModalStartDate(startDate);
    setModalEndDate(endDate);
    setModalStatus(statusFilter);
    setModalState(stateFilter);
    setIsPrintModalOpen(true);
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
              onClick={openPrintModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-2xs hover:bg-zinc-50 transition"
              title="Print formatted Orders PDF report"
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
            <div className="flex items-center gap-2">
              <button
                onClick={openPrintModal}
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                title="Print formatted Orders PDF report"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-600" /> Print Report
              </button>
              <button
                onClick={() => executeDownloadOrdersPdf(orders, startDate, endDate, statusFilter, stateFilter)}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-900 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                title="Download formatted Orders PDF"
              >
                <Download className="w-3.5 h-3.5 text-rose-800" /> Download PDF
              </button>
              <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-full font-mono">
                {orders.length} records
              </span>
            </div>
          </div>

          {/* Filters Toolbar with Period & Date Ranges */}
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <input
                type="text"
                placeholder="Search order #, invoice, customer, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-white border border-zinc-300 text-zinc-800 placeholder-zinc-400 px-3 py-2 rounded-lg outline-none focus:border-rose-900 w-full sm:w-56"
              />

              {/* Date Presets */}
              <select
                value={dateRange}
                onChange={(e) => handlePresetSelect(e.target.value)}
                className="text-xs font-medium bg-white border border-zinc-300 text-zinc-700 px-3 py-2 rounded-lg outline-none focus:border-rose-900"
              >
                <option value="all_time">All Time</option>
                <option value="today">Today</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* From Date */}
              <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-400">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateRange('custom');
                  }}
                  className="bg-transparent text-xs text-zinc-800 outline-none w-28 cursor-pointer"
                  title="Filter orders from date"
                />
              </div>

              {/* To Date */}
              <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-400">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateRange('custom');
                  }}
                  className="bg-transparent text-xs text-zinc-800 outline-none w-28 cursor-pointer"
                  title="Filter orders to date"
                />
              </div>

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
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFBFD] text-zinc-500 uppercase text-[10px] tracking-wider font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-2.5 px-3">Order / Invoice</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer / State</th>
                  <th className="py-2.5 px-3">Taxable</th>
                  <th className="py-2.5 px-3">GST Split</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Gateway</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
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
                        <td className="py-2.5 px-3 font-mono">
                          <span 
                            className="font-bold text-rose-900 hover:underline cursor-pointer" 
                            onClick={() => setSelectedOrder(order)}
                          >
                            {order.id}
                          </span>
                          <div className="text-[10px] text-zinc-400 font-normal">
                            {order.invoice}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700 font-medium whitespace-nowrap text-[11px]">
                          {fmtDate(order.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-zinc-800 block truncate max-w-[130px]">{order.customer || 'Guest'}</span>
                          <div className="text-[10px] text-zinc-400">{order.state || 'Karnataka'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-800 whitespace-nowrap">
                          {money(order.subtotal)}
                          {order.discount > 0 && (
                            <div className="text-[9.5px] text-emerald-600 font-sans font-normal">
                              -Disc {money(order.discount)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isIntra ? (
                            <div>
                              <span className="font-semibold text-zinc-700 font-mono text-[11px]">CGST {money(cgst)}</span>
                              <div className="text-[9.5px] text-zinc-400 font-mono">SGST {money(sgst)}</div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-zinc-700 font-mono text-[11px]">IGST {money(igst)}</span>
                              <div className="text-[9.5px] text-zinc-400 font-sans">Inter-state</div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 whitespace-nowrap">
                          {money(order.total)}
                          <div className="text-[9.5px] text-zinc-400 font-sans font-normal">
                            {order.shipping > 0 ? `Ship ${money(order.shipping)}` : 'FREE Ship'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
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
                        <td className="py-2.5 px-3 font-mono text-zinc-600 whitespace-nowrap text-[11px]">
                          {order.ref === '—' || !order.ref ? (
                            <span className="text-zinc-400 italic">None</span>
                          ) : (
                            <span className="font-medium text-zinc-700 truncate max-w-[100px] block" title={order.ref}>{order.ref}</span>
                          )}
                          <div className="text-[9.5px] text-zinc-400 font-sans">{order.gateway}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Print / View GST Tax Invoice"
                              onClick={() => openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${order.dbId}/invoice`)}
                              className="p-1 text-zinc-600 hover:text-rose-900 bg-white border border-zinc-200 hover:border-zinc-300 rounded shadow-2xs transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Download GST Tax Invoice (PDF)"
                              onClick={() => downloadAuthenticatedDocument(`${API_BASE_URL}/admin/orders/${order.dbId}/invoice`)}
                              className="p-1 text-emerald-700 hover:text-emerald-900 bg-white border border-zinc-200 hover:border-emerald-300 rounded shadow-2xs transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Print / View Shipping Label (4x6)"
                              onClick={() => openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${order.dbId}/shipping-label`)}
                              className="p-1 text-zinc-600 hover:text-rose-900 bg-white border border-zinc-200 hover:border-zinc-300 rounded shadow-2xs transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Download Shipping Label (PDF)"
                              onClick={() => downloadAuthenticatedDocument(`${API_BASE_URL}/admin/orders/${order.dbId}/shipping-label`)}
                              className="p-1 text-sky-700 hover:text-sky-900 bg-white border border-zinc-200 hover:border-sky-300 rounded shadow-2xs transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center text-[11px] font-bold text-zinc-700 hover:text-rose-900 bg-white border border-zinc-200 hover:border-zinc-300 px-2 py-0.5 rounded shadow-2xs transition"
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/shipping-label`)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-600" /> View Label
                </button>
                <button
                  onClick={() => downloadAuthenticatedDocument(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/shipping-label`)}
                  className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-sky-700" /> Download Label (PDF)
                </button>
                <button
                  onClick={() => openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/invoice`)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-600" /> View Invoice
                </button>
                <button
                  onClick={() => downloadAuthenticatedDocument(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/invoice`)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-900 hover:bg-rose-950 rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Invoice (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Print & Export Orders Report Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-zinc-200 flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-rose-900" />
                  Print &amp; Export Orders Report
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Select the date range ("from when to when") and filters to print a clean, formatted A4 landscape PDF of the orders table for accounting and CA audits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

          <div className="space-y-4 py-3">
            {/* Quick Period Presets */}
            <div>
              <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                Quick Date Range
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all_time', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'last_7_days', label: 'Last 7 Days' },
                  { id: 'last_30_days', label: 'Last 30 Days' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleModalPresetSelect(p.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                      modalDateRange === p.id
                        ? 'bg-rose-900 text-white border-rose-900 font-bold shadow-2xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom From Date to To Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  From Date
                </label>
                <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs">
                  <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="date"
                    value={modalStartDate}
                    onChange={(e) => {
                      setModalStartDate(e.target.value);
                      setModalDateRange('custom');
                    }}
                    className="w-full bg-transparent text-xs text-zinc-800 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  To Date
                </label>
                <div className="flex items-center gap-2 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs">
                  <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="date"
                    value={modalEndDate}
                    onChange={(e) => {
                      setModalEndDate(e.target.value);
                      setModalDateRange('custom');
                    }}
                    className="w-full bg-transparent text-xs text-zinc-800 outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Additional Status Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  Payment Status Filter
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-300 text-zinc-800 px-3 py-2 rounded-lg outline-none focus:border-rose-900"
                >
                  <option value="all">All payment statuses</option>
                  <option value="paid">Paid only</option>
                  <option value="pending">Pending only</option>
                  <option value="refunded">Refunded only</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  Destination State Filter
                </label>
                <select
                  value={modalState}
                  onChange={(e) => setModalState(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-300 text-zinc-800 px-3 py-2 rounded-lg outline-none focus:border-rose-900"
                >
                  <option value="all">All States</option>
                  <option value="Karnataka">Karnataka (Intra-state)</option>
                  <option value="Maharashtra">Maharashtra (Inter-state)</option>
                  <option value="Tamil Nadu">Tamil Nadu (Inter-state)</option>
                  <option value="Telangana">Telangana (Inter-state)</option>
                  <option value="Delhi">Delhi (Inter-state)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (Inter-state)</option>
                </select>
              </div>
            </div>

            {/* Live Filter Summary Callout */}
            {(() => {
              const reportFiltered = orders.filter((o) => {
                if (modalStatus !== 'all' && o.status.toLowerCase() !== modalStatus.toLowerCase()) return false;
                if (modalState !== 'all' && !(o.state || '').toLowerCase().includes(modalState.toLowerCase())) return false;
                if (modalStartDate && o.date < modalStartDate) return false;
                if (modalEndDate && o.date > modalEndDate) return false;
                return true;
              });

              const totalVal = reportFiltered.reduce((sum, o) => sum + o.total, 0);
              const totalTax = reportFiltered.reduce((sum, o) => sum + o.tax, 0);

              return (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950 block">Report Scope Summary:</span>
                    <span className="text-[11px] text-rose-800">
                      Period: {modalStartDate || modalEndDate ? `${modalStartDate || 'Earliest'} to ${modalEndDate || 'Today'}` : modalDateRange.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm block text-rose-950">
                      {reportFiltered.length} orders
                    </span>
                    <span className="text-[10px] text-rose-700">
                      {money(totalVal)} total (GST: {money(totalTax)})
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-4 border-t border-zinc-100 mt-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const reportFiltered = orders.filter((o) => {
                      if (modalStatus !== 'all' && o.status.toLowerCase() !== modalStatus.toLowerCase()) return false;
                      if (modalState !== 'all' && !(o.state || '').toLowerCase().includes(modalState.toLowerCase())) return false;
                      if (modalStartDate && o.date < modalStartDate) return false;
                      if (modalEndDate && o.date > modalEndDate) return false;
                      return true;
                    });
                    executePrintOrders(reportFiltered, modalStartDate, modalEndDate, modalStatus, modalState);
                    setIsPrintModalOpen(false);
                  }}
                  className="flex items-center text-xs font-bold px-3.5 py-2 rounded-lg text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-100 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5 text-zinc-600" />
                  Print Orders Table
                </button>

                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={async () => {
                    const reportFiltered = orders.filter((o) => {
                      if (modalStatus !== 'all' && o.status.toLowerCase() !== modalStatus.toLowerCase()) return false;
                      if (modalState !== 'all' && !(o.state || '').toLowerCase().includes(modalState.toLowerCase())) return false;
                      if (modalStartDate && o.date < modalStartDate) return false;
                      if (modalEndDate && o.date > modalEndDate) return false;
                      return true;
                    });
                    await executeDownloadOrdersPdf(reportFiltered, modalStartDate, modalEndDate, modalStatus, modalState);
                    setIsPrintModalOpen(false);
                  }}
                  className="flex items-center text-xs font-bold px-4 py-2 rounded-lg text-white bg-rose-900 hover:bg-rose-950 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
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
