'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminCustomers } from '@/lib/api/admin-customers'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterX, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })

  const fetchCustomers = async (currentPage = page, search = appliedSearch) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminCustomers({
        search: search.trim() || undefined,
        page: currentPage,
        perPage: 20,
      })
      setCustomers(res.data || [])
      setMeta(res.meta || { total: res.data?.length || 0, totalPages: 1 })
    } catch (err) {
      console.error('Failed to load customers:', err)
      setError(err?.message || 'Failed to load customers. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(page, appliedSearch)
  }, [page, appliedSearch])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(searchTerm)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">Customers</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              type="search"
              placeholder="Search phone, name, email, order #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-stone-200 text-xs h-9"
            />
          </form>
          <Button onClick={() => fetchCustomers(page, appliedSearch)} variant="outline" size="sm" className="h-9 px-3 border-stone-200">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => fetchCustomers(page, appliedSearch)} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700">Name</TableHead>
                <TableHead className="font-semibold text-stone-700">Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FilterX className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">
                        {appliedSearch ? 'No customers found matching your search.' : 'No customers found.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow
                    key={c.phoneKey}
                    onClick={() => router.push(`/customers/${c.phoneKey}`)}
                    className="hover:bg-stone-50/70 cursor-pointer transition-colors"
                  >
                    <TableCell className="font-semibold text-stone-900">{c.name}</TableCell>
                    <TableCell className="font-inter text-stone-800">{c.phone}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
              <div className="text-xs text-stone-500">
                Page {page} of {meta.totalPages} ({meta.total} customers)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  className="h-8 px-2 text-xs"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
