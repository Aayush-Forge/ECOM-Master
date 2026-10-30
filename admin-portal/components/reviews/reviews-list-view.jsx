'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  getProductReviewSummaries,
  getReviews,
  deleteReview,
} from '@/lib/api/reviews'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Star,
  Trash2,
  Search,
  RefreshCw,
  MessageSquare,
  Package,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { hasRole, ROLES } from '@/lib/roles'

export default function ReviewsListView() {
  const { user } = useAuth()
  const canDelete = hasRole(user, ROLES.EDITOR)

  // Products state (left panel)
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [filterOnlyWithReviews, setFilterOnlyWithReviews] = useState(true)

  // Reviews state (right panel)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewsSearch, setReviewsSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Mobile navigation state
  const [showMobileReviews, setShowMobileReviews] = useState(false)

  // 1. Fetch products summary
  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const data = await getProductReviewSummaries(productSearch.trim())
      setProducts(data || [])
      // If no product is selected yet, or selected product is not in list, select the first one with reviews
      if (!selectedProduct && data && data.length > 0) {
        const firstWithReviews = data.find((p) => p.reviewCount > 0) || data[0]
        setSelectedProduct(firstWithReviews)
      } else if (selectedProduct) {
        // Sync selected product data
        const updated = data.find((p) => p.id === selectedProduct.id)
        if (updated) setSelectedProduct(updated)
      }
    } catch (err) {
      console.error('Failed to load products summary:', err)
      toast.error('Failed to load products review summary')
    } finally {
      setLoadingProducts(false)
    }
  }

  // 2. Fetch reviews for currently selected product
  const fetchSelectedProductReviews = async (productId) => {
    if (!productId) {
      setReviews([])
      return
    }
    setLoadingReviews(true)
    try {
      const data = await getReviews({ productId })
      const items = Array.isArray(data) ? data : data?.items || []
      setReviews(items)
    } catch (err) {
      console.error('Failed to load reviews for product:', err)
      toast.error('Failed to load reviews for selected product')
    } finally {
      setLoadingReviews(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct?.id) {
      fetchSelectedProductReviews(selectedProduct.id)
    }
  }, [selectedProduct?.id])

  // Delete review handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteReview(deleteTarget.id)
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      // Update local product reviewCount
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, reviewCount: Math.max(0, p.reviewCount - 1) }
            : p
        )
      )
      setSelectedProduct((prev) =>
        prev
          ? { ...prev, reviewCount: Math.max(0, prev.reviewCount - 1) }
          : prev
      )
      toast.success('Review deleted successfully')
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error(err.message || 'Failed to delete review')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let list = products
    if (filterOnlyWithReviews) {
      list = list.filter((p) => p.reviewCount > 0)
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase()
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      )
    }
    return list
  }, [products, filterOnlyWithReviews, productSearch])

  // Filtered reviews for active product
  const filteredReviews = useMemo(() => {
    if (!reviewsSearch.trim()) return reviews
    const q = reviewsSearch.toLowerCase()
    return reviews.filter(
      (r) =>
        r.customerName?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    )
  }, [reviews, reviewsSearch])

  // Overall catalog review metrics
  const totalCatalogReviews = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.reviewCount || 0), 0)
  }, [products])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-display">
            Product Reviews
          </h1>
          <p className="text-sm text-stone-500">
            Select a product to view and moderate its customer reviews.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-stone-700 bg-white border-stone-200 px-3 py-1 font-inter text-xs">
            {totalCatalogReviews} Total Reviews
          </Badge>
          <Button
            variant="outline"
            onClick={() => {
              fetchProducts()
              if (selectedProduct?.id) fetchSelectedProductReviews(selectedProduct.id)
            }}
            disabled={loadingProducts || loadingReviews}
            className="gap-2 text-stone-700 hover:text-stone-900 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts || loadingReviews ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Master-Detail Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Products List (Categorized by Product) */}
        <div
          className={`lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden ${
            showMobileReviews ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="p-3.5 border-b border-stone-100 bg-stone-50/50 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by title or SKU..."
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-stone-600">
              <button
                type="button"
                onClick={() => setFilterOnlyWithReviews((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded transition ${
                  filterOnlyWithReviews
                    ? 'bg-[#6B1024]/10 text-[#6B1024] font-medium'
                    : 'text-stone-500 hover:bg-stone-200/60'
                }`}
              >
                <Filter className="w-3 h-3" />
                {filterOnlyWithReviews ? 'With Reviews Only' : 'All Catalog'}
              </button>
              <span className="text-[11px] text-stone-400">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-stone-100 max-h-[620px] overflow-y-auto">
            {loadingProducts ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="p-3.5 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 px-4 text-center text-stone-400 text-xs">
                No products found matching the criteria.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p)
                      setShowMobileReviews(true)
                    }}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#6B1024]/5 border-l-4 border-l-[#6B1024]'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-stone-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-[#6B1024]' : 'text-stone-900'
                          }`}
                        >
                          {p.title}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {p.sku || 'No SKU'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            p.reviewCount > 0
                              ? 'bg-[#D7A65B]/15 text-[#8A5A18]'
                              : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {p.reviewCount > 0 && <Star className="w-2.5 h-2.5 fill-[#D7A65B] text-[#D7A65B]" />}
                          {p.reviewCount}
                        </span>
                        {p.reviewCount > 0 && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            ★ {p.averageRating}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-[#6B1024] translate-x-0.5' : 'text-stone-300'
                        }`}
                      />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Reviews for Selected Product */}
        <div
          className={`lg:col-span-7 bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden ${
            showMobileReviews ? 'block' : 'hidden lg:block'
          }`}
        >
          {selectedProduct ? (
            <div>
              {/* Product Header in Details Panel */}
              <div className="p-4 border-b border-stone-100 bg-stone-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMobileReviews(false)}
                    className="lg:hidden p-1.5 rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                    aria-label="Back to products list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-12 h-12 rounded-lg bg-white border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                    {selectedProduct.images?.[0] ? (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-stone-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 leading-tight">
                      {selectedProduct.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-stone-500">
                        {selectedProduct.sku}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-xs font-semibold text-[#6B1024] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#D7A65B] text-[#D7A65B]" />
                        {selectedProduct.averageRating} ({selectedProduct.reviewCount}{' '}
                        {selectedProduct.reviewCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>
                </div>

                {selectedProduct.slug && (
                  <a
                    href={`http://localhost:3000/products/${selectedProduct.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#6B1024] hover:underline flex items-center gap-1 self-end sm:self-center"
                  >
                    View on store <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Reviews Filter Bar */}
              <div className="p-3 border-b border-stone-100 bg-white flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={reviewsSearch}
                    onChange={(e) => setReviewsSearch(e.target.value)}
                    placeholder="Search reviews by reviewer or comment..."
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <span className="text-xs text-stone-400 shrink-0">
                  {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              {/* Reviews List Table */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50/50">
                    <TableHead className="w-[140px] font-semibold text-stone-700 text-xs">Customer</TableHead>
                    <TableHead className="w-[100px] font-semibold text-stone-700 text-xs">Rating</TableHead>
                    <TableHead className="font-semibold text-stone-700 text-xs">Feedback</TableHead>
                    <TableHead className="w-[100px] font-semibold text-stone-700 text-xs">Date</TableHead>
                    {canDelete && <TableHead className="w-[60px] text-right font-semibold text-stone-700 text-xs">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReviews ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        {canDelete && <TableCell><Skeleton className="h-4 w-6 ml-auto" /></TableCell>}
                      </TableRow>
                    ))
                  ) : filteredReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canDelete ? 5 : 4} className="py-12 text-center text-stone-400">
                        <MessageSquare className="w-7 h-7 text-stone-200 mx-auto mb-2" />
                        <p className="text-xs font-medium">No reviews for this product yet.</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Reviews left on the product page will appear here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReviews.map((rev) => (
                      <TableRow key={rev.id} className="hover:bg-stone-50/60 transition-colors">
                        <TableCell className="align-top py-3 text-xs font-semibold text-stone-800">
                          <div>{rev.customerName || 'Anonymous'}</div>
                          {rev.isVerifiedBuyer && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified Buyer
                            </span>
                          )}
                          {rev.order?.orderNumber && (
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                              #{rev.order.orderNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <div className="flex gap-0.5 items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= (rev.stars || 0)
                                    ? 'fill-[#D7A65B] text-[#D7A65B]'
                                    : 'text-stone-200'
                                }`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <p className="text-xs text-stone-700 font-light leading-relaxed">
                            {rev.description}
                          </p>
                        </TableCell>
                        <TableCell className="align-top py-3 text-[11px] text-stone-400 whitespace-nowrap">
                          {rev.createdAt
                            ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                        {canDelete && (
                          <TableCell className="align-top py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-stone-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTarget(rev)}
                              title="Delete this review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-24 text-center text-stone-400 px-4">
              <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-medium">Select a product on the left</p>
              <p className="text-xs text-stone-400 mt-1">
                Choose any product from your catalog to view its reviews and feedback.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this review from{' '}
              <span className="font-semibold text-stone-800">
                {deleteTarget?.customerName || 'this customer'}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Review'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
