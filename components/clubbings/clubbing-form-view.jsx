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
import { SEED_PRODUCTS, SEED_CATEGORIES } from '@/lib/products-seed'
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
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Monitor,
  Smartphone,
  Tag,
  Check,
  X,
  Package
} from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Catalog Categories' },
  { value: 'sandalwood', label: 'Mysore Sandalwood' },
  { value: 'floral', label: 'Floral Notes' },
  { value: 'resins', label: 'Sacred Resins' },
  { value: 'samidha', label: 'Wood Samidha' },
  { value: 'camphor', label: 'Pure Camphor' },
  { value: 'combos', label: 'Luxury Bundles' },
]

export default function ClubbingFormView({ initialData = null, isEdit = false, basePath = '/admin/clubbings' }) {
  const router = useRouter()
  const params = useParams()
  const desktopFileInputRef = useRef(null)
  const mobileFileInputRef = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(isEdit && !initialData)
  const [errors, setErrors] = useState({})
  const [recordId, setRecordId] = useState(initialData?.id || (params?.id ? String(params.id) : null))

  // Available Inventory Products
  const [catalogProducts, setCatalogProducts] = useState(SEED_PRODUCTS)
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')

  // Form State
  const [name, setName] = useState(initialData?.name || '')
  const [tagline, setTagline] = useState(initialData?.tagline || 'Diwali Sale')
  const [description, setDescription] = useState(initialData?.description || '')
  const [applicableCategory, setApplicableCategory] = useState(initialData?.applicableCategory || 'all')
  const [startsAt, setStartsAt] = useState(initialData?.startsAt ? initialData.startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [endsAt, setEndsAt] = useState(initialData?.endsAt ? initialData.endsAt.slice(0, 10) : '')
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true)
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(initialData?.featuredOnHomepage !== undefined ? initialData.featuredOnHomepage : true)

  // Banners: Desktop & Mobile (Uploaded picture files only)
  const [bannerImageDesktop, setBannerImageDesktop] = useState(initialData?.bannerImageDesktop || initialData?.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
  const [bannerImageMobile, setBannerImageMobile] = useState(initialData?.bannerImageMobile || initialData?.bannerImageDesktop || initialData?.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
  const [previewMode, setPreviewMode] = useState('desktop') // 'desktop' | 'mobile'

  // Selected Products with Custom Clubbing Prices
  const [clubbingProducts, setClubbingProducts] = useState(initialData?.clubbingProducts || [
    {
      productId: 'sd-001',
      name: 'Royal Mysore Sandalwood',
      slug: 'royal-mysore-sandalwood',
      image: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80',
      category: 'Mysore Sandalwood',
      originalPrice: 399,
      clubbingPrice: 299,
      discountPercentage: 25,
    },
    {
      productId: 'sd-002',
      name: 'Divine Rose',
      slug: 'divine-rose-incense',
      image: 'https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80',
      category: 'Floral Notes',
      originalPrice: 349,
      clubbingPrice: 249,
      discountPercentage: 29,
    }
  ])

  // Fetch full inventory from API if available
  useEffect(() => {
    let active = true
    fetch('/api/products?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (active && Array.isArray(data) && data.length > 0) {
          setCatalogProducts(data)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

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
            setApplicableCategory(item.applicableCategory || 'all')
            setBannerImageDesktop(item.bannerImageDesktop || item.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
            setBannerImageMobile(item.bannerImageMobile || item.bannerImageDesktop || item.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
            if (Array.isArray(item.clubbingProducts) && item.clubbingProducts.length > 0) {
              setClubbingProducts(item.clubbingProducts)
            }
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

  // Handle local image file upload & convert to Base64 (NO image URLs)
  const handleFileUpload = (e, target) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result
      if (typeof result === 'string') {
        if (target === 'desktop') {
          setBannerImageDesktop(result)
          toast.success(`Desktop banner picture "${file.name}" uploaded successfully`)
          if (errors.bannerImageDesktop) setErrors(prev => ({ ...prev, bannerImageDesktop: null }))
        } else {
          setBannerImageMobile(result)
          toast.success(`Mobile banner picture "${file.name}" uploaded successfully`)
          if (errors.bannerImageMobile) setErrors(prev => ({ ...prev, bannerImageMobile: null }))
        }
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Add Product to this Clubbing
  const handleAddProduct = (product) => {
    const pId = String(product.id)
    if (clubbingProducts.some(p => String(p.productId || p.id) === pId)) {
      toast.error(`"${product.name}" is already in this clubbing list`)
      return
    }

    const origPrice = parseFloat(product.price) || 0
    const initialClubbingPrice = Math.round(origPrice > 50 ? origPrice * 0.8 : origPrice)
    const discountPct = origPrice > 0 ? Math.round(((origPrice - initialClubbingPrice) / origPrice) * 100) : 0

    const imgUrl = (Array.isArray(product.images) && product.images[0]?.src) 
      ? product.images[0].src 
      : (product.image || 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=400&q=80')

    const newEntry = {
      productId: pId,
      name: product.name,
      slug: product.slug || pId,
      image: imgUrl,
      category: Array.isArray(product.categories) 
        ? (typeof product.categories[0] === 'string' ? product.categories[0] : product.categories[0]?.name || 'Sacred Incense')
        : 'Sacred Incense',
      originalPrice: origPrice,
      clubbingPrice: initialClubbingPrice,
      discountPercentage: discountPct,
    }

    setClubbingProducts(prev => [...prev, newEntry])
    toast.success(`Added "${product.name}" to clubbing with 20% festive discount!`)
  }

  // Remove Product from Clubbing
  const handleRemoveProduct = (productId) => {
    setClubbingProducts(prev => prev.filter(p => String(p.productId || p.id) !== String(productId)))
  }

  // Update specific clubbing price for a product
  const handleUpdatePrice = (productId, newPriceRaw) => {
    const newPrice = parseFloat(newPriceRaw)
    setClubbingProducts(prev => prev.map(item => {
      if (String(item.productId || item.id) === String(productId)) {
        const orig = item.originalPrice || 0
        const validPrice = isNaN(newPrice) || newPrice < 0 ? 0 : newPrice
        const discountPct = orig > 0 && validPrice < orig ? Math.round(((orig - validPrice) / orig) * 100) : 0
        return {
          ...item,
          clubbingPrice: validPrice,
          discountPercentage: discountPct,
        }
      }
      return item
    }))
  }

  // Filter Catalog Products for the picker
  const filteredCatalog = catalogProducts.filter(p => {
    const matchesSearch = !productSearch || 
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    
    if (!matchesSearch) return false
    if (productCategoryFilter === 'all') return true

    const cats = Array.isArray(p.categories)
      ? p.categories.map(c => (typeof c === 'string' ? c.toLowerCase() : (c.slug || c.name || '').toLowerCase()))
      : []
    return cats.includes(productCategoryFilter.toLowerCase()) || cats.some(c => c && c.includes(productCategoryFilter.toLowerCase()))
  })

  const validate = () => {
    const newErrors = {}
    if (!name.trim()) newErrors.name = 'Campaign title is required'
    if (!tagline.trim()) newErrors.tagline = 'Badge / Tagline is required (e.g. Diwali Sale)'
    if (!bannerImageDesktop) newErrors.bannerImageDesktop = 'Please upload a picture for Desktop Banner'
    if (!bannerImageMobile) newErrors.bannerImageMobile = 'Please upload a picture for Mobile Banner'
    if (clubbingProducts.length === 0) {
      newErrors.clubbingProducts = 'Please select at least 1 product to feature in this clubbing'
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
        applicableCategory: applicableCategory === 'all' ? null : applicableCategory,
        bannerImageDesktop,
        bannerImageMobile,
        bannerImage: bannerImageDesktop,
        clubbingProducts,
        applicableProductIds: clubbingProducts.map(p => p.productId || p.id),
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto pb-16">
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
              Choose inventory products with custom discounts, and upload desktop &amp; mobile banners
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
        {/* Left 2 Cols: Campaign Details & Selected Products */}
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
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-stone-700">
                  Campaign Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Diwali Dhamaka Clubbing, Navratri Grand Offer"
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
                    placeholder="e.g. Diwali Sale, Festive Clubbing, Special Clubbing"
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
                    <p className="text-[11px] text-stone-400">Appears on banner pill &amp; navigation badge</p>
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

              {/* PRODUCT SELECTION SECTION (Right below Badge/Tagline & Category) */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-[#4D0013] uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#FF6B00]" />
                      Products Included Under This Clubbing <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-[11px] text-stone-500">
                      Choose items one by one from inventory and set their exact clubbing prices.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs border-[#D7A65B] text-[#4D0013] bg-[#FFF9EE] font-bold">
                    {clubbingProducts.length} Product{clubbingProducts.length !== 1 ? 's' : ''} Featured
                  </Badge>
                </div>

                {errors.clubbingProducts && (
                  <p className="text-xs text-rose-500 font-semibold">{errors.clubbingProducts}</p>
                )}

                {/* Product Search & Picker Bar */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <Input
                        placeholder="Search inventory by title or SKU..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-9 bg-white text-xs h-9"
                      />
                    </div>
                    <div>
                      <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                        <SelectTrigger className="bg-white text-xs h-9">
                          <SelectValue placeholder="Filter Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Results Mini-Picker Dropdown/List */}
                  {productSearch.trim().length > 0 && (
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-stone-200 bg-white divide-y divide-stone-100 shadow-sm">
                      {filteredCatalog.length === 0 ? (
                        <p className="p-3 text-xs text-stone-400 text-center">No matching products found in database</p>
                      ) : (
                        filteredCatalog.slice(0, 8).map((p) => {
                          const isAlreadyAdded = clubbingProducts.some(cp => String(cp.productId || cp.id) === String(p.id))
                          const pImg = (Array.isArray(p.images) && p.images[0]?.src) ? p.images[0].src : p.image
                          return (
                            <div key={p.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-md overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                                  {pImg && <img src={pImg} alt={p.name} className="w-full h-full object-cover" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-stone-900 truncate">{p.name}</p>
                                  <p className="text-[10px] text-stone-400">Inventory Price: ₹{p.price}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={isAlreadyAdded ? "secondary" : "outline"}
                                disabled={isAlreadyAdded}
                                onClick={() => handleAddProduct(p)}
                                className="h-7 text-xs px-2.5 shrink-0"
                              >
                                {isAlreadyAdded ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1 text-emerald-600" /> Added
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3 mr-1" /> Add
                                  </>
                                )}
                              </Button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Products Table / List with Custom Clubbing Price */}
                {clubbingProducts.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 space-y-2">
                    <Package className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="text-xs text-stone-600 font-semibold">No products selected for this clubbing yet</p>
                    <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                      Search above to pick products from your inventory and set their promotional clubbing prices.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
                      {clubbingProducts.map((item, idx) => {
                        const orig = item.originalPrice || 0
                        const club = item.clubbingPrice !== undefined ? item.clubbingPrice : orig
                        const discount = orig > 0 && club < orig ? Math.round(((orig - club) / orig) * 100) : 0

                        return (
                          <div key={item.productId || idx} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition">
                            {/* Product Info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs sm:text-sm text-stone-900 truncate">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-stone-400 uppercase font-mono">
                                    {item.category || 'Incense'}
                                  </span>
                                  <span className="text-[10px] text-stone-400">•</span>
                                  <span className="text-[11px] text-stone-500">
                                    Original: <span className="line-through">₹{orig}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Clubbing Price Input & Discount Display */}
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                              <div className="flex items-center gap-2">
                                <Label className="text-[11px] font-semibold text-stone-600 whitespace-nowrap">
                                  Clubbing Price:
                                </Label>
                                <div className="relative w-24">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">₹</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={club}
                                    onChange={(e) => handleUpdatePrice(item.productId || item.id, e.target.value)}
                                    className="pl-6 h-8 text-xs font-bold text-[#6B1024] bg-stone-50 border-stone-300"
                                  />
                                </div>
                              </div>

                              {/* Discount pill */}
                              <div className="w-20 text-center">
                                {discount > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300">
                                    {discount}% OFF
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] font-medium">
                                    Regular
                                  </span>
                                )}
                              </div>

                              {/* Remove Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveProduct(item.productId || item.id)}
                                className="h-8 w-8 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Description & Dates */}
              <div className="space-y-1.5 pt-3 border-t border-stone-100">
                <Label htmlFor="description" className="text-xs font-semibold text-stone-700">
                  Campaign Description
                </Label>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Explain the festive offerings and divine blessings for customers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startsAt" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" /> Start Date
                  </Label>
                  <Input
                    id="startsAt"
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="text-xs"
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
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Desktop & Mobile Banner Picture Upload (NO URLs) */}
        <div className="space-y-6">
          <Card className="border-stone-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D7A65B]" /> Promotional Banners
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Upload image files only for Desktop and Mobile banners (No URLs)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* SECTION 1: Desktop Banner Upload */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#6B1024]" />
                    Desktop Banner Picture <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-stone-400">Rec: 1600x600 px</span>
                </div>

                <input
                  ref={desktopFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'desktop')}
                />

                {bannerImageDesktop ? (
                  <div className="space-y-2">
                    <div className="relative aspect-[16/7] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 group shadow-xs">
                      <img
                        src={bannerImageDesktop}
                        alt="Desktop Banner"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => desktopFileInputRef.current?.click()}
                          className="h-7 text-xs bg-white text-stone-900 hover:bg-stone-100"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Replace Picture
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Desktop Picture Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => desktopFileInputRef.current?.click()}
                        className="text-[#6B1024] hover:underline font-semibold"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => desktopFileInputRef.current?.click()}
                    className="w-full border-dashed border-stone-300 hover:border-[#6B1024] hover:bg-stone-50 py-7 flex flex-col gap-1 items-center justify-center text-xs"
                  >
                    <Upload className="w-5 h-5 text-stone-500" />
                    <span className="font-semibold text-stone-700">Upload Desktop Banner Picture</span>
                    <span className="text-[10px] text-stone-400">PNG, JPG, or WEBP (Max 8MB)</span>
                  </Button>
                )}
                {errors.bannerImageDesktop && (
                  <p className="text-xs text-rose-500">{errors.bannerImageDesktop}</p>
                )}
              </div>

              {/* SECTION 2: Mobile Banner Upload */}
              <div className="space-y-2.5 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Mobile Banner Picture <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-stone-400">Rec: 800x800 or 600x800</span>
                </div>

                <input
                  ref={mobileFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'mobile')}
                />

                {bannerImageMobile ? (
                  <div className="space-y-2">
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 group shadow-xs">
                      <img
                        src={bannerImageMobile}
                        alt="Mobile Banner"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => mobileFileInputRef.current?.click()}
                          className="h-7 text-xs bg-white text-stone-900 hover:bg-stone-100"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Replace Picture
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mobile Picture Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => mobileFileInputRef.current?.click()}
                        className="text-[#6B1024] hover:underline font-semibold"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => mobileFileInputRef.current?.click()}
                    className="w-full border-dashed border-stone-300 hover:border-[#FF6B00] hover:bg-stone-50 py-7 flex flex-col gap-1 items-center justify-center text-xs"
                  >
                    <Upload className="w-5 h-5 text-stone-500" />
                    <span className="font-semibold text-stone-700">Upload Mobile Banner Picture</span>
                    <span className="text-[10px] text-stone-400">PNG, JPG, or WEBP (Max 8MB)</span>
                  </Button>
                )}
                {errors.bannerImageMobile && (
                  <p className="text-xs text-rose-500">{errors.bannerImageMobile}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Live Storefront Preview (Toggle Desktop / Mobile view) */}
          <Card className="border-stone-200 shadow-xs bg-stone-50/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
                  Live Customer Preview
                </CardTitle>
              </div>
              <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                    previewMode === 'desktop' ? 'bg-[#6B1024] text-white shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                    previewMode === 'mobile' ? 'bg-[#6B1024] text-white shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dynamic Live Banner Simulation */}
              <div className={`relative rounded-xl overflow-hidden border border-[#D7A65B]/40 shadow-sm bg-[#130306] text-white p-4 transition-all ${
                previewMode === 'mobile' ? 'aspect-[4/5] flex flex-col justify-end' : 'min-h-[160px]'
              }`}>
                {/* Background image preview */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={previewMode === 'desktop' ? bannerImageDesktop : bannerImageMobile}
                    alt="Preview"
                    className="w-full h-full object-cover opacity-45"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/90 to-transparent" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#D7A65B] text-[#4D0013] text-[10px] font-black uppercase tracking-wider">
                      {tagline || 'Diwali Sale'}
                    </span>
                    <span className="text-[10px] text-amber-200 font-medium">✦ Special Clubbing</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-white leading-tight">
                    {name || 'Diwali Dhamaka Clubbing'}
                  </h4>
                  <p className="text-[11px] text-stone-200 line-clamp-2">
                    {description || 'Handcrafted sacred collection with festive clubbing discounts.'}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="inline-block px-3 py-1 bg-white text-[#6B1024] rounded-md text-[10px] font-bold shadow-xs">
                      Shop Clubbing Products ({clubbingProducts.length}) →
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
                    <p className="text-[11px] text-stone-500">Allow customers to view &amp; shop this clubbing</p>
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
                    <p className="text-[11px] text-stone-500">Show promotional banner on homepage</p>
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
