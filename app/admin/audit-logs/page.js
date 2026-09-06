'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuditLogs, getAuditLogsSync } from '@/lib/api/audit-logs'
import { getAllUsersSync } from '@/lib/api/users'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  FilterX,
  RefreshCw,
  Eye,
  Globe,
  FileCode,
} from 'lucide-react'
import { getRoleLabel } from '@/lib/roles'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState(() => getAuditLogsSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null)

  // Guard logic is handled by AdminLayout via getRedirectForRole()
  // No redundant page-level guard needed.

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLogs({
        userId: userFilter,
        actionType: actionFilter,
        entityType: entityFilter,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        search: searchQuery,
      })
      setLogs(data || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError('Failed to load audit logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser.role === 'admin') {
      fetchLogs()
    }
  }, [actionFilter, userFilter, entityFilter, startDate, endDate, searchQuery])

  const handleResetFilters = () => {
    setSearchQuery('')
    setActionFilter('all')
    setUserFilter('all')
    setEntityFilter('all')
    setStartDate('')
    setEndDate('')
  }

  // Visual helper for Role Badge
  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return (
          <Badge variant="outline" className="bg-saffron/10 text-saffron border-saffron/30 font-inter text-xs font-semibold">
            Admin
          </Badge>
        )
      case 'editor':
        return (
          <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200 font-inter text-xs font-semibold">
            Editor Employee
          </Badge>
        )
      case 'read_only':
      case 'employee':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 font-inter text-xs font-semibold">
            Viewer Employee
          </Badge>
        )
      case 'customer':
      default:
        return (
          <Badge variant="outline" className="bg-stone-100 text-stone-700 border-stone-200 font-inter text-xs">
            Customer
          </Badge>
        )
    }
  }

  // Visual helper for Action Type Badge
  const getActionBadge = (actionType) => {
    if (!actionType) return null

    if (actionType.includes('price_updated')) {
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-mono text-xs font-medium">{actionType}</Badge>
    }
    if (actionType.includes('created')) {
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-mono text-xs font-medium">{actionType}</Badge>
    }
    if (actionType.includes('deleted')) {
      return <Badge className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-mono text-xs font-medium">{actionType}</Badge>
    }
    if (actionType.includes('refund')) {
      return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-mono text-xs font-medium">{actionType}</Badge>
    }
    if (actionType.includes('role_changed')) {
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-mono text-xs font-medium">{actionType}</Badge>
    }
    return <Badge className="bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100 font-mono text-xs font-medium">{actionType}</Badge>
  }

  const formatTimestamp = (isoString) => {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  const allKnownUsers = getAllUsersSync()

  if (currentUser.role !== 'admin') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">Audit Logs</h2>
          <p className="text-sm text-stone-500 font-inter">View system activity and change history</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Search entity, action, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-stone-200 text-sm h-9"
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full bg-white border-stone-200 text-sm h-9">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Action Types</SelectItem>
                <SelectItem value="product.price_updated">product.price_updated</SelectItem>
                <SelectItem value="product.created">product.created</SelectItem>
                <SelectItem value="product.deleted">product.deleted</SelectItem>
                <SelectItem value="order.status_changed">order.status_changed</SelectItem>
                <SelectItem value="refund.issued">refund.issued</SelectItem>
                <SelectItem value="user.role_changed">user.role_changed</SelectItem>
                <SelectItem value="discount.created">discount.created</SelectItem>
                <SelectItem value="discount.updated">discount.updated</SelectItem>
                <SelectItem value="discount.deleted">discount.deleted</SelectItem>
                <SelectItem value="inventory.updated">inventory.updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Filter */}
          <div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full bg-white border-stone-200 text-sm h-9">
                <SelectValue placeholder="Filter by User" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Users</SelectItem>
                {allKnownUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({getRoleLabel(u.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full bg-white border-stone-200 text-sm h-9">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Start / End */}
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border-stone-200 text-xs h-9"
              title="From date"
            />
            <span className="text-stone-400 text-xs">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border-stone-200 text-xs h-9"
              title="To date"
            />
          </div>
        </div>

        {/* Active Filter Summary / Reset */}
        {(actionFilter !== 'all' || userFilter !== 'all' || entityFilter !== 'all' || startDate || endDate || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
            <span>Filtered results ({logs.length} entries found)</span>
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-7 text-xs text-saffron hover:text-saffron-dark">
              <FilterX className="w-3.5 h-3.5 mr-1" /> Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Main Table */}
      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700 whitespace-nowrap">Timestamp</TableHead>
                <TableHead className="font-semibold text-stone-700">User</TableHead>
                <TableHead className="font-semibold text-stone-700">Role at Action</TableHead>
                <TableHead className="font-semibold text-stone-700">Action Type</TableHead>
                <TableHead className="font-semibold text-stone-700">Entity</TableHead>
                <TableHead className="font-semibold text-stone-700">IP Address</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100 font-inter text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-36 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FilterX className="w-10 h-10 text-stone-400" />
                      <p className="font-medium text-stone-700 text-base">No audit log entries found.</p>
                      <Button variant="outline" size="sm" onClick={handleResetFilters}>
                        Reset Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-stone-50/70 transition-colors">
                    <TableCell className="text-stone-600 font-mono text-xs whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-900">{log.userName || log.userId}</span>
                        {log.userEmail && <span className="text-xs text-stone-500">{log.userEmail}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(log.userRole)}</TableCell>
                    <TableCell>{getActionBadge(log.actionType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-stone-900 text-xs">{log.entityLabel || log.entityId}</span>
                        <span className="text-[11px] text-stone-400 font-mono">ID: {log.entityId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-stone-600 font-mono text-xs">
                        <Globe className="w-3.5 h-3.5 text-stone-400" />
                        {log.ipAddress || 'Internal'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 text-xs bg-white hover:bg-stone-50 text-stone-700 border-stone-200"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-stone-500" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="font-display text-xl text-stone-900">
                Audit Log Details
              </DialogTitle>
              {selectedLog && getActionBadge(selectedLog.actionType)}
            </div>
            <DialogDescription className="font-inter text-stone-500 text-xs">
              ID: <span className="font-mono text-stone-700">{selectedLog?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5 pt-2 font-inter text-sm">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs">
                <div>
                  <span className="text-stone-500 block">User</span>
                  <span className="font-semibold text-stone-900">{selectedLog.userName || selectedLog.userId}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Role at Action</span>
                  <div className="mt-0.5">{getRoleBadge(selectedLog.userRole)}</div>
                </div>
                <div>
                  <span className="text-stone-500 block">IP Address</span>
                  <span className="font-mono text-stone-900">{selectedLog.ipAddress || 'Internal'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Timestamp</span>
                  <span className="font-mono text-stone-700">{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
              </div>

              {/* Entity Info */}
              <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Target Entity</span>
                  <span className="font-semibold text-stone-900 text-sm">
                    {selectedLog.entityLabel || selectedLog.entityId}
                  </span>
                </div>
                <Badge variant="outline" className="bg-white border-stone-300 font-mono text-xs">
                  {selectedLog.entityType} ({selectedLog.entityId})
                </Badge>
              </div>

              {/* Before vs After Diff Section */}
              <div className="space-y-3">
                <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-stone-500" />
                  Before &amp; After Values
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Before State */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <div className="bg-rose-50/80 px-3 py-2 border-b border-rose-100 flex items-center justify-between text-xs font-semibold text-rose-800">
                      <span>Before</span>
                      {selectedLog.beforeValue === null && <span className="text-[11px] font-normal italic text-rose-600">(null - Creation)</span>}
                    </div>
                    <pre className="p-3 text-xs font-mono bg-stone-900 text-stone-100 overflow-x-auto max-h-56 leading-relaxed">
                      {selectedLog.beforeValue !== null
                        ? JSON.stringify(selectedLog.beforeValue, null, 2)
                        : '// null'}
                    </pre>
                  </div>

                  {/* After State */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <div className="bg-emerald-50/80 px-3 py-2 border-b border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                      <span>After</span>
                      {selectedLog.afterValue === null && <span className="text-[11px] font-normal italic text-emerald-600">(null - Deletion)</span>}
                    </div>
                    <pre className="p-3 text-xs font-mono bg-stone-900 text-stone-100 overflow-x-auto max-h-56 leading-relaxed">
                      {selectedLog.afterValue !== null
                        ? JSON.stringify(selectedLog.afterValue, null, 2)
                        : '// null'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
