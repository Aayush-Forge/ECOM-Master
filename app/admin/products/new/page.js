'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createProduct, getProductCategories } from '@/lib/api/products-api'
import { toast } from 'sonner'
import { ArrowLeft, Lock } from 'lucide-react'
import { currentUser } from '@/lib/mock-user'
import { hasRole } from '@/lib/roles'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

const productSchema = z.object({
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
  category: z.string().trim().min(1, 'Category is required.'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters.')
    .optional()
    .or(z.literal('')),
  imageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
})

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      sku: '',
      price: '',
      category: '',
      description: '',
      imageUrl: '',
    },
  })

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getProductCategories()
        setCategories(cats || [])
      } catch (error) {
        console.error('Failed to load categories', error)
      }
    }
    loadCategories()
  }, [])

  const canManage = hasRole(currentUser, 'editor')

  async function onSubmit(values) {
    if (!canManage) {
      toast.error('Viewer Employees do not have permission to create products')
      return
    }
    setSubmitting(true)
    try {
      await createProduct(values)
      toast.success('Product created successfully')
      router.push('/admin/products')
    } catch (error) {
      console.error(error)
      toast.error('Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  const { isValid } = form.formState

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h2 className="text-2xl font-display font-bold tracking-tight">New Product</h2>
      </div>

      {!canManage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2 font-inter">
          <Lock className="h-4 w-4 shrink-0" />
          <span>You are logged in with a <strong>Viewer Employee</strong> role (read-only). Creating products is disabled.</span>
        </div>
      )}

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
                      <Input placeholder="E.g. Vintage Brass Lamp" disabled={!canManage} {...field} />
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
                        <Input placeholder="E.g. LMP-BRS-001" disabled={!canManage} {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" disabled={!canManage} {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canManage}>
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

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" disabled={!canManage} {...field} />
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
                    <FormLabel>Description (Optional, max 1000 chars)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of the product..." 
                        className="min-h-[120px]"
                        disabled={!canManage}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" asChild>
                  <Link href="/admin/products">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={!canManage || !isValid || submitting}
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
