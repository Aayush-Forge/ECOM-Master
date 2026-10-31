'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getAllClubbings,
  deleteClubbing,
  toggleClubbingStatus
} from '@/lib/api/clubbings'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { Plus, Pencil, Trash2, Sparkles, RefreshCw, Eye, Layers, ExternalLink, Image as ImageIcon } from 'lucide-react'

export default function ClubbingsListView({ basePath = '/clubbings' }) {
  const [clubbings, setClubbings] = useState([])
  const [loading, setLoading] = useState(true)
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

  const handleToggle = async (id, name, currentStatus) => {
    setTogglingId(id)
    try {
      const updated = await toggleClubbingStatus(id)
      const isNowActive = updated.isActive !== undefined ? updated.isActive : !currentStatus
      toast.success(`Campaign "${name}" is now ${isNowActive ? 'Active (Live on Storefront)' : 'Inactive (Hidden from Storefront)'}`)
      setClubbings(prev => prev.map(c => c.id === id ? { ...c, isActive: isNowActive } : c))
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
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 font-display">
              Clubbing Modules & Festive Campaigns
            </h2>
            <Badge className="bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 font-semibold">
              <Sparkles className="w-3 h-3 mr-1 text-[#FF6B00]" /> Festive Showcase
            </Badge>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Create, schedule, and feature festival clubbings, banner imagery, and curated product collections on the storefront
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button asChild variant="outline" size="sm" className="border-stone-200">
            <Link href="http://localhost:3000/products?clubbing=diwali" target="_blank">
              <ExternalLink className="h-4 w-4 mr-1 text-stone-500" /> View on Storefront
            </Link>
          </Button>
          <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold shadow-xs">
            <Link href={`${basePath}/new`}>
              <Plus className="h-4 w-4 mr-2" /> Add Clubbing Section
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
            <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold">Live Homepage Banners</p>
            <p className="text-2xl font-bold text-[#FF6B00] mt-1">{featuredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF6B00]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600">{error}</p>
          <Button onClick={fetchClubbings} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-stone-200" />
          ))}
        </div>
      ) : clubbings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-stone-300 p-8 space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">No Clubbing Modules Found</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            Create your first festival or promotional clubbing section to feature curated products and hero banners on the website.
          </p>
          <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white">
            <Link href={`${basePath}/new`}>
              <Plus className="h-4 w-4 mr-2" /> Add Clubbing Section
            </Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="w-20">Banner</TableHead>
                <TableHead>Campaign Details</TableHead>
                <TableHead>Featured Products</TableHead>
                <TableHead>Active Status</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubbings.map((c) => {
                const prodCount = Array.isArray(c.clubbingProducts)
                  ? c.clubbingProducts.length
                  : (c.applicableProductIds?.length || 0)

                return (
                  <TableRow key={c.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Banner Thumbnail */}
                    <TableCell>
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 relative flex items-center justify-center">
                        {c.bannerImageDesktop || c.bannerImage ? (
                          <img
                            src={c.bannerImageDesktop || c.bannerImage}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                    </TableCell>

                    {/* Campaign Title & Tagline */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 hover:text-[#FF6B00] transition">
                            {c.name}
                          </span>
                          {c.tagline && (
                            <Badge variant="outline" className="text-[10px] bg-orange-50 text-[#FF6B00] border-orange-200 font-semibold py-0">
                              {c.tagline}
                            </Badge>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-xs text-stone-500 line-clamp-1 max-w-md">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Products Count */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="bg-stone-100 text-stone-800 font-medium text-xs">
                          {prodCount} {prodCount === 1 ? 'Product' : 'Products'}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Live Campaign Active Switch */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={c.isActive}
                          disabled={togglingId === c.id}
                          onCheckedChange={() => handleToggle(c.id, c.name, c.isActive)}
                          className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                        />
                        <span className={`text-xs font-semibold ${c.isActive ? 'text-emerald-700' : 'text-stone-400'}`}>
                          {c.isActive ? 'Live' : 'Hidden'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Timeline */}
                    <TableCell>
                      <div className="text-xs text-stone-500 space-y-0.5">
                        <div>Starts: {c.startsAt ? new Date(c.startsAt).toLocaleDateString() : 'Immediate'}</div>
                        <div>Ends: {c.endsAt ? new Date(c.endsAt).toLocaleDateString() : 'Indefinite'}</div>
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-stone-600 hover:text-stone-900">
                          <Link href={`${basePath}/${c.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-stone-400 hover:text-red-600"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clubbing Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-stone-900">"{deleteTarget?.name}"</span>?
              This will remove the campaign, its promotional banner, and any featured clubbing deal pricing from the storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
