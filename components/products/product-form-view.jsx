'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  createProduct,
  updateProduct,
  getAdminProductById,
  getProductCategories,
  uploadProductImage,
  deleteProductImage,
} from '@/lib/api/products-api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const skuRegex = /^[a-zA-Z0-9_-]+$/

const optionalNumber = (label, maxDecimals = 2) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce
      .number({ invalid_type_error: `${label} must be a number.` })
      .positive(`${label} must be greater than 0.`)
      .refine(
        (val) => maxDecimals === null || Number(val.toFixed(maxDecimals)) === val,
        `${label} can have up to ${maxDecimals} decimal places.`
      )
      .optional()
  )

const productSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(150, 'Title cannot exceed 150 characters.'),
    sku: z
      .string()
      .trim()
      .min(1, 'SKU is required.')
      .regex(skuRegex, 'SKU must be alphanumeric with no spaces.'),
    price: z.coerce
      .number({ invalid_type_error: 'Price must be a valid number.' })
      .positive('Price must be greater than 0.')
      .refine(
        (val) => Number(val.toFixed(2)) === val,
        'Price can have up to 2 decimal places.'
      ),
    salePrice: optionalNumber('Sale price', 2),
    compareAtPrice: optionalNumber('Compare-at price', 2),
    stockQuantity: z.coerce
      .number({ invalid_type_error: 'Stock quantity must be a number.' })
      .int('Stock quantity must be an integer.')
      .min(0, 'Stock quantity cannot be negative.')
      .default(50),
    status: z.enum(['draft', 'active', 'archived']).default('active'),
    category: z.string().trim().min(1, 'Category is required.'),
    shortDescription: z
      .string()
      .trim()
      .refine(
        (val) => !val || val.replace(/<[^>]*>/g, '').trim().length <= 200,
        'Short description cannot exceed 200 characters.'
      )
      .optional()
      .or(z.literal('')),
    description: z
      .string()
      .trim()
      .refine(
        (val) => !val || val.replace(/<[^>]*>/g, '').trim().length <= 1000,
        'Description cannot exceed 1000 characters.'
      )
      .optional()
      .or(z.literal('')),
    weight: optionalNumber('Weight', null),
    length: optionalNumber('Length', null),
    width: optionalNumber('Width', null),
    height: optionalNumber('Height', null),
    images: z
      .array(
        z.string().trim().refine(
          (val) => !val || /^https?:\/\/.+/.test(val),
          'Must be a valid URL starting with http:// or https://'
        )
      )
      .default([]),
  })
  .refine(
    (data) => {
      if (data.salePrice !== undefined && data.salePrice !== null) {
        return data.salePrice < data.price
      }
      return true
    },
    {
      message: 'Sale price must be less than regular price.',
      path: ['salePrice'],
    }
  )

export default function ProductFormView({ basePath = '/admin/products', isEdit = false }) {
  const router = useRouter()
  const params = useParams()
  const productId = params?.id
  const [categories, setCategories] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [deletingIndex, setDeletingIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const form = useForm({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      sku: '',
      price: '',
      salePrice: '',
      compareAtPrice: '',
      stockQuantity: 50,
      status: 'active',
      category: '',
      shortDescription: '',
      description: '',
      weight: '',
      length: '',
      width: '',
      height: '',
      images: [],
    },
  })

  useEffect(() => {
    async function loadData() {
      try {
        const cats = await getProductCategories()
        setCategories(cats || [])

        if (isEdit && productId) {
          const product = await getAdminProductById(productId)
          if (product) {
            form.reset({
              title: product.title || '',
              sku: product.sku || '',
              price: product.basePrice ?? product.price ?? '',
              salePrice: product.salePrice ?? '',
              compareAtPrice: product.compareAtPrice ?? '',
              stockQuantity: product.stockQuantity ?? product.stock ?? 50,
              status: product.status || 'active',
              category: product.categoryId || product.categoryDetails?.id || product.category || '',
              shortDescription: product.shortDescription || '',
              description: product.description || '',
              weight: product.weight ?? '',
              length: product.length ?? '',
              width: product.width ?? '',
              height: product.height ?? '',
              images:
                Array.isArray(product.images) && product.images.length > 0
                  ? product.images
                  : product.imageUrl
                    ? [product.imageUrl]
                    : [],
            })
          }
        }
      } catch (error) {
        console.error('Failed to load form data', error)
        toast.error('Failed to load product details')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isEdit, productId, form])

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      const cleanImages = (values.images || []).filter((url) => Boolean(url && url.trim()))
      const payload = {
        ...values,
        images: cleanImages,
      }

      if (isEdit) {
        await updateProduct(productId, payload)
        toast.success('Product updated successfully')
      } else {
        await createProduct(payload)
        toast.success('Product created successfully')
      }
      router.push(basePath)
    } catch (error) {
      console.error(error)
      toast.error(isEdit ? 'Failed to update product' : 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  const { isValid } = form.formState
  const images = form.watch('images') || []

  const handleFileUpload = async (file) => {
    setUploadError(null)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      const err = 'Unsupported file type. Allowed formats: JPG, PNG, WebP.'
      setUploadError(err)
      toast.error(err)
      return
    }

    const maxBytes = 5 * 1024 * 1024
    if (file.size > maxBytes) {
      const err = 'File too large. Maximum allowed size is 5 MB.'
      setUploadError(err)
      toast.error(err)
      return
    }

    setUploading(true)
    try {
      const res = await uploadProductImage(file)
      if (res?.url) {
        const currentImages = form.getValues('images') || []
        const validImages = currentImages.filter((u) => Boolean(u && u.trim()))
        form.setValue('images', [...validImages, res.url], {
          shouldValidate: true,
          shouldDirty: true,
        })
        toast.success('Image uploaded successfully')
      }
    } catch (err) {
      console.error('Upload failed:', err)
      const msg = err.message || 'Failed to upload image. Please try again.'
      setUploadError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async (index, url) => {
    if (deletingIndex !== null) return
    setDeletingIndex(index)
    try {
      await deleteProductImage(url)
      const currentImages = form.getValues('images') || []
      const updated = currentImages.filter((_, idx) => idx !== index)
      form.setValue('images', updated, {
        shouldValidate: true,
        shouldDirty: true,
      })
      toast.success('Image removed from storage')
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error(err.message || 'Failed to delete image from storage')
    } finally {
      setDeletingIndex(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={basePath}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h2 className="text-2xl font-display font-bold tracking-tight">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Vintage Brass Lamp" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. LMP-BRS-001" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id || cat} value={cat.id || cat}>
                              {(cat.name || cat).charAt(0).toUpperCase() + (cat.name || cat).slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regular Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compareAtPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compare-at Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Shown as a struck-through reference price
                      </p>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" placeholder="50" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description (Optional, max 200 chars)</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        placeholder="Brief summary shown in product previews and listings..."
                        maxLength={200}
                        minHeight="80px"
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Description (Optional, max 1000 chars)</FormLabel>
                    <FormControl>
                      <RichTextEditor 
                        placeholder="Detailed description of the product..." 
                        maxLength={1000}
                        minHeight="140px"
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              {/* Shipping & Dimensions Subsection */}
              <div className="space-y-4 pt-4 border-t border-stone-200">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Shipping & Dimensions</h3>
                  <p className="text-xs text-stone-500">Optional physical attributes for fulfillment and shipping calculations.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.5" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="5" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Product Images (Part B) */}
              <div className="space-y-4 pt-4 border-t border-stone-200">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Product Images</h3>
                  <p className="text-xs text-stone-500">
                    Upload product photography. The first image serves as the primary thumbnail across the store.
                  </p>
                </div>

                {/* Drag-and-Drop / Click-to-Browse Upload Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0])
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[#FF6B00] bg-orange-50/50'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-stone-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0])
                        e.target.value = ''
                      }
                    }}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <Loader2 className="h-7 w-7 animate-spin text-[#FF6B00]" />
                      <p className="text-xs text-stone-600 font-medium">Uploading image to storage...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <UploadCloud className="h-8 w-8 text-stone-400" />
                      <div className="text-xs text-stone-600 font-medium">
                        <span className="text-[#FF6B00] font-semibold">Click to upload</span> or drag and drop
                      </div>
                      <p className="text-[11px] text-stone-400">JPG, PNG, or WebP up to 5MB</p>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs text-red-600 font-medium">{uploadError}</p>
                )}

                {/* Uploaded Images Gallery Grid */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-700">Gallery ({images.length})</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map((imgUrl, index) => (
                        <div
                          key={`${imgUrl}-${index}`}
                          className="group relative rounded-lg border border-stone-200 overflow-hidden bg-stone-100 aspect-square flex items-center justify-center"
                        >
                          <img
                            src={imgUrl}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <Badge
                              variant="secondary"
                              className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 font-medium bg-white/90 shadow-2xs backdrop-blur-xs pointer-events-none"
                            >
                              Primary
                            </Badge>
                          )}
                          <div className="absolute top-2 right-2 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              disabled={deletingIndex === index}
                              onClick={() => handleRemoveImage(index, imgUrl)}
                              className="h-7 w-7 bg-red-600 hover:bg-red-700 text-white shadow-xs"
                              title="Delete image"
                            >
                              {deletingIndex === index ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" asChild>
                  <Link href={basePath}>Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || submitting}
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
