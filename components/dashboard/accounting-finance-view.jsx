'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  IndianRupee,
  Download,
  Printer,
  Plus,
  Check,
  Clock,
  RotateCcw,
  FileText,
  ArrowUpRight,
  Search,
  RotateCw,
  HelpCircle,
  X,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'

const INITIAL_SAMPLE_ORDERS = [
  {
    id: "ORD-1048",
    invoice: "INV-2026-048",
    date: "2026-10-24",
    customer: "Ananya Rao",
    email: "ananya.rao@example.com",
    state: "Karnataka",
    type: "intra",
    items: [
      { name: "Premium Incense Sticks", qty: 2, price: 180, hsn: "33074100", rate: 5 },
      { name: "Dhoop Cones", qty: 1, price: 240, hsn: "33074100", rate: 5 }
    ],
    shipping: 49,
    status: "Paid",
    gateway: "Razorpay",
    ref: "pay_demo_8KQ241",
    refund: 0
  },
  {
    id: "ORD-1047",
    invoice: "INV-2026-047",
    date: "2026-10-23",
    customer: "Rohan Mehta",
    email: "rohan.m@example.com",
    state: "Maharashtra",
    type: "inter",
    items: [
      { name: "Sambrani Kit", qty: 2, price: 320, hsn: "33074100", rate: 5 }
    ],
    shipping: 49,
    status: "Paid",
    gateway: "UPI",
    ref: "UPI-DEMO-731028",
    refund: 0
  },
  {
    id: "ORD-1046",
    invoice: "INV-2026-046",
    date: "2026-10-22",
    customer: "Kavya Iyer",
    email: "kavya.iyer@example.com",
    state: "Tamil Nadu",
    type: "inter",
    items: [
      { name: "Dhoop Sticks", qty: 3, price: 150, hsn: "33074100", rate: 5 },
      { name: "Premium Incense Sticks", qty: 1, price: 180, hsn: "33074100", rate: 5 }
    ],
    shipping: 99,
    status: "Pending",
    gateway: "Razorpay",
    ref: "—",
    refund: 0
  },
  {
    id: "ORD-1045",
    invoice: "INV-2026-045",
    date: "2026-10-21",
    customer: "Arjun Reddy",
    email: "arjun.r@example.com",
    state: "Telangana",
    type: "inter",
    items: [
      { name: "Sambrani Kit", qty: 1, price: 320, hsn: "33074100", rate: 5 },
      { name: "Dhoop Cones", qty: 2, price: 240, hsn: "33074100", rate: 5 }
    ],
    shipping: 49,
    status: "Paid",
    gateway: "Card",
    ref: "CARD-DEMO-92014",
    refund: 0
  },
  {
    id: "ORD-1044",
    invoice: "INV-2026-044",
    date: "2026-10-20",
    customer: "Meera Shetty",
    email: "meera.s@example.com",
    state: "Karnataka",
    type: "intra",
    items: [
      { name: "Dhoop Sticks", qty: 2, price: 150, hsn: "33074100", rate: 5 }
    ],
    shipping: 49,
    status: "Refunded",
    gateway: "Razorpay",
    ref: "pay_demo_2MZ913",
    refund: 180
  },
  {
    id: "ORD-1043",
    invoice: "INV-2026-043",
    date: "2026-10-18",
    customer: "Nikhil Shah",
    email: "nikhil.s@example.com",
    state: "Maharashtra",
    type: "inter",
    items: [
      { name: "Premium Incense Sticks", qty: 4, price: 180, hsn: "33074100", rate: 5 }
    ],
    shipping: 99,
    status: "Paid",
    gateway: "UPI",
    ref: "UPI-DEMO-621109",
    refund: 0
  },
  {
    id: "ORD-1042",
    invoice: "INV-2026-042",
    date: "2026-10-16",
    customer: "Pooja Nair",
    email: "pooja.n@example.com",
    state: "Karnataka",
    type: "intra",
    items: [
      { name: "Sambrani Kit", qty: 1, price: 320, hsn: "33074100", rate: 5 },
      { name: "Dhoop Sticks", qty: 1, price: 150, hsn: "33074100", rate: 5 }
    ],
    shipping: 49,
    status: "Pending",
    gateway: "Razorpay",
    ref: "—",
    refund: 0
  },
  {
    id: "ORD-1041",
    invoice: "INV-2026-041",
    date: "2026-10-14",
    customer: "Sanjay Kulkarni",
    email: "sanjay.k@example.com",
    state: "Maharashtra",
    type: "inter",
    items: [
      { name: "Dhoop Cones", qty: 2, price: 240, hsn: "33074100", rate: 5 }
    ],
    shipping: 49,
    status: "Paid",
    gateway: "Card",
    ref: "CARD-DEMO-71302",
    refund: 0
  }
]

const MONTHLY_TREND_DATA = [
  { m: "May", sales: 28400, paid: 25100 },
  { m: "Jun", sales: 32100, paid: 29700 },
  { m: "Jul", sales: 30800, paid: 28200 },
  { m: "Aug", sales: 39700, paid: 36500 },
  { m: "Sep", sales: 42100, paid: 38800 },
  { m: "Oct", sales: 48560, paid: 37140 }
]

export default function AccountingFinanceView() {
  const [orders, setOrders] = useState(INITIAL_SAMPLE_ORDERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [chartRange, setChartRange] = useState(6)

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // New Invoice Form state
  const [newCustomer, setNewCustomer] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newState, setNewState] = useState('Karnataka')
  const [newItemName, setNewItemName] = useState('Premium Incense Sticks')
  const [newItemQty, setNewItemQty] = useState(2)
  const [newItemPrice, setNewItemPrice] = useState(180)
  const [newShipping, setNewShipping] = useState(49)
  const [newStatus, setNewStatus] = useState('Paid')
  const [newGateway, setNewGateway] = useState('UPI')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const money = (n) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0)
  }

  const fmtDate = (s) => {
    try {
      return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return s
    }
  }

  const calc = (o) => {
    const taxable = o.items.reduce((s, i) => s + i.qty * i.price, 0)
    const tax = o.items.reduce((s, i) => s + (i.qty * i.price * i.rate) / 100, 0)
    const shippingTaxable = o.shipping || 0
    const total = taxable + tax + shippingTaxable
    const intra = o.type === 'intra'
    return {
      taxable,
      tax,
      cgst: intra ? tax / 2 : 0,
      sgst: intra ? tax / 2 : 0,
      igst: intra ? 0 : tax,
      shipping: shippingTaxable,
      total,
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return orders.filter((o) => {
      const matchesQ =
        !q ||
        [o.id, o.invoice, o.customer, o.email, o.ref, o.gateway, o.state]
          .join(' ')
          .toLowerCase()
          .includes(q)
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      const matchesState = stateFilter === 'all' || o.state === stateFilter
      const matchesMonth = !monthFilter || o.date.startsWith(monthFilter)
      return matchesQ && matchesStatus && matchesState && matchesMonth
    })
  }, [orders, searchQuery, statusFilter, stateFilter, monthFilter])

  // Overall Financial Metric calculations based on active orders
  const metrics = useMemo(() => {
    const gross = orders.reduce((s, o) => s + calc(o).total, 0)
    const collected = orders
      .filter((o) => o.status === 'Paid')
      .reduce((s, o) => s + calc(o).total, 0)
    const gst = orders.reduce((s, o) => s + calc(o).tax, 0)
    const refunds = orders.reduce((s, o) => s + (o.refund || 0), 0)
    return { gross, collected, gst, refunds }
  }, [orders])

  // Filtered GST Breakdown calculations
  const gstBreakdown = useMemo(() => {
    let intra = 0
    let inter = 0
    let taxable = 0
    let shipping = 0

    filteredOrders.forEach((o) => {
      const c = calc(o)
      taxable += c.taxable
      if (o.type === 'intra') {
        intra += c.tax
      } else {
        inter += c.tax
      }
      shipping += c.shipping
    })

    const total = intra + inter
    return {
      taxable,
      cgst: intra / 2,
      sgst: intra / 2,
      igst: inter,
      total,
      shipping,
    }
  }, [filteredOrders])

  // Payment reconciliation calculations
  const reconciliation = useMemo(() => {
    const paid = filteredOrders.filter((o) => o.status === 'Paid')
    const pending = filteredOrders.filter((o) => o.status === 'Pending')
    const refunded = filteredOrders.filter((o) => o.status === 'Refunded')

    const paidTotal = paid.reduce((s, o) => s + calc(o).total, 0)
    const pendingTotal = pending.reduce((s, o) => s + calc(o).total, 0)
    const refundedTotal = refunded.reduce((s, o) => s + (o.refund || 0), 0)

    return {
      paidCount: paid.length,
      paidTotal,
      pendingCount: pending.length,
      pendingTotal,
      refundedCount: refunded.length,
      refundedTotal,
    }
  }, [filteredOrders])

  const csvEscape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`

  const downloadCSV = (rows, filename) => {
    const headers = [
      'Order ID',
      'Invoice Number',
      'Date',
      'Customer',
      'Customer Email',
      'Supply State',
      'Product Details',
      'HSN',
      'Taxable Value INR',
      'CGST INR',
      'SGST INR',
      'IGST INR',
      'Shipping INR',
      'Order Total INR',
      'Payment Status',
      'Gateway',
      'Payment Reference',
      'Refund Recorded INR',
    ]

    const lines = [
      headers,
      ...rows.map((o) => {
        const c = calc(o)
        return [
          o.id,
          o.invoice,
          o.date,
          o.customer,
          o.email,
          o.state,
          o.items.map((i) => `${i.name} x${i.qty}`).join('; '),
          [...new Set(o.items.map((i) => i.hsn))].join('; '),
          c.taxable.toFixed(2),
          c.cgst.toFixed(2),
          c.sgst.toFixed(2),
          c.igst.toFixed(2),
          c.shipping.toFixed(2),
          c.total.toFixed(2),
          o.status,
          o.gateway,
          o.ref,
          (o.refund || 0).toFixed(2),
        ]
      }),
    ].map((r) => r.map(csvEscape).join(','))

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV report generated and downloaded successfully')
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setStateFilter('all')
    setMonthFilter('')
    showToast('Filters reset to default view')
  }

  const handleCreateInvoice = (e) => {
    e.preventDefault()
    if (!newCustomer.trim()) {
      showToast('Customer name is required')
      return
    }
    const nextIdx = orders.length + 1
    const isIntra = newState.toLowerCase() === 'karnataka'
    const newOrder = {
      id: `ORD-${1040 + nextIdx}`,
      invoice: `INV-2026-0${40 + nextIdx}`,
      date: new Date().toISOString().split('T')[0],
      customer: newCustomer.trim(),
      email: newEmail.trim() || `${newCustomer.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      state: newState,
      type: isIntra ? 'intra' : 'inter',
      items: [
        {
          name: newItemName,
          qty: Number(newItemQty) || 1,
          price: Number(newItemPrice) || 150,
          hsn: '33074100',
          rate: 5,
        },
      ],
      shipping: Number(newShipping) || 49,
      status: newStatus,
      gateway: newGateway,
      ref: newStatus === 'Paid' ? `PAY-REC-${Date.now().toString().slice(-6)}` : '—',
      refund: 0,
    }

    setOrders([newOrder, ...orders])
    setShowCreateInvoiceModal(false)
    showToast(`Invoice ${newOrder.invoice} successfully recorded!`)
    setNewCustomer('')
    setNewEmail('')
  }

  // Chart data
  const chartData = MONTHLY_TREND_DATA.slice(-chartRange)
  const maxSales = Math.max(...chartData.map((x) => x.sales)) * 1.15

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Bar */}
      <div className="bg-white border border-stone-200 rounded-xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <span>Finance</span>
          <span>/</span>
          <strong className="text-stone-800 font-bold">Accounting dashboard</strong>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Demo data (Sridattam Ledger)
          </span>
          <button
            onClick={() => showToast('Use filters to review orders, View for GST breakdown, and Export CSV to download audit records.')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Main Header & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
            Finance Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-stone-900 tracking-tight mt-0.5">
            Accounting &amp; Finance
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-inter mt-0.5">
            Track sales, reconcile payments, manage GST and export your financial records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => downloadCSV(filteredOrders, 'accounting-ledger.csv')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-lg shadow-2xs hover:bg-stone-50 transition"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-lg shadow-2xs hover:bg-stone-50 transition"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Print report</span>
          </button>
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Prototype Alert Notice */}
      <div className="bg-[#EFF4FE] border border-[#D5E2FD] text-[#294C9B] rounded-xl p-3.5 text-xs leading-relaxed flex items-start gap-2.5 shadow-2xs">
        <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-indigo-950">Prototype notice:</strong> This dashboard uses illustrative sample orders and calculations. Connect it to your order database, payment gateway and verified GST configuration before using it for real accounting or tax filing.
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Gross Order Value */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Gross order value</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">
              ₹
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono">
            {money(metrics.gross)}
          </div>
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span className="font-bold text-emerald-600">↑ 8.4%</span> vs previous period
          </div>
        </div>

        {/* Card 2: Payments Collected */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Payments collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono">
            {money(metrics.collected)}
          </div>
          <div className="text-[11px] text-stone-500">
            Successful captured payments
          </div>
        </div>

        {/* Card 3: GST Collected */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>GST collected / payable*</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-sm">
              <FileText className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono">
            {money(metrics.gst)}
          </div>
          <div className="text-[11px] text-stone-500">
            Illustrative output GST on listed orders
          </div>
        </div>

        {/* Card 4: Refunds Recorded */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500">
            <span>Refunds recorded</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-sm">
              <RotateCcw className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono">
            {money(metrics.refunds)}
          </div>
          <div className="text-[11px] text-stone-500">
            Review gateway settlement before filing
          </div>
        </div>
      </div>

      {/* Sales & Collections Trend Chart Panel */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Sales &amp; collections</h2>
            <p className="text-[11px] text-stone-500">Illustrative monthly performance · ₹</p>
          </div>
          <select
            value={chartRange}
            onChange={(e) => setChartRange(Number(e.target.value))}
            className="text-xs font-semibold bg-white border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500"
          >
            <option value={6}>Last 6 months</option>
            <option value={4}>Last 4 months</option>
            <option value={3}>Last 3 months</option>
          </select>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-4">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#C5D0E2]"></span>
                Order value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600"></span>
                Collected
              </span>
            </div>
            <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
              Sample trend
            </span>
          </div>

          {/* Bar Chart Canvas */}
          <div className="h-40 border-b border-stone-200 relative flex items-end justify-around px-2 pb-1 gap-4 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_34px,#F5F7FA_35px,#F5F7FA_36px)]">
            {chartData.map((item, idx) => {
              const salesHeight = (item.sales / maxSales) * 100
              const paidHeight = (item.paid / maxSales) * 100
              return (
                <div
                  key={idx}
                  className="flex-1 flex items-end justify-center gap-1.5 h-full relative group cursor-pointer"
                  title={`${item.m}: Sales ${money(item.sales)}, Collected ${money(item.paid)}`}
                >
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-stone-900 text-white text-[10px] font-mono py-1 px-2 rounded shadow-lg transition-opacity whitespace-nowrap">
                    Sales: {money(item.sales)} | Paid: {money(item.paid)}
                  </div>

                  <div
                    style={{ height: `${salesHeight}%` }}
                    className="w-4 sm:w-6 bg-[#C5D0E2] rounded-t-sm transition-all duration-500 group-hover:bg-[#B3C0D6]"
                  />
                  <div
                    style={{ height: `${paidHeight}%` }}
                    className="w-4 sm:w-6 bg-indigo-600 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-700"
                  />
                </div>
              )
            })}
          </div>
          {/* Axis Labels */}
          <div className="flex justify-around text-xs text-stone-500 pt-2 font-medium">
            {chartData.map((item, idx) => (
              <span key={idx}>{item.m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Order Accounting Ledger Section */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Order accounting ledger</h2>
            <p className="text-[11px] text-stone-500">Order-level sales, taxes, payment references and invoice status</p>
          </div>
          <span className="text-xs font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full font-mono">
            {filteredOrders.length} records
          </span>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order, customer, payment ref…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-stone-300 text-stone-800 placeholder-stone-400 pl-8 pr-3 py-2 rounded-lg outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-stone-300 text-stone-700 px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
            >
              <option value="all">All payment statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="text-xs bg-white border border-stone-300 text-stone-700 px-3 py-2 rounded-lg outline-none focus:border-indigo-500"
            >
              <option value="all">All supply states</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
            </select>

            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-xs bg-white border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-100 px-3 py-2 rounded-lg transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#FAFBFD] text-stone-500 uppercase text-[10px] tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Order / Invoice</th>
                <th className="py-3 px-4">Order date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Taxable value</th>
                <th className="py-3 px-4">GST split</th>
                <th className="py-3 px-4">Order total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Reference no.</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400 text-sm">
                    No financial records match the specified filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const c = calc(order)
                  const unitsCount = order.items.reduce((s, it) => s + it.qty, 0)

                  return (
                    <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span
                          className="font-bold text-indigo-600 hover:underline cursor-pointer"
                          onClick={() => setSelectedOrder(order)}
                        >
                          {order.id}
                        </span>
                        <div className="text-[11px] text-stone-400 font-normal">
                          {order.invoice}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-700 font-medium">
                        {fmtDate(order.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-800">{order.customer}</span>
                        <div className="text-[11px] text-stone-400">{order.state}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {money(c.taxable)}
                        <div className="text-[10px] text-stone-400 font-sans font-normal">
                          {unitsCount} item units
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {order.type === 'intra' ? (
                          <div>
                            <span className="font-semibold text-stone-700 font-mono">CGST {money(c.cgst)}</span>
                            <div className="text-[10px] text-stone-400 font-mono">SGST {money(c.sgst)}</div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-stone-700 font-mono">IGST {money(c.igst)}</span>
                            <div className="text-[10px] text-stone-400 font-sans">Inter-state</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        {money(c.total)}
                        <div className="text-[10px] text-stone-400 font-sans font-normal">
                          Ship {money(c.shipping)}
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
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {order.ref === '—' ? (
                          <span className="text-stone-400 italic">Not captured</span>
                        ) : (
                          <span className="font-medium text-stone-700">{order.ref}</span>
                        )}
                        <div className="text-[10px] text-stone-400 font-sans">{order.gateway}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 hover:text-indigo-600 bg-white border border-stone-200 hover:border-indigo-300 px-2.5 py-1 rounded-md shadow-2xs transition"
                        >
                          <span>View</span> <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>Showing {filteredOrders.length} of {orders.length} sample orders</span>
          <div className="flex items-center gap-1">
            <span className="px-2.5 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold">
              1
            </span>
            <button
              onClick={() => showToast('All sample orders are visible on this page.')}
              className="px-2.5 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Lower Grid: GST Summary & Payment Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: GST Summary */}
        <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">GST summary</h3>
                <p className="text-[11px] text-stone-500">Based on the currently filtered ledger</p>
              </div>
              <button
                onClick={() => downloadCSV(filteredOrders, 'gst-summary-report.csv')}
                className="text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 px-2.5 py-1 rounded-md transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold">
                    ↔
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">Taxable goods value</div>
                    <div className="text-[11px] text-stone-400">Before GST, excludes shipping</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-stone-900">{money(gstBreakdown.taxable)}</div>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold">
                    ⌂
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">CGST</div>
                    <div className="text-[11px] text-stone-400">Intra-state sample supplies</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-stone-900">{money(gstBreakdown.cgst)}</div>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold">
                    ⌂
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">SGST / UTGST</div>
                    <div className="text-[11px] text-stone-400">Intra-state sample supplies</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-stone-900">{money(gstBreakdown.sgst)}</div>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold">
                    ⇢
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">IGST</div>
                    <div className="text-[11px] text-stone-400">Inter-state sample supplies</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-stone-900">{money(gstBreakdown.igst)}</div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 bg-[#F8FAFF] border-t border-stone-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-stone-900 text-xs">Total illustrative output GST</div>
              <div className="text-[10px] text-stone-500">Before credits / adjustments</div>
            </div>
            <div className="font-mono font-black text-indigo-700 text-sm">
              {money(gstBreakdown.total)}
            </div>
          </div>
        </div>

        {/* Card 2: Payment Reconciliation */}
        <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Payment reconciliation</h3>
                <p className="text-[11px] text-stone-500">Check gateway references against settlements</p>
              </div>
              <span className="text-xs font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full">
                Overview
              </span>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">Successful payments</div>
                    <div className="text-[11px] text-stone-400">Marked as paid in sample ledger</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-stone-800">
                  {reconciliation.paidCount} orders · {money(reconciliation.paidTotal)}
                </div>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">Pending payments</div>
                    <div className="text-[11px] text-stone-400">Awaiting successful capture</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-stone-800">
                  {reconciliation.pendingCount} orders · {money(reconciliation.pendingTotal)}
                </div>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">Refunded orders</div>
                    <div className="text-[11px] text-stone-400">Confirm actual refund transaction</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-stone-800">
                  {reconciliation.refundedCount} order · {money(reconciliation.refundedTotal)}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 bg-[#F8FAFF] border-t border-stone-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-stone-900 text-xs">Unreconciled payment references</div>
              <div className="text-[10px] text-stone-500">Reference numbers are demo values</div>
            </div>
            <div className="font-bold text-amber-600 text-xs bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Review required
            </div>
          </div>
        </div>
      </div>

      {/* Footnote Compliance Notice */}
      <p className="text-[11px] text-stone-500 leading-relaxed max-w-4xl pt-2">
        * GST shown is an illustrative output-tax summary, not a final GST liability calculation. Actual liability can depend on credit notes, returns, input tax credit, place-of-supply rules, exemptions, payment adjustments and filing-period treatment.
      </p>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-mono">
                  {selectedOrder.id} · {selectedOrder.invoice}
                </h3>
                <p className="text-xs text-stone-500">
                  Order placed {fmtDate(selectedOrder.date)} · Status: <span className="font-bold text-stone-800">{selectedOrder.status}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-lg font-bold transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Meta Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Customer</span>
                  <strong className="text-stone-800 block mt-0.5">{selectedOrder.customer}</strong>
                  <span className="text-stone-500 text-[11px]">{selectedOrder.email}</span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Place of supply</span>
                  <strong className="text-stone-800 block mt-0.5">{selectedOrder.state}</strong>
                  <span className="text-stone-500 text-[11px]">
                    {selectedOrder.type === 'intra' ? 'Intra-state (CGST+SGST)' : 'Inter-state (IGST)'}
                  </span>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">Payment reference</span>
                  <strong className="text-stone-800 font-mono block mt-0.5">{selectedOrder.ref}</strong>
                  <span className="text-stone-500 text-[11px]">{selectedOrder.gateway}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                  Items Purchased
                </h4>
                <div className="border border-stone-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b border-stone-200 font-bold text-stone-500 text-[10px]">
                      <tr>
                        <th className="p-2.5">Product / HSN</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Taxable</th>
                        <th className="p-2.5 text-right">GST Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-stone-800">
                            {it.name}
                            <div className="text-[10px] text-stone-400 font-mono">HSN {it.hsn}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono">{it.qty}</td>
                          <td className="p-2.5 text-right font-mono">{money(it.price)}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{money(it.qty * it.price)}</td>
                          <td className="p-2.5 text-right font-mono text-stone-500">{it.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Calculations breakdown */}
              {(() => {
                const c = calc(selectedOrder)
                return (
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-xs space-y-2">
                    <div className="flex justify-between text-stone-600">
                      <span>Taxable value</span>
                      <span className="font-mono font-medium">{money(c.taxable)}</span>
                    </div>
                    {selectedOrder.type === 'intra' ? (
                      <>
                        <div className="flex justify-between text-stone-600">
                          <span>CGST (2.5%)</span>
                          <span className="font-mono font-medium">{money(c.cgst)}</span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                          <span>SGST (2.5%)</span>
                          <span className="font-mono font-medium">{money(c.sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-stone-600">
                        <span>IGST (5.0%)</span>
                        <span className="font-mono font-medium">{money(c.igst)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-600">
                      <span>Shipping charges</span>
                      <span className="font-mono font-medium">{money(c.shipping)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-stone-900 border-t border-stone-200 pt-2">
                      <span>Order total</span>
                      <span className="font-mono text-indigo-700">{money(c.total)}</span>
                    </div>
                    {selectedOrder.refund > 0 && (
                      <div className="flex justify-between text-xs font-bold text-rose-600 pt-1">
                        <span>Refund recorded</span>
                        <span className="font-mono">-{money(selectedOrder.refund)}</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 leading-relaxed">
                Sample record for accounting demonstration. Verify the customer's billing address, GSTIN (if registered), legal place of supply, and payment gateway settlement before statutory GST filing.
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end gap-2.5">
              <button
                onClick={() => downloadCSV([selectedOrder], `${selectedOrder.id}-accounting.csv`)}
                className="px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition"
              >
                Export this order
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                Print details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Create New Invoice</h3>
                <p className="text-xs text-stone-500">Record a new sales transaction in accounting ledger</p>
              </div>
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-lg font-bold transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Customer Email</label>
                  <input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Place of Supply (State)</label>
                  <select
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="Karnataka">Karnataka (Intra-state)</option>
                    <option value="Maharashtra">Maharashtra (Inter-state)</option>
                    <option value="Tamil Nadu">Tamil Nadu (Inter-state)</option>
                    <option value="Telangana">Telangana (Inter-state)</option>
                    <option value="Delhi">Delhi (Inter-state)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Product Description</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Shipping (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newShipping}
                    onChange={(e) => setNewShipping(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Payment Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Payment Gateway / Mode</label>
                  <select
                    value={newGateway}
                    onChange={(e) => setNewGateway(e.target.value)}
                    className="w-full bg-white border border-stone-300 px-3 py-2 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Razorpay">Razorpay</option>
                    <option value="Card">Card</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Record Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-stone-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
