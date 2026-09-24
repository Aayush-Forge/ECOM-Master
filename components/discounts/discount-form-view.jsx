'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createDiscount, updateDiscount, getDiscountById } from '@/lib/api/discounts'
import { getAllCategories } from '@/lib/api/categories-api'
import { getAdminProducts } from '@/lib/api/products-api'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Tag,
  SlidersHorizontal,
  Package,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const discountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Coupon code / name is required.')
      .max(50, 'Code cannot exceed 50 characters.')
      .regex(/^[A-Za-z0-9_-]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores.'),
    description: z.string().trim().max(250, 'Description cannot exceed 250 characters.').optional(),
    type: z.enum(['fixed_price_bundle', 'percentage_off_bundle']),
    discountValue: z.coerce
      .number({ invalid_type_error: 'Amount must be a valid number.' })
      .positive('Coupon amount must be greater than 0.'),
    requiredQuantity: z.coerce
      .number({ invalid_type_error: 'Quantity must be a valid integer.' })
      .int('Quantity must be an integer.')
      .min(1, 'Minimum required quantity is 1.')
      .default(1),
    applicableCategoryId: z.string().optional(),
    applicableProductIds: z.array(z.string()).default([]),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
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
          message: 'Expiry date must be after the start date.',
          path: ['endsAt'],
        })
      }
    }
  })

export default function DiscountFormView({ basePath = '/admin/discounts', isEdit = false }) {
  const router = useRouter()
  const params = useParams()
  const discountId = params?.id

  const [activeTab, setActiveTab] = useState('general') // 'general' | 'restrictions' | 'schedule'
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(discountSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      type: 'percentage_off_bundle',
      discountValue: '',
      requiredQuantity: 1,
      applicableCategoryId: 'all',
      applicableProductIds: [],
      startsAt: '',
      endsAt: '',
      isActive: true,
    },
  })

  // Load categories and products for dropdown pickers
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [cats, prods] = await Promise.all([
          getAllCategories().catch(() => []),
          getAdminProducts({ perPage: 100 }).catch(() => []),
        ])
        setCategories(Array.isArray(cats) ? cats : [])
        setProducts(Array.isArray(prods) ? prods : [])
      } catch (err) {
        console.error('Failed to load catalog data for coupons:', err)
      }
    }
    loadCatalog()
  }, [])

  // Load existing coupon if editing
  useEffect(() => {
    async function loadCoupon() {
      if (isEdit && discountId) {
        try {
          const discount = await getDiscountById(discountId)
          if (discount) {
            form.reset({
              name: discount.name || '',
              description: discount.description || '',
              type: discount.type || 'percentage_off_bundle',
              discountValue:
                discount.type === 'percentage_off_bundle'
                  ? Number(discount.percentageOff || 0)
                  : Number(discount.fixedPrice || 0),
              requiredQuantity: discount.requiredQuantity || 1,
              applicableCategoryId: discount.applicableCategoryId || 'all',
              applicableProductIds: (discount.products || []).map((p) => p.productId),
              startsAt: discount.startsAt ? discount.startsAt.slice(0, 10) : '',
              endsAt: discount.endsAt ? discount.endsAt.slice(0, 10) : '',
              isActive: discount.isActive !== undefined ? discount.isActive : true,
            })
          }
        } catch (error) {
          console.error('Failed to load discount', error)
          toast.error('Failed to load coupon details')
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    loadCoupon()
  }, [isEdit, discountId, form])

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        name: values.name.toUpperCase().trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
        requiredQuantity: Number(values.requiredQuantity || 1),
        fixedPrice: values.type === 'fixed_price_bundle' ? values.discountValue : undefined,
        percentageOff: values.type === 'percentage_off_bundle' ? values.discountValue : undefined,
        applicableCategoryId: values.applicableCategoryId === 'all' ? undefined : values.applicableCategoryId,
        applicableProductIds: values.applicableProductIds || [],
        startsAt: values.startsAt ? `${values.startsAt}T00:00:00.000Z` : undefined,
        endsAt: values.endsAt ? `${values.endsAt}T23:59:59.999Z` : undefined,
        isActive: values.isActive,
      }

      if (isEdit) {
        await updateDiscount(discountId, payload)
        toast.success(`Coupon "${payload.name}" updated successfully`)
      } else {
        await createDiscount(payload)
        toast.success(`Coupon "${payload.name}" created successfully`)
      }
      router.push(basePath)
    } catch (error) {
      console.error(error)
      toast.error(error?.message || (isEdit ? 'Failed to update coupon' : 'Failed to create coupon'))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProductIds = form.watch('applicableProductIds') || []

  const toggleProduct = (productId) => {
    const current = new Set(form.getValues('applicableProductIds') || [])
    if (current.has(productId)) {
      current.delete(productId)
    } else {
      current.add(productId)
    }
    form.setValue('applicableProductIds', Array.from(current), { shouldValidate: true })
  }

  const filteredCatalogProducts = products.filter((p) => {
    if (!productSearch.trim()) return true
    const term = productSearch.toLowerCase()
    return (
      p.title?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
    )
  })

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-stone-500 hover:text-stone-900">
            <Link href={basePath}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-stone-900 tracking-tight">
              {isEdit ? 'Edit Coupon' : 'Add New Coupon'}
            </h1>
            <p className="text-xs text-stone-500 font-inter">
              Configure discount amounts, minimum item thresholds, and product/category restrictions.
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Main WooCommerce Style Code & Title Banner */}
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-2xs space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                    Coupon Code
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. FESTIVE20, START10, FREESHIP"
                      className="font-mono text-lg font-bold tracking-wide uppercase bg-stone-50/50 border-stone-300 focus:bg-white"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-stone-500">
                    Customers enter this code at checkout to claim the discount.
                  </FormDescription>
                  <FormMessage className="text-xs text-rose-600 font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-stone-700">
                    Description (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Festival clearance sale - 15% off temple dhoop cones"
                      className="border-stone-300 bg-stone-50/30 text-xs focus:bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-stone-500">
                    Internal note or customer description explaining this discount offer.
                  </FormDescription>
                  <FormMessage className="text-xs text-rose-600 font-medium" />
                </FormItem>
              )}
            />
          </div>

          {/* WooCommerce Style Coupon Data Tabbed Box */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-2xs overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-56 bg-stone-50/80 border-b md:border-b-0 md:border-r border-stone-200 p-2 space-y-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition text-left ${
                  activeTab === 'general'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Tag className="w-4 h-4 text-stone-500" />
                <span>General</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('restrictions')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition text-left ${
                  activeTab === 'restrictions'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-stone-500" />
                <span>Usage restriction</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition text-left ${
                  activeTab === 'schedule'
                    ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <CalendarIcon className="w-4 h-4 text-stone-500" />
                <span>Schedule & Expiry</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-6 space-y-6">
              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-stone-700">
                            Discount type
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white border-stone-300">
                                <SelectValue placeholder="Select discount type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage_off_bundle">
                                Percentage discount (%)
                              </SelectItem>
                              <SelectItem value="fixed_price_bundle">
                                Fixed cart / bundle price (₹)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs text-stone-500">
                            Choose between a percentage deduction or fixed bundle amount.
                          </FormDescription>
                          <FormMessage className="text-xs text-rose-600" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-stone-700">
                            Coupon amount {form.watch('type') === 'percentage_off_bundle' ? '(%)' : '(₹)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={form.watch('type') === 'percentage_off_bundle' ? '10' : '500'}
                              className="border-stone-300 font-mono"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-stone-500">
                            Value of the coupon (e.g. 10 for 10% or 499 for fixed ₹499 price).
                          </FormDescription>
                          <FormMessage className="text-xs text-rose-600" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="requiredQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-stone-700">
                          Minimum required item quantity
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            className="w-36 border-stone-300 font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-stone-500">
                          Number of qualifying items needed in cart to activate this coupon (default is 1 for standard coupons, or 2+ for bundle deals).
                        </FormDescription>
                        <FormMessage className="text-xs text-rose-600" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-3 border-t border-stone-100">
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                          <div>
                            <FormLabel className="text-xs font-semibold text-stone-900">
                              Publish & Enable Coupon
                            </FormLabel>
                            <p className="text-xs text-stone-500 font-inter">
                              When disabled, customers cannot apply this coupon on the storefront.
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: RESTRICTIONS (CATEGORIES & PRODUCTS) */}
              {activeTab === 'restrictions' && (
                <div className="space-y-6">
                  {/* Category Restriction */}
                  <FormField
                    control={form.control}
                    name="applicableCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-stone-700">
                          Product categories
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white border-stone-300">
                              <SelectValue placeholder="All Categories (Storewide)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Categories (Storewide)</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs text-stone-500">
                          Restrict coupon to a specific product category, or leave as storewide.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {/* Product Restriction Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-700">
                        Specific Products ({selectedProductIds.length} selected)
                      </label>
                      {selectedProductIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => form.setValue('applicableProductIds', [])}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Clear all products
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">
                      If specified, coupon will apply only when these items are in the cart.
                    </p>

                    <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 space-y-3">
                      <Input
                        placeholder="Filter products by name or SKU..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="h-8 text-xs bg-white border-stone-300"
                      />

                      <div className="max-h-48 overflow-y-auto divide-y divide-stone-200 bg-white rounded border border-stone-200">
                        {filteredCatalogProducts.length === 0 ? (
                          <div className="p-4 text-xs text-center text-stone-500">
                            No products match your search.
                          </div>
                        ) : (
                          filteredCatalogProducts.map((p) => {
                            const isChecked = selectedProductIds.includes(p.id)
                            return (
                              <div
                                key={p.id}
                                onClick={() => toggleProduct(p.id)}
                                className={`flex items-center justify-between p-2 text-xs cursor-pointer hover:bg-stone-50 transition ${
                                  isChecked ? 'bg-amber-50/60 font-medium' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                                        : 'border-stone-300 bg-white'
                                    }`}
                                  >
                                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </div>
                                  <span className="truncate text-stone-800">{p.title}</span>
                                </div>
                                <span className="font-mono text-stone-400 shrink-0 ml-2">
                                  {p.sku || p.id.slice(0, 8)}
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SCHEDULE & EXPIRY */}
              {activeTab === 'schedule' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="startsAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-stone-700">
                            Coupon start date (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="border-stone-300 bg-white text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-stone-500">
                            The date this coupon will become active.
                          </FormDescription>
                          <FormMessage className="text-xs text-rose-600" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endsAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-stone-700">
                            Coupon expiry date (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="border-stone-300 bg-white text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-stone-500">
                            The date after which this coupon expires (e.g. November 30, 2026).
                          </FormDescription>
                          <FormMessage className="text-xs text-rose-600" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <Button variant="outline" asChild className="text-stone-600">
              <Link href={basePath}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter px-6 shadow-xs"
            >
              {submitting ? 'Saving...' : isEdit ? 'Update Coupon' : 'Publish Coupon'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
