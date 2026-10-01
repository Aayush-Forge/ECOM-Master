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
  getNextSuggestedSku,
  uploadProductImage,
  deleteProductImage,
} from '@/lib/api/products-api'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Trash2,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  Check,
  Star,
  Layers,
  ArrowDown,
  RefreshCw,
} from 'lucide-react'

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
      .refine(
        (val) => !val || skuRegex.test(val),
        'SKU must follow pattern SMEXXXXX (e.g. SME10001) or SMEXXXXX-XX.'
      )
      .optional()
      .or(z.literal('')),
    price: optionalNumber('Price', 2),
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
      if (
        data.salePrice !== undefined &&
        data.salePrice !== null &&
        data.price !== undefined &&
        data.price !== null
      ) {
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

  const [productType, setProductType] = useState('simple')
  const [attributes, setAttributes] = useState([{ name: 'Size', values: '50g, 100g, 250g' }])
  const [variations, setVariations] = useState([])
  const [productVersion, setProductVersion] = useState(undefined)
  const [loadedCustomFields, setLoadedCustomFields] = useState({})

  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [deletingIndex, setDeletingIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleSetPrimaryImage = (index) => {
    if (index === 0) return
    const current = form.getValues('images') || []
    const selected = current[index]
    const updated = [selected, ...current.filter((_, i) => i !== index)]
    form.setValue('images', updated, { shouldValidate: true, shouldDirty: true })
    toast.success('Set as primary cover image')
  }

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

  const loadData = async () => {
    try {
      const cats = await getProductCategories()
      setCategories(cats || [])

      if (isEdit && productId) {
        const product = await getAdminProductById(productId)
        if (product) {
          const rawCf = { ...(product.customFields || {}) }
          delete rawCf.type
          delete rawCf.attributes
          delete rawCf.variationsData
          setLoadedCustomFields(rawCf)

          const isVar = product.productType === 'variable' || product.type === 'variable'
          setProductType(isVar ? 'variable' : 'simple')
          setProductVersion(product.version)

          if (isVar) {
            const rawAttrs = Array.isArray(product.attributes) ? product.attributes : []
            if (rawAttrs.length > 0) {
              setAttributes(
                rawAttrs.map((a) => ({
                  name: a.name || '',
                  values: Array.isArray(a.options) ? a.options.join(', ') : '',
                }))
              )
            }

            const rawVars = Array.isArray(product.variations)
              ? product.variations
              : Array.isArray(product.variationsData)
                ? product.variationsData
                : []

            if (rawVars.length > 0) {
              setVariations(
                rawVars.map((v) => {
                  const attrs = Array.isArray(v.attributes) ? v.attributes : []
                  const combo = attrs.map((a) => a.option || a.value).join(' / ')
                  const regP = v.regularPrice ?? v.regular_price ?? v.price ?? ''
                  const saleP = v.salePrice ?? v.sale_price ?? ''
                  const stock = v.stockQuantity ?? v.stock_quantity ?? 50
                  const img = typeof v.image === 'string' ? v.image : (v.image?.src || '')
                  const active = v.isActive !== false

                  return {
                    id: v.id,
                    sku: v.sku || '',
                    combination: combo,
                    attributes: attrs.map((a) => ({ name: a.name, option: a.option || a.value })),
                    price: regP !== null && regP !== undefined ? String(regP) : '',
                    salePrice: saleP !== null && saleP !== undefined ? String(saleP) : '',
                    stockQuantity: stock,
                    image: img,
                    isActive: active,
                    isExisting: true,
                  }
                })
              )
            }
          }

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
      } else if (!isEdit) {
        const skuData = await getNextSuggestedSku()
        if (skuData?.sku) {
          form.setValue('sku', skuData.sku, { shouldValidate: true })
        }
      }
    } catch (error) {
      console.error('Failed to load form data', error)
      toast.error('Failed to load product details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isEdit, productId])

  const handleAddAttribute = () => {
    setAttributes((prev) => [...prev, { name: '', values: '' }])
  }

  const handleRemoveAttribute = (idx) => {
    setAttributes((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleAttributeChange = (idx, field, value) => {
    setAttributes((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const handleGenerateVariations = () => {
    const validAttrs = attributes
      .map((a) => ({
        name: (a.name || '').trim(),
        options: (a.values || '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((a) => a.name && a.options.length > 0)

    if (validAttrs.length === 0) {
      toast.error('Please define at least one attribute with values (e.g. Size: 50g, 100g).')
      return
    }

    const combos = validAttrs.reduce((acc, curr) => {
      if (acc.length === 0) {
        return curr.options.map((opt) => [{ name: curr.name, option: opt }])
      }
      const next = []
      for (const prev of acc) {
        for (const opt of curr.options) {
          next.push([...prev, { name: curr.name, option: opt }])
        }
      }
      return next
    }, [])

    const basePrice = form.getValues('price') || 0
    const baseStock = form.getValues('stockQuantity') ?? 50
    const parentSku = form.getValues('sku') || 'SME'
    const primaryImg = (form.getValues('images') || [])[0] || ''

    const newVars = combos.map((combo, idx) => {
      const label = combo.map((c) => c.option).join(' / ')
      const code = combo.map((c) => c.option.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-')
      const existing = variations.find((v) =>
        Array.isArray(v.attributes) &&
        v.attributes.length === combo.length &&
        v.attributes.every((a) =>
          combo.some(
            (c) =>
              c.name.toLowerCase() === (a.name || '').toLowerCase() &&
              c.option.toLowerCase() === (a.option || a.value || '').toLowerCase()
          )
        )
      )
      return (
        existing || {
          sku: `${parentSku}-${code || String(idx + 1).padStart(2, '0')}`,
          combination: label,
          attributes: combo,
          price: basePrice,
          salePrice: '',
          stockQuantity: baseStock,
          image: primaryImg,
          isActive: true,
          isExisting: false,
        }
      )
    })

    setVariations(newVars)
    const validPrices = newVars.filter((v) => v.isActive !== false).map((v) => Number(v.price)).filter((p) => p > 0)
    if (validPrices.length > 0) {
      form.setValue('price', Math.min(...validPrices), { shouldValidate: true })
    }
    const totalStock = newVars.filter((v) => v.isActive !== false).reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0)
    form.setValue('stockQuantity', totalStock, { shouldValidate: true })
    toast.success(`Generated ${newVars.length} variation(s)`)
  }

  const handleVariationChange = (idx, field, value) => {
    setVariations((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      if (field === 'price') {
        const prices = next.filter((v) => v.isActive !== false).map((v) => Number(v.price)).filter((p) => p > 0)
        if (prices.length > 0) {
          form.setValue('price', Math.min(...prices), { shouldValidate: true })
        }
      } else if (field === 'stockQuantity') {
        const total = next.filter((v) => v.isActive !== false).reduce((acc, v) => acc + (Number(v.stockQuantity) || 0), 0)
        form.setValue('stockQuantity', total, { shouldValidate: true })
      }
      return next
    })
  }

  const handleToggleVariationActive = (idx) => {
    setVariations((prev) => {
      const target = prev[idx]
      if (!target) return prev
      const updatedActive = target.isActive === false ? true : false
      const next = [...prev]
      next[idx] = { ...target, isActive: updatedActive }
      return next
    })
  }

  const handleRemoveVariation = (idx) => {
    setVariations((prev) => {
      const target = prev[idx]
      if (!target) return prev
      if (target.isExisting || target.id) {
        // Soft deactivate existing saved variation
        const next = [...prev]
        next[idx] = { ...target, isActive: false }
        toast.info(`Marked "${target.combination || target.sku}" as inactive`)
        return next
      } else {
        // Drop unsaved variation entirely
        return prev.filter((_, i) => i !== idx)
      }
    })
  }

  const handleBulkPrice = () => {
    const p = form.getValues('price')
    if (!p) return
    setVariations((prev) => prev.map((v) => ({ ...v, price: p })))
    toast.success(`Applied ₹${p} to all variations`)
  }

  const handleBulkStock = () => {
    const s = form.getValues('stockQuantity') ?? 50
    setVariations((prev) => prev.map((v) => ({ ...v, stockQuantity: s })))
    toast.success(`Applied ${s} stock units to all variations`)
  }

  const onInvalid = (errors) => {
    const firstKey = Object.keys(errors)[0]
    if (firstKey) {
      const msg = errors[firstKey]?.message || `Please check ${firstKey}`
      toast.error(msg)
    } else {
      toast.error('Please check the form for errors.')
    }
  }

  async function onSubmit(values) {
    if (productType === 'simple' && (!values.price || Number(values.price) <= 0)) {
      form.setError('price', { message: 'Price is required for simple product.' })
      toast.error('Price is required for simple product.')
      return
    }

    setSubmitting(true)
    try {
      const cleanImages = (values.images || []).filter((url) => Boolean(url && url.trim()))
      const customFields = { ...(loadedCustomFields || {}) }
      delete customFields.type
      delete customFields.attributes
      delete customFields.variationsData

      let payload = {
        ...values,
        images: cleanImages,
        customFields,
        productType,
      }

      if (productType === 'variable') {
        let currentVariations = variations

        if (currentVariations.length === 0) {
          const validAttrs = attributes
            .map((a) => ({
              name: a.name.trim(),
              options: a.values.split(',').map((v) => v.trim()).filter(Boolean),
            }))
            .filter((a) => a.name && a.options.length > 0)

          if (validAttrs.length === 0) {
            toast.error('Please define attributes (e.g. Size, Color) and variations before saving.')
            setSubmitting(false)
            return
          }

          const combos = validAttrs.reduce((acc, curr) => {
            if (acc.length === 0) return curr.options.map((opt) => [{ name: curr.name, option: opt }])
            const next = []
            for (const prev of acc) {
              for (const opt of curr.options) {
                next.push([...prev, { name: curr.name, option: opt }])
              }
            }
            return next
          }, [])

          const baseP = Number(values.price) || 100
          const baseS = Number(values.stockQuantity) ?? 50
          const parentSku = values.sku || 'SME'
          const primaryImg = cleanImages[0] || ''

          currentVariations = combos.map((combo, idx) => {
            const label = combo.map((c) => c.option).join(' / ')
            const code = combo.map((c) => c.option.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-')
            return {
              sku: `${parentSku}-${code || String(idx + 1).padStart(2, '0')}`,
              combination: label,
              attributes: combo,
              price: baseP,
              salePrice: '',
              stockQuantity: baseS,
              image: primaryImg,
              isActive: true,
              isExisting: false,
            }
          })
          setVariations(currentVariations)
        }

        const formattedAttrs = attributes
          .map((a) => ({
            name: a.name.trim(),
            slug: a.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            options: a.values.split(',').map((v) => v.trim()).filter(Boolean),
            variation: true,
            visible: true,
          }))
          .filter((a) => a.name && a.options.length > 0)

        const formattedVariations = currentVariations.map((v) => {
          const varObj = {
            sku: v.sku?.trim() ? v.sku.trim() : undefined,
            regularPrice: Number(v.price ?? values.price ?? 0),
            salePrice: v.salePrice !== undefined && v.salePrice !== null && v.salePrice !== '' ? Number(v.salePrice) : undefined,
            stockQuantity: Number(v.stockQuantity ?? 0),
            weight: values.weight ? Number(values.weight) : undefined,
            image: v.image ? v.image : (cleanImages[0] ? cleanImages[0] : undefined),
            attributes: (v.attributes || []).map((a) => ({
              name: a.name.trim(),
              option: (a.option || a.value || '').trim(),
            })),
            isActive: v.isActive !== false,
          }
          if (v.isExisting && v.id) {
            varObj.id = v.id
          }
          return varObj
        })

        delete payload.price
        delete payload.basePrice
        delete payload.stockQuantity

        payload = {
          ...payload,
          productType: 'variable',
          attributes: formattedAttrs,
          variations: formattedVariations,
        }

        if (isEdit) {
          payload.version = productVersion
        }
      } else {
        payload = {
          ...payload,
          productType: 'simple',
          basePrice: Number(values.price || 0),
          stockQuantity: Number(values.stockQuantity ?? 50),
        }
        delete payload.attributes
        delete payload.variations
        if (isEdit && productVersion !== undefined) {
          payload.version = productVersion
        }
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
      if (error?.status === 409 || error?.response?.statusCode === 409) {
        toast.error('Product was changed elsewhere, reload')
        await loadData()
      } else {
        toast.error(error?.message || (isEdit ? 'Failed to update product' : 'Failed to create product'))
      }
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
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-3 space-y-4">
            <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></CardContent></Card>
            <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></CardContent></Card>
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-28 w-full" /></CardContent></Card>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-56 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          </div>
        </div>
      </div>
    )
  }

  const currentStatus = form.watch('status') || 'active'
  const regularPrice = Number(form.watch('price')) || 0
  const salePrice = Number(form.watch('salePrice')) || 0
  const discountPercent =
    regularPrice > 0 && salePrice > 0 && salePrice < regularPrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : null

  const scrollToStudio = () => {
    const el = document.getElementById('variation-studio')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="w-full space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-5">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 bg-white -mx-6 -mt-6 p-4 sm:px-6 shadow-xs sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-600 hover:text-stone-900" asChild>
                <Link href={basePath}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-display font-bold tracking-tight text-stone-900">
                  {isEdit ? 'Edit Product' : 'New Product'}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 font-medium capitalize font-mono ${
                    currentStatus === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : currentStatus === 'draft'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {currentStatus}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-semibold" asChild>
                <Link href={basePath}>Discard</Link>
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-9 px-5 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
              </Button>
            </div>
          </div>

          {/* Balanced 3-Column Top Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* COLUMN 1: Commercial (LEFT: 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Product Type */}
              <Card className="border-stone-200 shadow-xs">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 font-inter">Product Type</h3>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {productType}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setProductType('simple')}
                      className={`px-2.5 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                        productType === 'simple'
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductType('variable')}
                      className={`px-2.5 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                        productType === 'variable'
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Variable
                    </button>
                  </div>

                  {productType === 'variable' && (
                    <div className="pt-1 flex items-center justify-between text-xs text-stone-500">
                      <span>{variations.length} variant(s)</span>
                      <button
                        type="button"
                        onClick={scrollToStudio}
                        className="text-[#FF6B00] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        Scroll to matrix <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Card */}
              <Card className="border-stone-200 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 font-inter">Pricing</h3>
                    {discountPercent && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {discountPercent}% off
                      </span>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-stone-700">Regular Price (₹) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-xs font-mono font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-stone-700">Sale Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-xs font-mono font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-stone-700">Compare-at Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-9 text-xs font-mono font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Inventory & Status Card */}
              <Card className="border-stone-200 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 font-inter">Inventory</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-stone-700">Stock Units</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="50"
                            className="h-9 text-xs font-mono font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-stone-700">Visibility</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white h-9 text-xs font-medium">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active" className="text-xs">Active</SelectItem>
                            <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                            <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* COLUMN 2: Details & Shipping (MIDDLE: 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-stone-200 shadow-xs">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 font-inter">Product Details</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-stone-700">Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Product name"
                            className="h-9 text-sm font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-semibold text-stone-700">SKU</FormLabel>
                            {!isEdit && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const skuData = await getNextSuggestedSku()
                                  if (skuData?.sku) {
                                    form.setValue('sku', skuData.sku, { shouldValidate: true })
                                    toast.success(`Assigned ${skuData.sku}`)
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF6B00] hover:underline"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                Auto-suggest
                              </button>
                            )}
                          </div>
                          <FormControl>
                            <Input placeholder="SMEXXXXX" className="h-9 text-xs font-mono uppercase" {...field} />
                          </FormControl>
                          <FormMessage className="text-[11px] text-red-600 font-medium" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-stone-700">Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white h-9 text-xs">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id || cat} value={cat.id || cat} className="text-xs">
                                  {(cat.name || cat).charAt(0).toUpperCase() + (cat.name || cat).slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[11px] text-red-600 font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="shortDescription"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-semibold text-stone-700">Short Summary</FormLabel>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {(field.value || '').length}/200
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Brief summary for catalog previews..."
                            maxLength={200}
                            className="text-xs resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-semibold text-stone-700">Detailed Description</FormLabel>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {(field.value || '').replace(/<[^>]*>/g, '').length}/1000
                          </span>
                        </div>
                        <FormControl>
                          <RichTextEditor
                            placeholder="Full product description..."
                            maxLength={1000}
                            minHeight="110px"
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Shipping & Dimensions Card */}
              <Card className="border-stone-200 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 font-inter">Shipping & Dimensions</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-medium text-stone-600">Weight (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.5" className="h-8 text-xs font-mono px-2" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px] text-red-600" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-medium text-stone-600">Length (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="10" className="h-8 text-xs font-mono px-2" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px] text-red-600" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-medium text-stone-600">Width (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="10" className="h-8 text-xs font-mono px-2" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px] text-red-600" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-medium text-stone-600">Height (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="5" className="h-8 text-xs font-mono px-2" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px] text-red-600" />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COLUMN 3: Media (RIGHT: 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-stone-200 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 font-inter">Media</h3>
                    <span className="text-[11px] font-mono text-stone-500 font-medium">({images.length})</span>
                  </div>

                  {/* Primary Featured Cover Preview */}
                  {images.length > 0 ? (
                    <div className="space-y-2">
                      <div className="group relative rounded-lg border border-stone-200 overflow-hidden bg-stone-100 aspect-square flex items-center justify-center shadow-xs">
                        <img
                          src={images[0]}
                          alt="Primary Cover"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-[#FF6B00] text-white text-[10px] px-2 py-0.5 font-semibold shadow-xs flex items-center gap-1 border-0">
                            <Star className="w-3 h-3 fill-current" />
                            Cover
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            disabled={deletingIndex === 0}
                            onClick={() => handleRemoveImage(0, images[0])}
                            className="h-7 w-7 bg-red-600 hover:bg-red-700 text-white shadow-xs rounded-md cursor-pointer"
                            title="Delete cover image"
                          >
                            {deletingIndex === 0 ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Secondary Thumbnails */}
                      {images.length > 1 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="grid grid-cols-3 gap-2">
                            {images.slice(1).map((imgUrl, sliceIdx) => {
                              const actualIdx = sliceIdx + 1
                              return (
                                <div
                                  key={`${imgUrl}-${actualIdx}`}
                                  className="group relative rounded-md border border-stone-200 overflow-hidden bg-stone-100 aspect-square flex items-center justify-center"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Product view ${actualIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimaryImage(actualIdx)}
                                      className="p-1 rounded bg-white text-stone-800 hover:text-[#FF6B00] shadow-xs cursor-pointer"
                                      title="Set as cover"
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingIndex === actualIdx}
                                      onClick={() => handleRemoveImage(actualIdx, imgUrl)}
                                      className="p-1 rounded bg-red-600 text-white hover:bg-red-700 shadow-xs cursor-pointer"
                                      title="Delete image"
                                    >
                                      {deletingIndex === actualIdx ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50 aspect-4/3 flex flex-col items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-stone-300 mx-auto mb-1.5" />
                      <p className="text-xs text-stone-500 font-medium">No cover image uploaded</p>
                    </div>
                  )}

                  {/* Dropzone Upload */}
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
                    className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-[#FF6B00] bg-orange-50/50'
                        : 'border-stone-300 hover:border-stone-400 bg-stone-50/70 hover:bg-stone-50'
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
                      <div className="flex flex-col items-center justify-center space-y-1.5 py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-[#FF6B00]" />
                        <p className="text-[11px] text-stone-600 font-medium">Uploading image...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 py-1.5">
                        <UploadCloud className="h-6 w-6 text-stone-400" />
                        <div className="text-xs text-stone-700 font-medium">
                          <span className="text-[#FF6B00] font-semibold">Click to upload</span> or drag and drop
                        </div>
                        <p className="text-[10px] text-stone-400">JPG, PNG, WebP up to 5MB</p>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-[11px] text-red-600 font-medium">{uploadError}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* FULL-WIDTH VARIANTS ROW (Only when variable) */}
            {productType === 'variable' && (
              <div id="variation-studio" className="lg:col-span-12 space-y-4 pt-1">
                <Card className="border-stone-200 shadow-xs">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-stone-900">Variants</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddAttribute}
                          className="h-8 text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Attribute
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleGenerateVariations}
                          className="h-8 text-xs font-semibold bg-[#FF6B00] hover:bg-[#e05e00] text-white cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Generate Variations ({variations.length})
                        </Button>
                      </div>
                    </div>

                    {/* Attributes Definition */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attributes.map((attr, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-stone-50/70 p-2.5 rounded-md border border-stone-200">
                          <div className="w-1/3">
                            <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-1">
                              Attribute Name
                            </label>
                            <Input
                              placeholder="e.g. Size"
                              value={attr.name}
                              onChange={(e) => handleAttributeChange(idx, 'name', e.target.value)}
                              className="h-8 text-xs bg-white font-medium"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-stone-500 uppercase block mb-1">
                              Values (comma separated)
                            </label>
                            <Input
                              placeholder="e.g. 50g, 100g, 250g"
                              value={attr.values}
                              onChange={(e) => handleAttributeChange(idx, 'values', e.target.value)}
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                          {attributes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAttribute(idx)}
                              className="h-8 w-8 text-stone-400 hover:text-red-600 mt-4 cursor-pointer"
                              title="Delete attribute"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Variations Matrix */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-800">
                          Matrix ({variations.length})
                        </span>
                        {variations.length > 0 && (
                          <div className="flex items-center gap-3 text-[11px]">
                            <button
                              type="button"
                              onClick={handleBulkPrice}
                              className="text-[#FF6B00] hover:underline font-medium cursor-pointer"
                            >
                              Apply base price to all
                            </button>
                            <span className="text-stone-300">•</span>
                            <button
                              type="button"
                              onClick={handleBulkStock}
                              className="text-[#FF6B00] hover:underline font-medium cursor-pointer"
                            >
                              Apply base stock to all
                            </button>
                          </div>
                        )}
                      </div>

                      {variations.length > 0 ? (
                        <div className="border border-stone-200 rounded-lg overflow-x-auto bg-white">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px]">
                              <tr>
                                <th className="py-2.5 px-3 min-w-[130px]">Variant</th>
                                <th className="py-2.5 px-3 min-w-[140px]">SKU</th>
                                <th className="py-2.5 px-3 w-28">Price (₹)</th>
                                <th className="py-2.5 px-3 w-28">Sale Price (₹)</th>
                                <th className="py-2.5 px-3 w-24">Stock</th>
                                <th className="py-2.5 px-3 w-40">Image</th>
                                <th className="py-2.5 px-3 w-24 text-center">Status</th>
                                <th className="py-2.5 px-2 w-10 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {variations.map((v, vIdx) => {
                                const isInactive = v.isActive === false
                                return (
                                  <tr
                                    key={v.id || vIdx}
                                    className={`transition-colors ${
                                      isInactive
                                        ? 'bg-stone-100/60 opacity-60 hover:bg-stone-100'
                                        : 'hover:bg-stone-50/60'
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-semibold text-stone-900">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono border ${
                                          isInactive
                                            ? 'bg-stone-200 text-stone-500 border-stone-300 line-through'
                                            : 'bg-stone-100 text-stone-800 border-stone-200'
                                        }`}>
                                          {v.combination}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3">
                                      <Input
                                        value={v.sku || ''}
                                        onChange={(e) => handleVariationChange(vIdx, 'sku', e.target.value)}
                                        className="h-8 text-xs font-mono uppercase font-medium"
                                        placeholder="SKU"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={v.price ?? ''}
                                        onChange={(e) => handleVariationChange(vIdx, 'price', e.target.value)}
                                        className="h-8 text-xs font-mono font-medium"
                                        placeholder="Price"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={v.salePrice || ''}
                                        onChange={(e) => handleVariationChange(vIdx, 'salePrice', e.target.value)}
                                        className="h-8 text-xs font-mono"
                                        placeholder="Optional"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={v.stockQuantity ?? ''}
                                        onChange={(e) => handleVariationChange(vIdx, 'stockQuantity', e.target.value)}
                                        className="h-8 text-xs font-mono"
                                        placeholder="Stock"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <Select
                                        value={v.image || 'default'}
                                        onValueChange={(val) => handleVariationChange(vIdx, 'image', val === 'default' ? '' : val)}
                                      >
                                        <SelectTrigger className="h-8 text-xs bg-white">
                                          <SelectValue placeholder="Cover" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="default">Default Cover</SelectItem>
                                          {images.filter(Boolean).map((imgUrl, i) => (
                                            <SelectItem key={i} value={imgUrl}>
                                              Photo #{i + 1}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVariationActive(vIdx)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                                          isInactive
                                            ? 'bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        }`}
                                        title={isInactive ? 'Click to re-activate' : 'Click to deactivate'}
                                      >
                                        {isInactive ? 'Inactive' : 'Active'}
                                      </button>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveVariation(vIdx)}
                                        className="h-7 w-7 text-stone-400 hover:text-red-600 cursor-pointer"
                                        title={v.isExisting || v.id ? 'Deactivate variation' : 'Delete variant'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50 space-y-2">
                          <p className="text-xs text-stone-500 font-medium">No variations generated yet</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateVariations}
                            className="h-8 text-xs cursor-pointer border-[#FF6B00] text-[#FF6B00] hover:bg-orange-50 font-semibold"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#FF6B00]" />
                            Generate Variations from Attributes
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
