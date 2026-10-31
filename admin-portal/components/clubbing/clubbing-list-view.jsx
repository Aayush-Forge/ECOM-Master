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
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  Package,
  Calendar,
  Tag,
} from 'lucide-react'

export default function ClubbingListView({ basePath = '/clubbing-rules' }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [bulkAction, setBulkAction] = useState('')

  const fetchRules = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllDiscounts()
      setRules(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch clubbing rules:', err)
      setError('Failed to load clubbing rules. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDiscount(deleteTarget.id)
      toast.success(`Clubbing rule "${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      fetchRules()
    } catch (err) {
      console.error('Failed to delete clubbing rule:', err)
      toast.error(`Failed to delete "${deleteTarget.name}"`)
    }
  }

  const filteredRules = useMemo(() => {
    const now = new Date()
    return rules.filter((r) => {
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const nameMatch = r.name?.toLowerCase().includes(q)
        const catMatch = r.applicableCategory?.name?.toLowerCase().includes(q)
        const descMatch = r.description?.toLowerCase().includes(q)
        if (!nameMatch && !catMatch && !descMatch) return false
      }

      if (typeFilter !== 'all' && r.type !== typeFilter) {
        return false
      }

      if (statusFilter === 'active') {
        const isExpired = r.endsAt && new Date(r.endsAt) < now
        if (!r.isActive || isExpired) return false
      } else if (statusFilter === 'expired') {
        const isExpired = r.endsAt && new Date(r.endsAt) < now
        if (!isExpired) return false
      } else if (statusFilter === 'draft') {
        if (r.isActive) return false
      }

      return true
    })
  }, [rules, searchQuery, typeFilter, statusFilter])

  const isAllSelected =
    filteredRules.length > 0 &&
    filteredRules.every((r) => selectedIds.has(r.id))

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredRules.map((r) => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleApplyBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)

    try {
      if (bulkAction === 'delete') {
        if (!confirm(`Are you sure you want to delete ${ids.length} selected rule(s)?`)) return
        await bulkDeleteDiscounts(ids)
        toast.success(`Deleted ${ids.length} rules`)
      } else if (bulkAction === 'activate') {
        await bulkUpdateDiscountsStatus(ids, true)
        toast.success(`Activated ${ids.length} rules`)
      } else if (bulkAction === 'deactivate') {
        await bulkUpdateDiscountsStatus(ids, false)
        toast.success(`Deactivated ${ids.length} rules`)
      }
      setSelectedIds(new Set())
      setBulkAction('')
      fetchRules()
    } catch (err) {
      console.error('Bulk action failed:', err)
      toast.error('Failed to execute bulk action')
    }
  }

  const counts = useMemo(() => {
    const now = new Date()
    const all = rules.length
    const active = rules.filter((r) => r.isActive && (!r.endsAt || new Date(r.endsAt) >= now)).length
    const expired = rules.filter((r) => r.endsAt && new Date(r.endsAt) < now).length
    return { all, active, expired }
  }, [rules])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Clubbing Rules Management
            </h1>
            <Badge variant="secondary" className="font-mono text-xs bg-amber-50 text-amber-800 border-amber-200">
              Bundle Engine
            </Badge>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Configure automated clubbing deals, festival bundles, and quantity offers displayed on the storefront.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRules}
            disabled={loading}
            className="text-stone-600 border-stone-200 hover:bg-stone-50"
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-[#FF6B00] hover:bg-[#e05e00] text-white shadow-sm font-medium"
          >
            <Link href={`${basePath}/new`}>
              <Plus size={16} className="mr-1.5" />
              + Create Clubbing Rule
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Rules</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{counts.all}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
            <Layers size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active On Storefront</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.active}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles size={20} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Expired</p>
            <p className="text-2xl font-bold text-stone-500 mt-1">{counts.expired}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search by rule name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-stone-50/50 border-stone-200 text-sm focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] text-xs h-9 bg-white border-stone-200">
                <SelectValue placeholder="All Bundle Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bundle Types</SelectItem>
                <SelectItem value="fixed_price_bundle">Fixed Price Bundle</SelectItem>
                <SelectItem value="percentage_off_bundle">Percentage Off Bundle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] text-xs h-9 bg-white border-stone-200">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Now</SelectItem>
                <SelectItem value="draft">Inactive / Draft</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-xs">
            <span className="font-semibold text-amber-900 ml-1">
              {selectedIds.size} rule{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-amber-300">
                  <SelectValue placeholder="Bulk Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Set Active</SelectItem>
                  <SelectItem value="deactivate">Set Inactive</SelectItem>
                  <SelectItem value="delete">Delete Selected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleApplyBulkAction}
                disabled={!bulkAction}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-32 ml-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">
            <p className="text-sm font-medium">{error}</p>
            <Button onClick={fetchRules} variant="outline" size="sm" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-16 text-center text-stone-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Layers size={24} />
            </div>
            <p className="text-base font-semibold text-stone-800">No Clubbing Rules Found</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Create your first clubbing rule to offer volume deals or festival bundles to customers.
            </p>
            <Button asChild size="sm" className="bg-[#FF6B00] hover:bg-[#e05e00] text-white">
              <Link href={`${basePath}/new`}>+ Create First Clubbing Rule</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-stone-50/80">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead className="font-semibold text-stone-700">Rule Name & Details</TableHead>
                <TableHead className="font-semibold text-stone-700">Type</TableHead>
                <TableHead className="font-semibold text-stone-700">Trigger Qty</TableHead>
                <TableHead className="font-semibold text-stone-700">Offer Value</TableHead>
                <TableHead className="font-semibold text-stone-700">Scope</TableHead>
                <TableHead className="font-semibold text-stone-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => {
                const now = new Date()
                const isExpired = rule.endsAt && new Date(rule.endsAt) < now
                const productsCount = Array.isArray(rule.products) ? rule.products.length : 0

                return (
                  <TableRow key={rule.id} className="hover:bg-stone-50/50 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(rule.id)}
                        onCheckedChange={(c) => handleSelectOne(rule.id, c)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-900">{rule.name}</span>
                        {rule.description && (
                          <span className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                            {rule.description}
                          </span>
                        )}
                        {rule.code && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Tag size={12} className="text-amber-600" />
                            <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                              Code: {rule.code}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          rule.type === 'fixed_price_bundle'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }
                      >
                        {rule.type === 'fixed_price_bundle' ? 'Fixed Price' : 'Percentage Off'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-stone-700">
                      {rule.requiredQuantity} item{rule.requiredQuantity > 1 ? 's' : ''}
                    </TableCell>
                    <TableCell className="font-semibold text-stone-900">
                      {rule.type === 'fixed_price_bundle'
                        ? `₹${Number(rule.fixedPrice || 0).toLocaleString('en-IN')}`
                        : `${Number(rule.percentageOff || 0)}% OFF`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs text-stone-600">
                        {rule.applicableCategory ? (
                          <span className="font-medium text-stone-800">
                            Category: {rule.applicableCategory.name}
                          </span>
                        ) : productsCount > 0 ? (
                          <span className="font-medium text-stone-800 flex items-center gap-1">
                            <Package size={12} className="text-stone-400" />
                            {productsCount} product{productsCount > 1 ? 's' : ''} selected
                          </span>
                        ) : (
                          <span className="text-stone-400">All catalog items</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExpired ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Expired
                        </Badge>
                      ) : rule.isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-stone-100 text-stone-600 border-stone-200">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-stone-500 hover:text-stone-900"
                        >
                          <Link href={`${basePath}/${rule.id}/edit`}>
                            <Pencil size={15} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(rule)}
                          className="h-8 w-8 text-stone-400 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clubbing Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule &quot;{deleteTarget?.name}&quot;? Customers will no
              longer receive bundle discounts for this rule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
