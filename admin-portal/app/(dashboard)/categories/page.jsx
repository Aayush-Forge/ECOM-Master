'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/api/categories-api'
import { useAuth } from '@/lib/auth-context'
import { hasRole } from '@/lib/roles'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  AlertTriangle,
  CornerDownRight,
} from 'lucide-react'

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

function buildCategoryTree(categories) {
  const map = new Map()
  const roots = []

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] })
  })

  categories.forEach((cat) => {
    const node = map.get(cat.id)
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function getDescendantIds(categoryNode) {
  const ids = [categoryNode.id]
  if (categoryNode.children && categoryNode.children.length > 0) {
    categoryNode.children.forEach((child) => {
      ids.push(...getDescendantIds(child))
    })
  }
  return ids
}

export default function AdminCategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formParentId, setFormParentId] = useState('none')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const canMutate = hasRole(user, 'editor')

  const fetchCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllCategories()
      const list = Array.isArray(data) ? data : []
      setCategories(list)
      // Expand all roots by default
      const rootIds = list.filter((c) => !c.parentId).map((c) => c.id)
      setExpandedIds(new Set(rootIds))
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setError('Failed to load categories. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories)
  }, [categories])

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openCreateDialog = (presetParentId = null) => {
    setFormName('')
    setFormSlug('')
    setFormParentId(presetParentId || 'none')
    setSlugManuallyEdited(false)
    setIsCreateOpen(true)
  }

  const openEditDialog = (category) => {
    setEditingCategory(category)
    setFormName(category.name)
    setFormSlug(category.slug)
    setFormParentId(category.parentId || 'none')
    setSlugManuallyEdited(true)
    setIsEditOpen(true)
  }

  const handleNameChange = (val) => {
    setFormName(val)
    if (!slugManuallyEdited) {
      setFormSlug(slugify(val))
    }
  }

  const handleSlugChange = (val) => {
    setSlugManuallyEdited(true)
    setFormSlug(val)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formName.trim() || !formSlug.trim()) {
      toast.error('Category name and slug are required')
      return
    }

    setSubmitting(true)
    try {
      await createCategory({
        name: formName,
        slug: formSlug,
        parentId: formParentId === 'none' ? null : formParentId,
      })
      toast.success(`Category "${formName}" created successfully`)
      setIsCreateOpen(false)
      // If a parent was selected, make sure it is expanded
      if (formParentId !== 'none') {
        setExpandedIds((prev) => new Set([...prev, formParentId]))
      }
      fetchCategories()
    } catch (err) {
      console.error('Failed to create category:', err)
      toast.error(err.message || 'Failed to create category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingCategory) return
    if (!formName.trim() || !formSlug.trim()) {
      toast.error('Category name and slug are required')
      return
    }

    setSubmitting(true)
    try {
      await updateCategory(editingCategory.id, {
        name: formName,
        slug: formSlug,
        parentId: formParentId === 'none' ? null : formParentId,
      })
      toast.success(`Category "${formName}" updated successfully`)
      setIsEditOpen(false)
      fetchCategories()
    } catch (err) {
      console.error('Failed to update category:', err)
      toast.error(err.message || 'Failed to update category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCategory(deleteTarget.id)
      toast.success(`Category "${deleteTarget.name}" deleted successfully`)
      setDeleteTarget(null)
      fetchCategories()
    } catch (err) {
      console.error('Failed to delete category:', err)
      toast.error(
        err.message ||
          'Failed to delete category. Categories with subcategories or assigned products cannot be deleted.'
      )
    }
  }

  // Filter tree based on search query
  const matchesSearch = (node, query) => {
    if (!query) return true
    const q = query.toLowerCase()
    const selfMatch =
      node.name.toLowerCase().includes(q) || node.slug.toLowerCase().includes(q)
    const childrenMatch =
      node.children && node.children.some((child) => matchesSearch(child, query))
    return selfMatch || childrenMatch
  }

  // Flatten tree for rendering with depth and expand state
  const flattenTree = (nodes, depth = 0) => {
    const result = []
    nodes.forEach((node) => {
      if (!matchesSearch(node, searchQuery)) return
      result.push({ ...node, depth })
      const isExpanded = expandedIds.has(node.id) || searchQuery.trim() !== ''
      if (node.children && node.children.length > 0 && isExpanded) {
        result.push(...flattenTree(node.children, depth + 1))
      }
    })
    return result
  }

  const visibleRows = useMemo(() => {
    return flattenTree(categoryTree)
  }, [categoryTree, expandedIds, searchQuery])

  // Get available parents for edit (exclude category itself and all its descendants)
  const availableParentsForEdit = useMemo(() => {
    if (!editingCategory) return categories
    const excludeIds = new Set(getDescendantIds(editingCategory))
    return categories.filter((c) => !excludeIds.has(c.id))
  }, [editingCategory, categories])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">
            Categories
          </h2>
        </div>
        {canMutate && (
          <Button
            onClick={() => openCreateDialog()}
            className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs self-start sm:self-center"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-stone-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search category name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-stone-200 font-inter text-sm"
          />
        </div>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="text-stone-500 hover:text-stone-900 font-inter text-xs"
          >
            Clear Search
          </Button>
        )}
        <div className="sm:ml-auto text-xs text-stone-500 font-inter">
          Total Categories: <span className="font-semibold text-stone-800">{categories.length}</span>
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchCategories} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        /* Category Tree Table */
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700 w-[45%]">
                  Category Name
                </TableHead>
                <TableHead className="font-semibold text-stone-700">Slug</TableHead>
                <TableHead className="font-semibold text-stone-700">Subcategories</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FolderTree className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">
                        {searchQuery
                          ? 'No categories match your search.'
                          : 'No categories found.'}
                      </p>
                      {canMutate && !searchQuery && (
                        <Button
                          onClick={() => openCreateDialog()}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Create First Category
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((cat) => {
                  const hasChildren = cat.children && cat.children.length > 0
                  const isExpanded = expandedIds.has(cat.id) || searchQuery.trim() !== ''

                  return (
                    <TableRow
                      key={cat.id}
                      className="hover:bg-stone-50/50 transition-colors"
                    >
                      {/* Name with indentation and tree controls */}
                      <TableCell className="font-inter">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${cat.depth * 24}px` }}
                        >
                          {cat.depth > 0 && (
                            <CornerDownRight className="h-3.5 w-3.5 text-stone-400 shrink-0 mr-1" />
                          )}

                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(cat.id)}
                              className="p-1 hover:bg-stone-200/60 rounded text-stone-600 transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-stone-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-stone-600" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}

                          {hasChildren ? (
                            isExpanded ? (
                              <FolderOpen className="h-4 w-4 text-saffron shrink-0" />
                            ) : (
                              <Folder className="h-4 w-4 text-saffron shrink-0" />
                            )
                          ) : (
                            <Folder className="h-4 w-4 text-stone-400 shrink-0" />
                          )}

                          <span className="font-semibold text-stone-900 text-sm">
                            {cat.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Slug */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs bg-stone-100 text-stone-700 border-stone-200"
                        >
                          {cat.slug}
                        </Badge>
                      </TableCell>

                      {/* Subcategories count */}
                      <TableCell className="font-inter text-sm text-stone-600">
                        {hasChildren ? (
                          <span className="inline-flex items-center gap-1 font-medium text-stone-700">
                            {cat.children.length}{' '}
                            <span className="text-stone-400 font-normal">
                              {cat.children.length === 1 ? 'subcategory' : 'subcategories'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">None</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canMutate && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCreateDialog(cat.id)}
                                title="Add Subcategory"
                                className="h-8 px-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1 text-saffron" />
                                <span className="hidden md:inline">Subcategory</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(cat)}
                                title="Edit Category"
                                className="h-8 w-8 text-stone-600 hover:text-stone-900"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(cat)}
                                title="Delete Category"
                                className="h-8 w-8 text-stone-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Create Category Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-stone-900">
                Create Category
              </DialogTitle>
              <DialogDescription className="font-inter text-stone-600">
                Add a new category or subcategory to your catalog.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 font-inter">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-stone-700 font-medium">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Incense Sticks"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="bg-white border-stone-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-slug" className="text-stone-700 font-medium">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-slug"
                  placeholder="e.g. incense-sticks"
                  value={formSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="bg-white border-stone-200 font-mono text-sm"
                  required
                />
                <p className="text-xs text-stone-400">
                  URL-friendly identifier. Auto-generated from name.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-parent" className="text-stone-700 font-medium">
                  Parent Category
                </Label>
                <Select value={formParentId} onValueChange={setFormParentId}>
                  <SelectTrigger
                    id="create-parent"
                    className="bg-white border-stone-200"
                  >
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    <SelectItem value="none">None (Top-Level Category)</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-stone-400">
                  Leave as &quot;None&quot; for a root category.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-inter"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-stone-900">
                Edit Category
              </DialogTitle>
              <DialogDescription className="font-inter text-stone-600">
                Update category details and hierarchical placement.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 font-inter">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-stone-700 font-medium">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="e.g. Incense Sticks"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white border-stone-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-slug" className="text-stone-700 font-medium">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-slug"
                  placeholder="e.g. incense-sticks"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="bg-white border-stone-200 font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-parent" className="text-stone-700 font-medium">
                  Parent Category
                </Label>
                <Select value={formParentId} onValueChange={setFormParentId}>
                  <SelectTrigger
                    id="edit-parent"
                    className="bg-white border-stone-200"
                  >
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    <SelectItem value="none">None (Top-Level Category)</SelectItem>
                    {availableParentsForEdit.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-stone-400">
                  Cannot set parent to itself or its own subcategories.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-inter"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Category
            </AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600 space-y-3">
              <p>
                Are you sure you want to delete category{' '}
                <span className="font-semibold text-stone-900">
                  &ldquo;{deleteTarget?.name}&rdquo;
                </span>
                ?
              </p>

              {deleteTarget?.children && deleteTarget.children.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Warning:
                    Has {deleteTarget.children.length} subcategory
                    {deleteTarget.children.length === 1 ? '' : 'ies'}
                  </p>
                  <p>
                    The backend rejects deletion if a category has child categories or
                    assigned products. Please reassign or delete subcategories first.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-500">
                  Note: The server will reject deletion if products are currently
                  assigned to this category.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-inter"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
