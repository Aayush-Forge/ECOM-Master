'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAdminProducts, getAdminProductsSync, deleteProduct } from '@/lib/api/products-api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Pencil, Trash2, Search, FilterX, RefreshCw, AlertTriangle } from 'lucide-react'

export default function AdminProductsPage() {
  const [products, setProducts] = useState(() => getAdminProductsSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminProducts()
      setProducts(data || [])
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProduct(deleteTarget.id)
      toast.success(`Product "${deleteTarget.title}" deleted successfully`)
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      console.error('Failed to delete product:', err)
      toast.error(`Failed to delete "${deleteTarget.title}"`)
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || p.category?.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">Products</h2>
          <p className="text-sm text-stone-500 font-inter">Manage storefront inventory and product details</p>
        </div>
        <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs self-start sm:self-center">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Link>
        </Button>
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
            <SelectItem value="sandalwood">Sandalwood</SelectItem>
            <SelectItem value="floral">Floral</SelectItem>
            <SelectItem value="resins">Resins</SelectItem>
            <SelectItem value="camphor">Camphor</SelectItem>
            <SelectItem value="combos">Combos</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || categoryFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('all')
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
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-stone-100 border border-stone-200 relative shrink-0">
                          <img
                            src={product.imageUrl || 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300'}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-stone-900 font-inter">{product.title}</TableCell>
                      <TableCell className="font-mono text-xs text-stone-600">{product.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-inter text-xs bg-stone-100 text-stone-800 border-stone-200">
                          {product.category}
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
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-stone-600 hover:text-stone-900">
                            <Link href={`/admin/products/${product.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(product)}
                            className="h-8 w-8 text-stone-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
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
      )}

      {/* Delete Confirmation AlertDialog with Specific Product Title */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600">
              Are you sure you want to delete <span className="font-semibold text-stone-900">"{deleteTarget?.title}"</span>? This action cannot be undone.
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
    </div>
  )
}
