'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  getAllDiscounts,
  deleteDiscount,
  bulkDeleteDiscounts,
  bulkUpdateDiscountsStatus,
} from '@/lib/api/discounts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  RefreshCw,
  Search,
  Copy,
  Check,
  Calendar,
  Layers,
} from 'lucide-react'

export default function DiscountsListView({ basePath = '/admin/discounts' }) {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [copiedCode, setCopiedCode] = useState(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'expired' | 'draft'
  const [bulkAction, setBulkAction] = useState('')

  const fetchDiscounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllDiscounts()
      setDiscounts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch discounts:', err)
      setError('Failed to load discount rules. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const copyToClipboard = (code) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Copied "${code}" to clipboard`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDiscount(deleteTarget.id)
      toast.success(`Discount rule "${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      fetchDiscounts()
    } catch (err) {
      console.error('Failed to delete discount:', err)
      toast.error(`Failed to delete "${deleteTarget.name}"`)
    }
  }

  // Filter calculations
  const filteredDiscounts = useMemo(() => {
    const now = new Date()
    return discounts.filter((d) => {
      // Search
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const nameMatch = d.name?.toLowerCase().includes(q)
        const catMatch = d.applicableCategory?.name?.toLowerCase().includes(q)
        if (!nameMatch && !catMatch) return false
      }

      // Type filter
      if (typeFilter !== 'all' && d.type !== typeFilter) {
        return false
      }

      // Status filter
      if (statusFilter === 'active') {
        const isExpired = d.endsAt && new Date(d.endsAt) < now
        if (!d.isActive || isExpired) return false
      } else if (statusFilter === 'expired') {
        const isExpired = d.endsAt && new Date(d.endsAt) < now
        if (!isExpired) return false
      } else if (statusFilter === 'draft') {
        if (d.isActive) return false
      }

      return true
    })
  }, [discounts, searchQuery, typeFilter, statusFilter])

  // Select all handling
  const allFilteredSelected =
    filteredDiscounts.length > 0 &&
    filteredDiscounts.every((d) => selectedIds.has(d.id))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDiscounts.map((d) => d.id)))
    }
  }

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApplyBulkAction = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select items to apply bulk actions')
      return
    }

    const ids = Array.from(selectedIds)
    try {
      if (bulkAction === 'delete') {
        if (!confirm(`Are you sure you want to delete ${ids.length} selected discount(s)?`)) return
        await bulkDeleteDiscounts(ids)
        toast.success(`Deleted ${ids.length} discounts`)
      } else if (bulkAction === 'activate') {
        await bulkUpdateDiscountsStatus(ids, true)
        toast.success(`Activated ${ids.length} discounts`)
      } else if (bulkAction === 'deactivate') {
        await bulkUpdateDiscountsStatus(ids, false)
        toast.success(`Deactivated ${ids.length} discounts`)
      } else {
        toast.error('Select a valid bulk action')
        return
      }

      setSelectedIds(new Set())
      setBulkAction('')
      fetchDiscounts()
    } catch (err) {
      console.error(err)
      toast.error('Failed to perform bulk action')
    }
  }

  const counts = useMemo(() => {
    const now = new Date()
    const all = discounts.length
    const published = discounts.filter((d) => d.isActive).length
    const expired = discounts.filter((d) => d.endsAt && new Date(d.endsAt) < now).length
    return { all, published, expired }
  }, [discounts])

  const formatExpiry = (endsAt) => {
    if (!endsAt) return '—'
    const date = new Date(endsAt)
    const isExpired = date < new Date()
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return (
      <span className={isExpired ? 'text-rose-600 font-medium' : 'text-stone-700'}>
        {formatted}
        {isExpired && <span className="ml-1 text-xs font-semibold">(Expired)</span>}
      </span>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-stone-900">
            Coupons & Discount Rules
          </h1>
          <p className="text-sm text-stone-500 font-inter">
            Create and manage promotional discounts, bundling offers, and automated cart savings.
          </p>
        </div>
        <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs self-start sm:self-center">
          <Link href={`${basePath}/new`}>
            <Plus className="h-4 w-4 mr-2" /> Add Coupon
          </Link>
        </Button>
      </div>

      {/* WooCommerce Style Status Tabs */}
      <div className="flex items-center space-x-2 text-sm text-stone-600 border-b border-stone-200 pb-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-2 py-1 rounded transition ${
            statusFilter === 'all'
              ? 'text-stone-900 font-bold bg-stone-100'
              : 'hover:text-stone-900'
          }`}
        >
          All <span className="text-stone-400">({counts.all})</span>
        </button>
        <span className="text-stone-300">|</span>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-2 py-1 rounded transition ${
            statusFilter === 'active'
              ? 'text-emerald-700 font-bold bg-emerald-50'
              : 'hover:text-stone-900'
          }`}
        >
          Published / Active <span className="text-stone-400">({counts.published})</span>
        </button>
        {counts.expired > 0 && (
          <>
            <span className="text-stone-300">|</span>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-2 py-1 rounded transition ${
                statusFilter === 'expired'
                  ? 'text-rose-700 font-bold bg-rose-50'
                  : 'hover:text-stone-900'
              }`}
            >
              Expired <span className="text-stone-400">({counts.expired})</span>
            </button>
          </>
        )}
      </div>

      {/* WooCommerce Style Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk actions */}
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-36 h-9 bg-white text-xs font-inter border-stone-300">
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activate">Activate</SelectItem>
              <SelectItem value="deactivate">Deactivate</SelectItem>
              <SelectItem value="delete" className="text-rose-600 focus:text-rose-600">
                Delete
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleApplyBulkAction}
            className="h-9 px-3 border-stone-300 text-stone-700 hover:bg-stone-50 font-inter text-xs"
          >
            Apply
          </Button>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-9 bg-white text-xs font-inter border-stone-300">
              <SelectValue placeholder="Show all types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show all types</SelectItem>
              <SelectItem value="fixed_price_bundle">Fixed cart / bundle</SelectItem>
              <SelectItem value="percentage_off_bundle">Percentage discount</SelectItem>
            </SelectContent>
          </Select>

          {(typeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTypeFilter('all')
                setStatusFilter('all')
                setSearchQuery('')
              }}
              className="h-9 text-xs text-stone-500 hover:text-stone-800"
            >
              Reset filters
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search coupons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs font-inter border-stone-300 bg-white"
          />
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchDiscounts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-stone-50 border-b border-stone-200">
                <TableRow className="hover:bg-stone-50">
                  <TableHead className="w-10 px-4">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Code
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Coupon type
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Coupon amount
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Description / Scope
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Product IDs
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Usage / Trigger
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                    Expiry date
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs text-stone-700 uppercase tracking-wider pr-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-stone-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-4"><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell className="text-right pr-4"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-stone-500 font-inter">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 bg-stone-100 rounded-full text-stone-400">
                          <Tag className="w-6 h-6" />
                        </div>
                        <p className="font-medium text-stone-800">
                          {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                            ? 'No coupons match your filter criteria.'
                            : 'No coupons found. Create your first coupon to get started.'}
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`${basePath}/new`}>Add Coupon</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDiscounts.map((discount) => {
                    const isSelected = selectedIds.has(discount.id)
                    const isBundle = discount.type === 'fixed_price_bundle'
                    const productCount = discount.products?.length || 0

                    return (
                      <TableRow
                        key={discount.id}
                        className={`hover:bg-stone-50/70 transition-colors ${
                          isSelected ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="px-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectOne(discount.id)}
                            aria-label={`Select ${discount.name}`}
                          />
                        </TableCell>

                        {/* Code */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5 group">
                            <Link
                              href={`${basePath}/${discount.id}/edit`}
                              className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {discount.name}
                            </Link>
                            <button
                              onClick={() => copyToClipboard(discount.name)}
                              title="Copy coupon code"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-stone-400 hover:text-stone-700"
                            >
                              {copiedCode === discount.name ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </TableCell>

                        {/* Coupon Type */}
                        <TableCell className="text-xs text-stone-600 capitalize">
                          {isBundle ? (
                            <span className="inline-flex items-center text-stone-800">
                              <Layers className="w-3.5 h-3.5 mr-1 text-stone-500" /> Fixed cart discount
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-stone-800">
                              <Tag className="w-3.5 h-3.5 mr-1 text-stone-500" /> Percentage discount
                            </span>
                          )}
                        </TableCell>

                        {/* Coupon Amount */}
                        <TableCell className="font-semibold text-stone-900 font-inter text-sm">
                          {isBundle
                            ? `₹${Number(discount.fixedPrice || 0).toLocaleString('en-IN')}`
                            : `${Number(discount.percentageOff || 0)}%`}
                        </TableCell>

                        {/* Description / Scope */}
                        <TableCell className="text-xs text-stone-600 max-w-xs">
                          {discount.description ? (
                            <div className="space-y-1">
                              <p className="font-medium text-stone-800 line-clamp-1">{discount.description}</p>
                              {discount.applicableCategory && (
                                <span className="inline-block text-[11px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                  Category: {discount.applicableCategory.name}
                                </span>
                              )}
                            </div>
                          ) : discount.applicableCategory ? (
                            <span className="inline-block bg-stone-100 px-2 py-0.5 rounded text-stone-700 font-medium">
                              Category: {discount.applicableCategory.name}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </TableCell>

                        {/* Product IDs */}
                        <TableCell className="text-xs text-stone-600">
                          {productCount > 0 ? (
                            <span
                              className="cursor-help underline decoration-dotted text-stone-700 font-mono"
                              title={discount.products
                                .map((p) => p.product?.title || p.productId)
                                .join(', ')}
                            >
                              {productCount} {productCount === 1 ? 'product' : 'products'}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </TableCell>

                        {/* Usage / Limit & Trigger */}
                        <TableCell className="text-xs font-mono text-stone-700">
                          {discount.requiredQuantity ? (
                            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-sans font-medium">
                              Min {discount.requiredQuantity} items
                            </span>
                          ) : (
                            <span>0 / ∞</span>
                          )}
                        </TableCell>

                        {/* Expiry Date */}
                        <TableCell className="text-xs font-inter whitespace-nowrap">
                          {formatExpiry(discount.endsAt)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right whitespace-nowrap pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8 text-stone-500 hover:text-stone-900"
                            >
                              <Link href={`${basePath}/${discount.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(discount)}
                              className="h-8 w-8 text-stone-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Bar: Total count */}
          <div className="bg-stone-50 border-t border-stone-200 px-4 py-2 text-xs text-stone-500 flex items-center justify-between">
            <span>
              Showing {filteredDiscounts.length} of {discounts.length} coupons
            </span>
            {selectedIds.size > 0 && (
              <span className="font-semibold text-stone-700">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">
              Delete Coupon
            </AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600">
              Are you sure you want to delete coupon <span className="font-semibold text-stone-900">&ldquo;{deleteTarget?.name}&rdquo;</span>? This will deactivate the rule across the storefront immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-inter"
            >
              Delete Coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
