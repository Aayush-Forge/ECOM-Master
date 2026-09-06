'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createDiscount, updateDiscount, getDiscountById } from '@/lib/api/discounts'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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

const discountSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    type: z.enum(['bundle', 'percentage', 'flat']),
    conditions: z.string().trim().min(1, 'Conditions are required.'),
    discountValue: z.coerce
      .number({ invalid_type_error: 'Discount Value must be a valid number.' })
      .positive('Discount Value must be greater than 0.'),
    displayValue: z.string().trim().min(1, 'Display Value is required.'),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'percentage') {
      if (data.discountValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount cannot exceed 100%.',
          path: ['discountValue'],
        })
      }
    }
  })

export default function DiscountFormView({ basePath = '/admin/discounts', isEdit = false }) {
  const router = useRouter()
  const params = useParams()
  const discountId = params?.id
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  const form = useForm({
    resolver: zodResolver(discountSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      type: 'percentage',
      conditions: '',
      discountValue: '',
      displayValue: '',
      isActive: true,
    },
  })

  useEffect(() => {
    async function loadData() {
      if (isEdit && discountId) {
        try {
          const discount = await getDiscountById(discountId)
          if (discount) {
            form.reset({
              name: discount.name || '',
              type: discount.type || 'percentage',
              conditions: discount.conditions || '',
              discountValue: discount.discountValue !== undefined ? discount.discountValue : '',
              displayValue: discount.displayValue || '',
              isActive: discount.isActive !== undefined ? discount.isActive : true,
            })
          }
        } catch (error) {
          console.error('Failed to load discount', error)
          toast.error('Failed to load discount details')
        } finally {
          setLoading(false)
        }
      }
    }
    loadData()
  }, [isEdit, discountId, form])

  async function onSubmit(values) {
    setSubmitting(true)
    try {
      if (isEdit) {
        await updateDiscount(discountId, values)
        toast.success('Discount updated successfully')
      } else {
        await createDiscount(values)
        toast.success('Discount created successfully')
      }
      router.push(basePath)
    } catch (error) {
      console.error(error)
      toast.error(isEdit ? 'Failed to update discount' : 'Failed to create discount')
    } finally {
      setSubmitting(false)
    }
  }

  const { isValid } = form.formState

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
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
          {isEdit ? 'Edit Discount Rule' : 'New Discount Rule'}
        </h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Diwali Special" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="flat">Flat Amount</SelectItem>
                          <SelectItem value="bundle">Bundle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="displayValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Value (User-facing text)</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. 10% OFF or ₹500 Flat" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="E.g. Min spend ₹2000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <div className="text-sm text-gray-500">
                        Enable or disable this discount rule
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" asChild>
                  <Link href={basePath}>Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || submitting}
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : isEdit ? 'Update Discount' : 'Save Discount'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
