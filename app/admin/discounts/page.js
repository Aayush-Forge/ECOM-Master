'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllDiscounts, getAllDiscountsSync, deleteDiscount } from '@/lib/api/discounts'
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
import { Plus, Pencil, Trash2, Tag, RefreshCw } from 'lucide-react'

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState(() => getAllDiscountsSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchDiscounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllDiscounts()
      setDiscounts(data || [])
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDiscount(deleteTarget.id)
      toast.success(`Discount rule "${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchDiscounts()
    } catch (err) {
      console.error('Failed to delete discount:', err)
      toast.error(`Failed to delete "${deleteTarget.name}"`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">Discount Rules</h2>
          <p className="text-sm text-stone-500 font-inter">Manage promotional offers and active discount logic</p>
        </div>
        <Button asChild className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs self-start sm:self-center">
          <Link href="/admin/discounts/new">
            <Plus className="h-4 w-4 mr-2" /> Add Discount Rule
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchDiscounts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700">Name</TableHead>
                <TableHead className="font-semibold text-stone-700">Type</TableHead>
                <TableHead className="font-semibold text-stone-700">Display Value</TableHead>
                <TableHead className="font-semibold text-stone-700">Conditions</TableHead>
                <TableHead className="font-semibold text-stone-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Tag className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">No discount rules configured yet.</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/discounts/new">Create First Rule</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount) => (
                  <TableRow key={discount.id} className="hover:bg-stone-50/50">
                    <TableCell className="font-semibold text-stone-900 font-inter">{discount.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize font-inter text-xs bg-stone-100 text-stone-800 border-stone-200">
                        {discount.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-saffron font-inter">{discount.displayValue}</TableCell>
                    <TableCell className="font-inter text-sm text-stone-600 max-w-xs truncate">{discount.conditions}</TableCell>
                    <TableCell>
                      {discount.isActive ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 font-inter text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-stone-100 text-stone-600 border-stone-200 font-inter text-xs">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-stone-600 hover:text-stone-900">
                          <Link href={`/admin/discounts/${discount.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(discount)}
                          className="h-8 w-8 text-stone-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation AlertDialog with Specific Discount Rule Name */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">Delete Discount Rule</AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600">
              Are you sure you want to delete discount rule <span className="font-semibold text-stone-900">"{deleteTarget?.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-inter">
              Delete Discount
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
