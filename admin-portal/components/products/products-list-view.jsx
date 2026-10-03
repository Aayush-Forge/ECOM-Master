'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  getAdminProducts, 
  getAdminProductsSync, 
  deleteProduct, 
  getProductCategories,
  exportProductsCsv,
  importProductsCsv 
} from '@/lib/api/products-api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Plus, Pencil, Trash2, Search, FilterX, RefreshCw, AlertTriangle, Download, Upload, FileText, CheckCircle2, Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { hasRole, ROLES } from '@/lib/roles'

export default function ProductsListView({ basePath = '/products' }) {
  const { user } = useAuth()
  const canEdit = hasRole(user, ROLES.EDITOR)
  const [products, setProducts] = useState(() => getAdminProductsSync())
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [meta, setMeta] = useState({ page: 1, per_page: 20, total: 0 })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [updateExisting, setUpdateExisting] = useState(true)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportProductsCsv()
      toast.success('Catalog CSV exported successfully')
    } catch (err) {
      console.error(err)
      toast.error(err?.message || 'Failed to export products')
    } finally {
      setExporting(false)
    }
  }

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!importFile) {
      toast.error('Please select a CSV file to import')
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importProductsCsv(importFile, updateExisting)
      setImportResult(result)
      toast.success(`Import complete: ${result.createdParents} created, ${result.updatedParents} updated`)
      fetchProducts(page)
    } catch (err) {
      console.error(err)
      toast.error(err?.message || 'Failed to import CSV')
    } finally {
      setImporting(false)
    }
  }

  const fetchProducts = async (targetPage = page) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminProducts({
        page: targetPage,
        perPage,
        search: searchQuery.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setProducts(data || [])
      if (data?.meta) {
        setMeta(data.meta)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getProductCategories()
      .then((cats) => setCategories(cats || []))
      .catch((err) => console.error('Failed to load categories for filter:', err))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, categoryFilter, statusFilter])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProduct(deleteTarget.id)
      toast.success(`Product "${deleteTarget.title}" deleted successfully`)
      setDeleteTarget(null)
      fetchProducts(page)
    } catch (err) {
      console.error('Failed to delete product:', err)
      const msg = err?.response?.message || err?.message || `Failed to delete "${deleteTarget.title}"`
      toast.error(msg)
    }
  }

  const filteredProducts = products

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">Products</h2>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="border-stone-300 bg-white text-stone-700 hover:text-stone-900 font-inter text-xs shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-stone-500" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>

          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setImportFile(null)
                  setImportResult(null)
                  setImportDialogOpen(true)
                }}
                className="border-stone-300 bg-white text-stone-700 hover:text-stone-900 font-inter text-xs shadow-2xs"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5 text-stone-500" />
                Import
              </Button>

              <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs">
                <Link href={`${basePath}/new`}>
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-stone-200 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search title or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-stone-200 font-inter text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-stone-200 font-inter text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id || cat.name} value={cat.id || cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-white border-stone-200 font-inter text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'active') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('all')
              setStatusFilter('active')
            }}
            className="text-stone-500 hover:text-stone-900 font-inter text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchProducts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700">Image</TableHead>
                <TableHead className="font-semibold text-stone-700">Title</TableHead>
                <TableHead className="font-semibold text-stone-700">SKU</TableHead>
                <TableHead className="font-semibold text-stone-700">Category</TableHead>
                <TableHead className="font-semibold text-stone-700">Status</TableHead>
                <TableHead className="font-semibold text-stone-700">Stock Status</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Price</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FilterX className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">No products found matching your criteria.</p>
                      {(searchQuery || categoryFilter !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('')
                            setCategoryFilter('all')
                          }}
                        >
                          Clear Search & Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const stockCount = product.stock !== undefined ? product.stock : 10
                  const isOutOfStock = stockCount === 0
                  const isLowStock = stockCount > 0 && stockCount <= 5

                  return (
                    <TableRow key={product.id} className="hover:bg-stone-50/50">
                      <TableCell>
                        <Link href={`${basePath}/${product.id}/edit`} className="block group">
                          <div className="h-10 w-10 rounded-md overflow-hidden bg-stone-100 border border-stone-200 relative shrink-0 transition-transform group-hover:scale-105">
                            <img
                              src={product.imageUrl || 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300'}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold text-stone-900 font-inter">
                        <Link 
                          href={`${basePath}/${product.id}/edit`}
                          className="hover:text-[#FF6B00] hover:underline transition-colors"
                        >
                          {product.title}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-stone-600">{product.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-inter text-xs bg-stone-100 text-stone-800 border-stone-200">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize font-inter text-xs ${
                            product.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : product.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {product.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isOutOfStock ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 font-inter text-xs flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-red-600" /> Out of Stock
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 font-inter text-xs flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Low Stock ({stockCount})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 font-inter text-xs">
                            In Stock ({stockCount})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-stone-900 font-inter">
                        ₹{product.price?.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-stone-600 hover:text-stone-900" title={canEdit ? 'Edit Product' : 'View Product'}>
                            <Link href={`${basePath}/${product.id}/edit`}>
                              {canEdit ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Link>
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(product)}
                              className="h-8 w-8 text-stone-500 hover:text-red-600"
                              title="Delete Product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Server Pagination Controls */}
          {meta.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-stone-200 bg-stone-50/50">
              <p className="text-xs text-stone-500 font-inter">
                Showing{' '}
                <span className="font-semibold text-stone-800">
                  {Math.min((page - 1) * perPage + 1, meta.total)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-stone-800">
                  {Math.min(page * perPage, meta.total)}
                </span>{' '}
                of <span className="font-semibold text-stone-800">{meta.total}</span> products
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const prev = Math.max(1, page - 1)
                    setPage(prev)
                    fetchProducts(prev)
                  }}
                  className="h-8 px-3 text-xs border-stone-300 font-inter bg-white"
                >
                  Previous
                </Button>
                <span className="text-xs text-stone-600 font-mono px-2">
                  Page {page} of {Math.max(1, Math.ceil(meta.total / perPage))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(meta.total / perPage) || loading}
                  onClick={() => {
                    const next = page + 1
                    setPage(next)
                    fetchProducts(next)
                  }}
                  className="h-8 px-3 text-xs border-stone-300 font-inter bg-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation AlertDialog with Specific Product Title */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600">
              Are you sure you want to delete <span className="font-semibold text-stone-900">&ldquo;{deleteTarget?.title}&rdquo;</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-inter">
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-stone-200 text-stone-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-stone-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#FF6B00]" /> Import Products via CSV
            </DialogTitle>
          </DialogHeader>

          {!importResult ? (
            <form onSubmit={handleImportSubmit} className="space-y-4 pt-2">
              <div className="border-2 border-dashed border-stone-200 rounded-lg p-6 text-center hover:border-stone-400 transition-colors bg-stone-50/50">
                <FileText className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                <label className="cursor-pointer block text-xs font-semibold text-stone-800 hover:text-[#FF6B00]">
                  <span>{importFile ? importFile.name : 'Choose a .csv file from your computer'}</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-[11px] text-stone-500 mt-1 font-inter">
                  Standard WooCommerce/Shopify CSV format with Parent/Variation rows
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="updateExisting"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-stone-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <label htmlFor="updateExisting" className="text-xs text-stone-700 cursor-pointer font-inter">
                  Update existing products with matching SKU
                </label>
              </div>

              <DialogFooter className="pt-4 border-t border-stone-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportDialogOpen(false)}
                  disabled={importing}
                  className="border-stone-300 text-xs font-inter"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!importFile || importing}
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter text-xs"
                >
                  {importing ? 'Importing...' : 'Upload & Process'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-900 text-xs space-y-1.5 font-inter">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Import Complete
                </div>
                <p>Processed Rows: <span className="font-mono font-medium">{importResult.totalRowsProcessed}</span></p>
                <p>Created Products: <span className="font-mono font-medium">{importResult.createdParents}</span></p>
                <p>Updated Products: <span className="font-mono font-medium">{importResult.updatedParents}</span></p>
                <p>Variations Synced: <span className="font-mono font-medium">{importResult.totalVariations}</span></p>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-xs max-h-36 overflow-y-auto font-inter">
                  <p className="font-semibold text-amber-800 mb-1">Row Warnings/Errors:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => {
                    setImportDialogOpen(false)
                    setImportResult(null)
                  }}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-inter text-xs"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
