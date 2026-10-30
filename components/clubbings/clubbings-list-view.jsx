'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getAllClubbingsSync,
  getAllClubbings,
  deleteClubbing,
  toggleClubbingStatus
} from '@/lib/api/clubbings'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Plus, Pencil, Trash2, Sparkles, RefreshCw, Eye, EyeOff, Layers, ExternalLink } from 'lucide-react'

export default function ClubbingsListView({ basePath = '/admin/clubbings' }) {
  const [clubbings, setClubbings] = useState(() => getAllClubbingsSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const fetchClubbings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllClubbings()
      setClubbings(data || [])
    } catch (err) {
      console.error('Failed to fetch clubbings:', err)
      setError('Failed to load clubbing campaigns. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClubbings()

    const handleUpdate = (e) => {
      if (Array.isArray(e.detail)) {
        setClubbings(e.detail)
      } else {
        fetchClubbings()
      }
    }

    window.addEventListener('sd:clubbings-updated', handleUpdate)
    return () => window.removeEventListener('sd:clubbings-updated', handleUpdate)
  }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClubbing(deleteTarget.id)
      toast.success(`Clubbing campaign "${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchClubbings()
    } catch (err) {
      console.error('Failed to delete clubbing:', err)
      toast.error(err?.message || `Failed to delete "${deleteTarget.name}"`)
    }
  }

  const handleToggle = async (id, name) => {
    setTogglingId(id)
    try {
      const updated = await toggleClubbingStatus(id)
      toast.success(`Campaign "${name}" is now ${updated.isActive ? 'Active' : 'Inactive'}`)
      fetchClubbings()
    } catch (err) {
      console.error('Failed to toggle status:', err)
      toast.error('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const activeCount = clubbings.filter(c => c.isActive).length
  const featuredCount = clubbings.filter(c => c.featuredOnHomepage && c.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">
              Festival & Product Clubbings
            </h2>
            <Badge className="bg-[#D7A65B]/20 text-[#6B1024] border border-[#D7A65B]/40 font-semibold">
              <Sparkles className="w-3 h-3 mr-1 text-[#FF6B00]" /> Festive Deals
            </Badge>
          </div>
          <p className="text-sm text-stone-500 font-inter mt-1">
            Create and manage campaign clubbings, bundle pricing rules, and festive homepage banners
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button asChild variant="outline" size="sm" className="border-stone-200">
            <Link href="/clubbing" target="_blank">
              <ExternalLink className="h-4 w-4 mr-1 text-stone-500" /> View Storefront
            </Link>
          </Button>
          <Button asChild className="bg-[#6B1024] hover:bg-[#520c1b] text-white font-bold font-inter shadow-xs">
            <Link href={`${basePath}/new`}>
              <Plus className="h-4 w-4 mr-2" /> Create Clubbing
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold">Total Campaigns</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{clubbings.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold">Active Campaigns</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Eye className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold">Homepage Banners</p>
            <p className="text-2xl font-bold text-[#FF6B00] mt-1">{featuredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-[#FF6B00]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchClubbings} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-stone-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-stone-700 min-w-[200px]">Banner & Tagline</TableHead>
                  <TableHead className="font-semibold text-stone-700 min-w-[220px]">Campaign Name & Info</TableHead>
                  <TableHead className="font-semibold text-stone-700">Featured Products</TableHead>
                  <TableHead className="font-semibold text-stone-700">Scope</TableHead>
                  <TableHead className="font-semibold text-stone-700">Homepage</TableHead>
                  <TableHead className="font-semibold text-stone-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-stone-700 min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-stone-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-14 w-28 rounded-md" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : clubbings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Sparkles className="h-8 w-8 text-stone-300" />
                        <p className="text-stone-500 font-inter text-sm">No clubbing campaigns created yet.</p>
                        <Button asChild size="sm" className="bg-[#6B1024] hover:bg-[#520c1b] text-white">
                          <Link href={`${basePath}/new`}>
                            <Plus className="h-4 w-4 mr-1" /> Create Your First Clubbing
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  clubbings.map((c) => {
                    const productCount = c.clubbingProducts?.length || c.applicableProductIds?.length || 0
                    const desktopImg = c.bannerImageDesktop || c.bannerImage
                    const hasMobile = Boolean(c.bannerImageMobile)

                    return (
                      <TableRow key={c.id} className="hover:bg-stone-50/50 transition-colors">
                        {/* Banner & Tagline */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="relative w-36 h-16 rounded-md overflow-hidden border border-stone-200 bg-stone-100">
                              <img
                                src={desktopImg}
                                alt={c.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=600&q=80'
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white uppercase tracking-wider px-1 bg-[#6B1024]/80 rounded">
                                {c.tagline || 'Festive'}
                              </span>
                              {hasMobile && (
                                <span className="absolute top-1 right-1.5 text-[8px] font-bold text-white bg-black/60 px-1 rounded" title="Desktop & Mobile Banners uploaded">
                                  D+M
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Name & Description */}
                        <TableCell>
                          <div className="space-y-1 max-w-[280px]">
                            <p className="font-semibold text-stone-900 text-sm">{c.name}</p>
                            <p className="text-xs text-stone-500 line-clamp-2">{c.description || 'No description provided'}</p>
                          </div>
                        </TableCell>

                        {/* Featured Products */}
                        <TableCell>
                          <Badge
                            className="font-mono text-xs font-semibold bg-[#FFF9EE] text-[#4D0013] border-[#D7A65B]"
                          >
                            <Package className="w-3 h-3 mr-1 text-[#FF6B00]" />
                            {productCount} Product{productCount !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>

                        {/* Category / Scope */}
                        <TableCell>
                          <span className="text-xs font-medium text-stone-700 capitalize">
                            {c.applicableCategory ? c.applicableCategory.replace(/-/g, ' ') : 'All Products'}
                          </span>
                        </TableCell>

                        {/* Homepage Featured */}
                        <TableCell>
                          {c.featuredOnHomepage ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                              Displayed
                            </Badge>
                          ) : (
                            <span className="text-xs text-stone-400">Off</span>
                          )}
                        </TableCell>

                        {/* Status Toggle */}
                        <TableCell>
                          <button
                            onClick={() => handleToggle(c.id, c.name)}
                            disabled={togglingId === c.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              c.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                            }`}
                            title="Click to toggle status"
                          >
                            {c.isActive ? (
                              <>
                                <Eye className="w-3 h-3 text-emerald-600" /> Active
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 text-stone-400" /> Inactive
                              </>
                            )}
                          </button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-stone-600 hover:text-stone-900">
                              <Link href={`${basePath}/${c.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setDeleteTarget(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
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
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-stone-900 font-display">Delete Clubbing Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600 font-inter text-sm">
              Are you sure you want to delete <strong className="text-stone-900 font-medium">"{deleteTarget?.name}"</strong>?
              This will remove the campaign and its banner from the storefront and homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
