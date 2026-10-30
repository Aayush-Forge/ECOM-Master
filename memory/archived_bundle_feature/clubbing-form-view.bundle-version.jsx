'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  createClubbing,
  updateClubbing,
  getClubbingById,
  FESTIVE_BANNER_PRESETS
} from '@/lib/api/clubbings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Image as ImageIcon,
  Calendar,
  Layers,
  Percent,
  IndianRupee,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Catalog Categories' },
  { value: 'incense-sticks', label: 'Sacred Agarbatti & Incense Sticks' },
  { value: 'sambrani-kits-2', label: 'Sambrani Cups & Dhoop Kits' },
  { value: 'bamboo-free-dhoop-sticks', label: 'Bamboo-Free Pure Dhoop' },
  { value: 'brass-puja-accessories', label: 'Brass Puja Accessories' },
  { value: 'festive-gift-boxes', label: 'Corporate & Festive Gift Boxes' },
]

export default function ClubbingFormView({ initialData = null, isEdit = false, basePath = '/admin/clubbings' }) {
  const router = useRouter()
  const params = useParams()
  const fileInputRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(isEdit && !initialData)
  const [errors, setErrors] = useState({})
  const [recordId, setRecordId] = useState(initialData?.id || (params?.id ? String(params.id) : null))

  // Form State
  const [name, setName] = useState(initialData?.name || '')
  const [tagline, setTagline] = useState(initialData?.tagline || 'Diwali Sale')
  const [description, setDescription] = useState(initialData?.description || '')
  const [type, setType] = useState(initialData?.type || 'fixed_price_bundle')
  const [requiredQuantity, setRequiredQuantity] = useState(String(initialData?.requiredQuantity || '3'))
  const [fixedPrice, setFixedPrice] = useState(initialData?.fixedPrice !== null && initialData?.fixedPrice !== undefined ? String(initialData.fixedPrice) : '999')
  const [percentageOff, setPercentageOff] = useState(initialData?.percentageOff !== null && initialData?.percentageOff !== undefined ? String(initialData.percentageOff) : '20')
  const [applicableCategory, setApplicableCategory] = useState(initialData?.applicableCategory || 'all')
  const [bannerImage, setBannerImage] = useState(initialData?.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
  const [startsAt, setStartsAt] = useState(initialData?.startsAt ? initialData.startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [endsAt, setEndsAt] = useState(initialData?.endsAt ? initialData.endsAt.slice(0, 10) : '')
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true)
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(initialData?.featuredOnHomepage !== undefined ? initialData.featuredOnHomepage : true)

  useEffect(() => {
    if (isEdit && !initialData && params?.id) {
      const loadData = async () => {
        setLoadingInitial(true)
        try {
          const item = await getClubbingById(params.id)
          if (item) {
            setRecordId(item.id)
            setName(item.name || '')
            setTagline(item.tagline || 'Diwali Sale')
            setDescription(item.description || '')
            setType(item.type || 'fixed_price_bundle')
            setRequiredQuantity(String(item.requiredQuantity || '3'))
            if (item.fixedPrice !== null && item.fixedPrice !== undefined) setFixedPrice(String(item.fixedPrice))
            if (item.percentageOff !== null && item.percentageOff !== undefined) setPercentageOff(String(item.percentageOff))
            setApplicableCategory(item.applicableCategory || 'all')
            setBannerImage(item.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
            if (item.startsAt) setStartsAt(item.startsAt.slice(0, 10))
            if (item.endsAt) setEndsAt(item.endsAt.slice(0, 10))
            setIsActive(item.isActive !== undefined ? item.isActive : true)
            setFeaturedOnHomepage(item.featuredOnHomepage !== undefined ? item.featuredOnHomepage : true)
          } else {
            toast.error('Clubbing campaign not found')
            router.push(basePath)
          }
        } catch (err) {
          console.error('Failed to load clubbing:', err)
          toast.error('Failed to load campaign details')
        } finally {
          setLoadingInitial(false)
        }
      }
      loadData()
    }
  }, [isEdit, initialData, params?.id, basePath, router])

  // Handle local image file upload & convert to Base64
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result
      if (typeof result === 'string') {
        setBannerImage(result)
        toast.success(`Banner image "${file.name}" loaded successfully`)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const newErrors = {}
    if (!name.trim()) newErrors.name = 'Campaign name is required'
    if (!tagline.trim()) newErrors.tagline = 'Tagline / Badge text is required (e.g. Diwali Sale)'
    if (!requiredQuantity || parseInt(requiredQuantity, 10) < 1) {
      newErrors.requiredQuantity = 'Bundle quantity must be at least 1'
    }

    if (type === 'fixed_price_bundle') {
      if (!fixedPrice || parseFloat(fixedPrice) <= 0) {
        newErrors.fixedPrice = 'Please enter a valid bundle price'
      }
    } else if (type === 'percentage_off_bundle') {
      if (!percentageOff || parseFloat(percentageOff) <= 0 || parseFloat(percentageOff) > 90) {
        newErrors.percentageOff = 'Please enter a discount percentage between 1 and 90'
      }
    }

    if (!bannerImage) {
      newErrors.bannerImage = 'A banner image is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please review the form errors before saving')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        type,
        requiredQuantity: parseInt(requiredQuantity, 10),
        fixedPrice: type === 'fixed_price_bundle' ? parseFloat(fixedPrice) : null,
        percentageOff: type === 'percentage_off_bundle' ? parseFloat(percentageOff) : null,
        applicableCategory: applicableCategory === 'all' ? null : applicableCategory,
        bannerImage,
        startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive,
        featuredOnHomepage,
      }

      if (isEdit && (recordId || initialData?.id)) {
        await updateClubbing(recordId || initialData.id, payload)
        toast.success(`Clubbing campaign "${name}" updated successfully!`)
      } else {
        await createClubbing(payload)
        toast.success(`Clubbing campaign "${name}" created and published!`)
      }

      router.push(basePath)
    } catch (err) {
      console.error('Failed to save clubbing:', err)
      toast.error(err?.message || 'Failed to save clubbing campaign')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 text-stone-600">
            <Link href={basePath}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">
              {isEdit ? 'Edit Clubbing Campaign' : 'Create New Clubbing Campaign'}
            </h2>
            <p className="text-xs text-stone-500 font-inter">
              Configure bundle discount rules, festive tagline, and upload custom promotional banners
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-stone-200">
            <Link href={basePath}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#6B1024] hover:bg-[#520c1b] text-white font-bold"
          >
            {submitting ? 'Saving Campaign...' : isEdit ? 'Update Campaign' : 'Publish Campaign'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Campaign Details & Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Campaign Details */}
          <Card className="border-stone-200 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF6B00]" /> Campaign Details
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                General branding and customer-facing festival information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-stone-700">
                  Campaign Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Diwali Dhamaka Clubbing, Navratri Grand Bundle"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors((prev) => ({ ...prev, name: null }))
                  }}
                  className={errors.name ? 'border-rose-500' : ''}
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tagline" className="text-xs font-semibold text-stone-700">
                    Badge / Tagline <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="e.g. Diwali Sale, Diwali Clubbing, Festive Special"
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value)
                      if (errors.tagline) setErrors((prev) => ({ ...prev, tagline: null }))
                    }}
                    className={errors.tagline ? 'border-rose-500' : ''}
                  />
                  {errors.tagline ? (
                    <p className="text-xs text-rose-500">{errors.tagline}</p>
                  ) : (
                    <p className="text-[11px] text-stone-400">Appears on banner pill & navigation badge</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold text-stone-700">
                    Applicable Catalog Category
                  </Label>
                  <Select value={applicableCategory} onValueChange={setApplicableCategory}>
                    <SelectTrigger id="category" className="bg-white">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold text-stone-700">
                  Campaign Description
                </Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Explain the bundle savings and festival blessings for customers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Bundle Pricing & Discount Rules */}
          <Card className="border-stone-200 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#6B1024]" /> Bundle Rules & Pricing
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Define the trigger quantity and bundle calculation model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Type Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setType('fixed_price_bundle')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    type === 'fixed_price_bundle'
                      ? 'border-[#6B1024] bg-stone-50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-stone-900 flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-[#6B1024]" /> Fixed Price Bundle
                    </span>
                    {type === 'fixed_price_bundle' && <CheckCircle2 className="w-4 h-4 text-[#6B1024]" />}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Customer gets a set bundle for a single flat price (e.g. "Any 3 for ₹999")
                  </p>
                </div>

                <div
                  onClick={() => setType('percentage_off_bundle')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    type === 'percentage_off_bundle'
                      ? 'border-[#FF6B00] bg-stone-50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-stone-900 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-[#FF6B00]" /> Percentage Discount
                    </span>
                    {type === 'percentage_off_bundle' && <CheckCircle2 className="w-4 h-4 text-[#FF6B00]" />}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Customer receives percentage savings when purchasing target quantity (e.g. "Buy 3, Get 20% Off")
                  </p>
                </div>
              </div>

              {/* Dynamic Rule Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="requiredQuantity" className="text-xs font-semibold text-stone-700">
                    Required Quantity <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="requiredQuantity"
                    type="number"
                    min="1"
                    placeholder="3"
                    value={requiredQuantity}
                    onChange={(e) => {
                      setRequiredQuantity(e.target.value)
                      if (errors.requiredQuantity) setErrors((prev) => ({ ...prev, requiredQuantity: null }))
                    }}
                    className={errors.requiredQuantity ? 'border-rose-500' : ''}
                  />
                  {errors.requiredQuantity ? (
                    <p className="text-xs text-rose-500">{errors.requiredQuantity}</p>
                  ) : (
                    <p className="text-[11px] text-stone-400">Minimum items customer must choose</p>
                  )}
                </div>

                {type === 'fixed_price_bundle' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="fixedPrice" className="text-xs font-semibold text-stone-700">
                      Bundle Flat Price (₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="fixedPrice"
                      type="number"
                      step="1"
                      placeholder="999"
                      value={fixedPrice}
                      onChange={(e) => {
                        setFixedPrice(e.target.value)
                        if (errors.fixedPrice) setErrors((prev) => ({ ...prev, fixedPrice: null }))
                      }}
                      className={errors.fixedPrice ? 'border-rose-500' : ''}
                    />
                    {errors.fixedPrice ? (
                      <p className="text-xs text-rose-500">{errors.fixedPrice}</p>
                    ) : (
                      <p className="text-[11px] text-stone-400">Total charged for the bundle</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="percentageOff" className="text-xs font-semibold text-stone-700">
                      Discount Percentage (%) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="percentageOff"
                      type="number"
                      step="1"
                      min="1"
                      max="90"
                      placeholder="20"
                      value={percentageOff}
                      onChange={(e) => {
                        setPercentageOff(e.target.value)
                        if (errors.percentageOff) setErrors((prev) => ({ ...prev, percentageOff: null }))
                      }}
                      className={errors.percentageOff ? 'border-rose-500' : ''}
                    />
                    {errors.percentageOff ? (
                      <p className="text-xs text-rose-500">{errors.percentageOff}</p>
                    ) : (
                      <p className="text-[11px] text-stone-400">Percentage deducted from bundle items</p>
                    )}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <div className="space-y-1.5">
                  <Label htmlFor="startsAt" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" /> Start Date
                  </Label>
                  <Input
                    id="startsAt"
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endsAt" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" /> End Date (Optional)
                  </Label>
                  <Input
                    id="endsAt"
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Banner Upload & Live Preview */}
        <div className="space-y-6">
          {/* Card 3: Banner Image Upload */}
          <Card className="border-stone-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D7A65B]" /> Banner Image
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Upload custom festive art or pick a curated preset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed border-stone-300 hover:border-[#6B1024] hover:bg-stone-50 py-6 flex flex-col gap-1 items-center justify-center text-xs"
              >
                <Upload className="w-5 h-5 text-stone-500" />
                <span className="font-semibold text-stone-700">Upload Banner Image File</span>
                <span className="text-[10px] text-stone-400">PNG, JPG, or WEBP up to 5MB</span>
              </Button>

              {/* URL fallback */}
              <div className="space-y-1.5">
                <Label htmlFor="bannerUrl" className="text-[11px] font-semibold text-stone-600">
                  Or Image Web URL
                </Label>
                <Input
                  id="bannerUrl"
                  placeholder="https://..."
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Festive Presets */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <Label className="text-[11px] font-semibold text-stone-600">
                  Quick Festive Presets:
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {FESTIVE_BANNER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setBannerImage(preset.url)
                        if (!tagline || tagline === 'Diwali Sale' || tagline === 'Festive Clubbing') {
                          setTagline(preset.tagline)
                        }
                      }}
                      className={`relative aspect-video rounded-md overflow-hidden border transition-all ${
                        bannerImage === preset.url
                          ? 'ring-2 ring-[#6B1024] border-transparent scale-95'
                          : 'border-stone-200 hover:opacity-90'
                      }`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                        <span className="text-[9px] text-white font-bold truncate leading-tight">
                          {preset.tagline}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Live Storefront Preview */}
          <Card className="border-stone-200 shadow-xs bg-stone-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
                Live Customer Banner Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#D7A65B]/40 shadow-sm bg-[#130306] text-white p-4">
                {/* Background image preview */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={bannerImage || FESTIVE_BANNER_PRESETS[0].url}
                    alt="Preview"
                    className="w-full h-full object-cover opacity-35"
                    onError={(e) => {
                      e.target.src = FESTIVE_BANNER_PRESETS[0].url
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/90 to-transparent" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#D7A65B] text-[#4D0013] text-[10px] font-black uppercase tracking-wider">
                      {tagline || 'Diwali Sale'}
                    </span>
                    <span className="text-[10px] text-gold-300 font-medium">✦ Special Offer</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-white leading-tight">
                    {name || 'Diwali Dhamaka Clubbing'}
                  </h4>
                  <p className="text-[11px] text-stone-200 line-clamp-2">
                    {type === 'fixed_price_bundle'
                      ? `Select any ${requiredQuantity || '3'} items and pay flat ₹${fixedPrice || '999'}!`
                      : `Get ${percentageOff || '20'}% OFF when bundling ${requiredQuantity || '3'} or more sacred items!`}
                  </p>
                  <div className="pt-1">
                    <span className="inline-block px-3 py-1 bg-white text-[#6B1024] rounded-md text-[10px] font-bold shadow-xs">
                      Shop Clubbing Deals →
                    </span>
                  </div>
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="pt-2 space-y-3 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="active-toggle" className="text-xs font-semibold text-stone-800">
                      Campaign Active
                    </Label>
                    <p className="text-[11px] text-stone-500">Allow customers to claim this bundle</p>
                  </div>
                  <Switch
                    id="active-toggle"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="homepage-toggle" className="text-xs font-semibold text-stone-800">
                      Feature on Homepage
                    </Label>
                    <p className="text-[11px] text-stone-500">Show dynamic banner on homepage</p>
                  </div>
                  <Switch
                    id="homepage-toggle"
                    checked={featuredOnHomepage}
                    onCheckedChange={setFeaturedOnHomepage}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
