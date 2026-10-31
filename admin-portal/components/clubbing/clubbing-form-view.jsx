'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  createDiscount,
  updateDiscount,
  getDiscountById,
} from '@/lib/api/discounts'
import { getAdminProducts } from '@/lib/api/products-api'
import { getAllCategories } from '@/lib/api/categories-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Sparkles,
  Layers,
  Calendar,
  Package,
  Search,
  Check,
  X,
  HelpCircle,
} from 'lucide-react'

const clubbingRuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Rule name is required.')
      .max(100, 'Name cannot exceed 100 characters.'),
    description: z
      .string()
      .trim()
      .max(250, 'Description cannot exceed 250 characters.')
      .optional()
      .or(z.literal('')),
    type: z.enum(['fixed_price_bundle', 'percentage_off_bundle']),
    discountValue: z.coerce
      .number({ invalid_type_error: 'Value must be a valid number.' })
      .positive('Offer value must be greater than 0.'),
    requiredQuantity: z.coerce
      .number({ invalid_type_error: 'Quantity must be a valid integer.' })
      .int('Quantity must be an integer.')
      .min(1, 'Minimum required quantity is 1.')
      .default(2),
    code: z
      .string()
      .trim()
      .max(40, 'Code cannot exceed 40 characters.')
      .regex(/^[A-Za-z0-9_-]*$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores.')
      .optional()
      .or(z.literal('')),
    applicableCategoryId: z.string().optional().or(z.literal('')),
    applicableProductIds: z.array(z.string()).default([]),
    startsAt: z.string().optional().or(z.literal('')),
    endsAt: z.string().optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'percentage_off_bundle' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100%.',
        path: ['discountValue'],
      })
    }

    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt)
      const end = new Date(data.endsAt)
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date.',
          path: ['endsAt'],
        })
      }
    }
  })

export default function ClubbingFormView({ basePath = '/clubbing-rules', isEdit = false }) {
  const router = useRouter()
  const params = useParams()
  const ruleId = params?.id

  const [categories, setCategories] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clubbingRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'fixed_price_bundle',
      discountValue: '',
      requiredQuantity: 2,
      code: '',
      applicableCategoryId: '',
      applicableProductIds: [],
      startsAt: '',
      endsAt: '',
      isActive: true,
    },
  })

  const formValues = watch()

  // Load initial data (categories and products)
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catsRes, prodsRes] = await Promise.all([
          getAllCategories().catch(() => []),
          getAdminProducts({ per_page: 100 }).catch(() => ({ data: [] })),
        ])
        setCategories(Array.isArray(catsRes) ? catsRes : [])
        const rawProds = prodsRes?.data || prodsRes?.products || (Array.isArray(prodsRes) ? prodsRes : [])
        setAllProducts(rawProds)
      } catch (err) {
        console.error('Failed to load initial data:', err)
      }
    }
    loadMeta()
  }, [])

  // If in edit mode, fetch existing rule
  useEffect(() => {
    if (!isEdit || !ruleId) return

    async function loadRule() {
      setLoading(true)
      try {
        const data = await getDiscountById(ruleId)
        if (!data) {
          toast.error('Rule not found')
          router.push(basePath)
          return
        }

        setValue('name', data.name || '')
        setValue('description', data.description || '')
        setValue('type', data.type || 'fixed_price_bundle')
        setValue(
          'discountValue',
          data.type === 'fixed_price_bundle' ? Number(data.fixedPrice) : Number(data.percentageOff),
        )
        setValue('requiredQuantity', Number(data.requiredQuantity) || 2)
        setValue('code', data.code || '')
        setValue('applicableCategoryId', data.applicableCategoryId || '')
        setValue(
          'applicableProductIds',
          Array.isArray(data.products) ? data.products.map((p) => p.productId || p.id) : [],
        )
        setValue(
          'startsAt',
          data.startsAt ? new Date(data.startsAt).toISOString().slice(0, 16) : '',
        )
        setValue(
          'endsAt',
          data.endsAt ? new Date(data.endsAt).toISOString().slice(0, 16) : '',
        )
        setValue('isActive', Boolean(data.isActive))
      } catch (err) {
        console.error('Failed to load rule:', err)
        toast.error('Failed to load clubbing rule')
      } finally {
        setLoading(false)
      }
    }
    loadRule()
  }, [isEdit, ruleId, setValue, router, basePath])

  const toggleProduct = (productId) => {
    const current = formValues.applicableProductIds || []
    if (current.includes(productId)) {
      setValue(
        'applicableProductIds',
        current.filter((id) => id !== productId),
        { shouldValidate: true },
      )
    } else {
      setValue('applicableProductIds', [...current, productId], { shouldValidate: true })
    }
  }

  const selectAllFiltered = (filtered) => {
    const current = new Set(formValues.applicableProductIds || [])
    filtered.forEach((p) => current.add(p.id))
    setValue('applicableProductIds', Array.from(current), { shouldValidate: true })
  }

  const clearAllSelected = () => {
    setValue('applicableProductIds', [], { shouldValidate: true })
  }

  const filteredProducts = allProducts.filter((p) => {
    if (!productSearch.trim()) return true
    const q = productSearch.toLowerCase()
    return (
      p.title?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q)
    )
  })

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        type: data.type,
        requiredQuantity: Number(data.requiredQuantity),
        fixedPrice: data.type === 'fixed_price_bundle' ? Number(data.discountValue) : null,
        percentageOff: data.type === 'percentage_off_bundle' ? Number(data.discountValue) : null,
        code: data.code && data.code.trim() ? data.code.trim().toUpperCase() : null,
        applicableCategoryId: data.applicableCategoryId || null,
        applicableProductIds: data.applicableProductIds || [],
        startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
        isActive: Boolean(data.isActive),
      }

      if (isEdit) {
        await updateDiscount(ruleId, payload)
        toast.success(`Clubbing rule "${data.name}" updated successfully`)
      } else {
        await createDiscount(payload)
        toast.success(`Clubbing rule "${data.name}" created successfully`)
      }
      router.push(basePath)
    } catch (err) {
      console.error('Failed to save clubbing rule:', err)
      toast.error(err.message || 'Failed to save clubbing rule')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-stone-500 hover:text-stone-900"
          >
            <Link href={basePath}>
              <ArrowLeft size={16} className="mr-1.5" />
              Back to Clubbing Rules
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Sparkles size={22} className="text-[#FF6B00]" />
            {isEdit ? 'Edit Clubbing Rule' : 'Create New Clubbing Rule'}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Define volume bundle rules, festival clubbing offers, and eligible items for your storefront.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(basePath)}
            className="border-stone-200 text-stone-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            size="sm"
            className="bg-[#FF6B00] hover:bg-[#e05e00] text-white shadow-sm font-medium"
          >
            <Save size={16} className="mr-1.5" />
            {saving ? 'Saving Rule...' : isEdit ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </div>

      {/* Live Homepage Preview Banner */}
      <div className="bg-gradient-to-r from-[#1b050a] via-[#350a14] to-[#1b050a] rounded-xl p-5 border border-amber-900/40 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-3 top-3 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 space-y-1.5 max-w-xl">
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#D7A65B] flex items-center gap-1.5">
            <Sparkles size={12} />
            HOMEPAGE BUNDLE PREVIEW
          </span>
          <h3 className="text-lg font-serif font-bold text-stone-100">
            {formValues.name || 'Your Clubbing Rule Name (e.g. Diwali Festival Bundle)'}
          </h3>
          <p className="text-xs text-stone-300">
            {formValues.description ||
              'Customers will see this description directly under the bundle showcase on the homepage.'}
          </p>
          <div className="pt-2 flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#D7A65B] text-[#130306]">
              {formValues.type === 'fixed_price_bundle'
                ? `Buy any ${formValues.requiredQuantity || 2} for ₹${formValues.discountValue || '...'}`
                : `Buy any ${formValues.requiredQuantity || 2} & get ${formValues.discountValue || '...'}% OFF`}
            </span>
            <span className="text-[11px] text-stone-400">
              {formValues.applicableProductIds?.length > 0
                ? `${formValues.applicableProductIds.length} products included`
                : formValues.applicableCategoryId
                ? `Category-wide bundle`
                : 'All products eligible'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Rule Identification & Offer Type */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
        <h2 className="text-base font-semibold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Layers size={18} className="text-[#FF6B00]" />
          Bundle Definition & Offer Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name" className="text-xs font-semibold text-stone-700">
              Rule Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g. Diwali Festival Special, Temple Incense Trio, Buy 2 for 499"
              {...register('name')}
              className="border-stone-200 focus:border-[#FF6B00]"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description" className="text-xs font-semibold text-stone-700">
              Customer-Facing Description
            </Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="e.g. Mix and match any 2 fragrances from our premium sacred collection and enjoy special festival pricing."
              {...register('description')}
              className="border-stone-200 text-sm focus:border-[#FF6B00]"
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-stone-700">Bundle Discount Type *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="border-stone-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_price_bundle">
                      Fixed Price Bundle (e.g. Any 3 for ₹499)
                    </SelectItem>
                    <SelectItem value="percentage_off_bundle">
                      Percentage Off Bundle (e.g. Buy 2 Get 15% Off)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredQuantity" className="text-xs font-semibold text-stone-700">
              Trigger Quantity (Items Required) *
            </Label>
            <Input
              id="requiredQuantity"
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 2, 3"
              {...register('requiredQuantity')}
              className="border-stone-200"
            />
            {errors.requiredQuantity && (
              <p className="text-xs text-red-500">{errors.requiredQuantity.message}</p>
            )}
            <p className="text-[11px] text-stone-400">
              Minimum qualifying items the customer must have in cart to unlock this offer.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountValue" className="text-xs font-semibold text-stone-700">
              {formValues.type === 'fixed_price_bundle'
                ? 'Fixed Bundle Price (₹) *'
                : 'Percentage Discount (%) *'}
            </Label>
            <Input
              id="discountValue"
              type="number"
              min={0}
              step={formValues.type === 'fixed_price_bundle' ? '1' : '0.1'}
              placeholder={formValues.type === 'fixed_price_bundle' ? 'e.g. 499' : 'e.g. 15'}
              {...register('discountValue')}
              className="border-stone-200 font-mono text-sm"
            />
            {errors.discountValue && (
              <p className="text-xs text-red-500">{errors.discountValue.message}</p>
            )}
            <p className="text-[11px] text-stone-400">
              {formValues.type === 'fixed_price_bundle'
                ? 'The total price for the qualifying set of items.'
                : 'Percentage deducted from qualifying items once quantity threshold is met.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs font-semibold text-stone-700">
              Optional Coupon Code (Leave empty for automatic homepage bundle)
            </Label>
            <Input
              id="code"
              placeholder="e.g. DIWALI2026 (Leave blank for automatic bundle)"
              {...register('code')}
              className="border-stone-200 font-mono text-sm uppercase"
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            <p className="text-[11px] text-stone-400">
              Automatic bundles (no code) are featured directly on the storefront homepage and applied automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Eligible Scope (Category & Multi-Product Picker) */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
        <h2 className="text-base font-semibold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Package size={18} className="text-[#FF6B00]" />
          Eligible Items Scope
        </h2>

        <div className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label className="text-xs font-semibold text-stone-700">Applicable Category (Optional)</Label>
            <Controller
              name="applicableCategoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'all'}
                  onValueChange={(val) => field.onChange(val === 'all' ? '' : val)}
                >
                  <SelectTrigger className="border-stone-200 text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-[11px] text-stone-400">
              Restrict qualifying items to a specific category, or select specific individual products below.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-stone-700">
                Specific Products Included ({formValues.applicableProductIds?.length || 0} selected)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllFiltered(filteredProducts)}
                  className="h-7 text-xs border-stone-200"
                >
                  Select All Filtered
                </Button>
                {formValues.applicableProductIds?.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSelected}
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Search products by title, SKU, or slug to add to this bundle..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-stone-50 border-stone-200 focus:bg-white"
              />
            </div>

            {/* Products Selection Grid */}
            <div className="border border-stone-200 rounded-lg max-h-72 overflow-y-auto p-2 divide-y divide-stone-100 bg-stone-50/30">
              {filteredProducts.length === 0 ? (
                <p className="p-4 text-center text-xs text-stone-400">No products match your search.</p>
              ) : (
                filteredProducts.map((prod) => {
                  const isSelected = formValues.applicableProductIds?.includes(prod.id)
                  const imgUrl = Array.isArray(prod.images) && prod.images.length > 0
                    ? typeof prod.images[0] === 'string'
                      ? prod.images[0]
                      : prod.images[0]?.src
                    : null

                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleProduct(prod.id)}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/70 border border-amber-200'
                          : 'hover:bg-stone-100/70 border border-transparent'
                      }`}
                    >
                      <div className="w-5 h-5 rounded border border-stone-300 flex items-center justify-center shrink-0 bg-white">
                        {isSelected && <Check size={14} className="text-amber-600 stroke-[3]" />}
                      </div>

                      <div className="w-10 h-10 rounded bg-stone-200 shrink-0 overflow-hidden relative">
                        {imgUrl ? (
                          <Image src={imgUrl} alt={prod.title || 'Product'} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Package size={16} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{prod.title}</p>
                        <p className="text-[10px] text-stone-400 font-mono">SKU: {prod.sku || 'N/A'}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-stone-900">
                          ₹{Number(prod.salePrice || prod.basePrice || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <p className="text-[11px] text-stone-400">
              If no specific products are selected, all items in the chosen category (or storewide) qualify.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Schedule & Status */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
        <h2 className="text-base font-semibold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Calendar size={18} className="text-[#FF6B00]" />
          Schedule & Storefront Visibility
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="startsAt" className="text-xs font-semibold text-stone-700">
              Start Date & Time (Optional)
            </Label>
            <Input
              id="startsAt"
              type="datetime-local"
              {...register('startsAt')}
              className="border-stone-200 text-xs"
            />
            <p className="text-[11px] text-stone-400">Leave blank to activate immediately.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endsAt" className="text-xs font-semibold text-stone-700">
              Expiration Date & Time (Optional)
            </Label>
            <Input
              id="endsAt"
              type="datetime-local"
              {...register('endsAt')}
              className="border-stone-200 text-xs"
            />
            {errors.endsAt && <p className="text-xs text-red-500">{errors.endsAt.message}</p>}
            <p className="text-[11px] text-stone-400">Leave blank for no expiration.</p>
          </div>

          <div className="md:col-span-2 pt-2 flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200">
            <div>
              <p className="text-xs font-bold text-stone-800">Rule Active Status</p>
              <p className="text-[11px] text-stone-500">
                When enabled and scheduled, this clubbing bundle will appear on the storefront homepage and apply at checkout.
              </p>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(basePath)}
          className="border-stone-200 text-stone-600"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#FF6B00] hover:bg-[#e05e00] text-white shadow-sm font-medium px-6"
        >
          <Save size={16} className="mr-1.5" />
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Clubbing Rule'}
        </Button>
      </div>
    </form>
  )
}
