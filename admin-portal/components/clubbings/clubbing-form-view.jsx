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

export default function ClubbingFormView({ initialData = null, isEdit = false, basePath = '/clubbings' }) {
  const router = useRouter()
  const params = useParams()
  const desktopFileInputRef = useRef(null)
  const mobileFileInputRef = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(isEdit && !initialData)
  const [errors, setErrors] = useState({})
  const [recordId, setRecordId] = useState(initialData?.id || (params?.id ? String(params.id) : null))

  // Available Inventory Products
  const [catalogProducts, setCatalogProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')

  // Form State
  const [name, setName] = useState(initialData?.name || '')
  const [tagline, setTagline] = useState(initialData?.tagline || 'Special Clubbing')
  const [description, setDescription] = useState(initialData?.description || '')
  const [applicableCategory, setApplicableCategory] = useState(initialData?.applicableCategory || 'all')
  const [startsAt, setStartsAt] = useState(initialData?.startsAt ? initialData.startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [endsAt, setEndsAt] = useState(initialData?.endsAt ? initialData.endsAt.slice(0, 10) : '')
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true)
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(initialData?.featuredOnHomepage !== undefined ? initialData.featuredOnHomepage : true)

  // Bundle Rules & Pricing
  const [ruleType, setRuleType] = useState(initialData?.type === 'percentage_off_bundle' ? 'percentage' : 'fixed_price')
  const [requiredQuantity, setRequiredQuantity] = useState(initialData?.requiredQuantity || 1)
  const [fixedPrice, setFixedPrice] = useState(initialData?.fixedPrice !== null && initialData?.fixedPrice !== undefined ? initialData.fixedPrice : 999)
  const [percentageOff, setPercentageOff] = useState(initialData?.percentageOff !== null && initialData?.percentageOff !== undefined ? initialData.percentageOff : 20)

  // Banners: Desktop & Mobile (Uploaded picture files only)
  const [bannerImageDesktop, setBannerImageDesktop] = useState(initialData?.bannerImageDesktop || initialData?.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
  const [bannerImageMobile, setBannerImageMobile] = useState(initialData?.bannerImageMobile || initialData?.bannerImageDesktop || initialData?.bannerImage || FESTIVE_BANNER_PRESETS[0].url)
  const [previewMode, setPreviewMode] = useState('desktop') // 'desktop' | 'mobile'

  // Selected Products with Custom Clubbing Prices
  const [clubbingProducts, setClubbingProducts] = useState(initialData?.clubbingProducts || [])

  // Load Inventory Products from backend
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('http://localhost:5000/products')
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : data.data || []
          if (list.length > 0) {
            setCatalogProducts(list.map(p => ({
              id: p.id,
              name: p.title || p.name,
              slug: p.slug,
              price: parseFloat(p.salePrice || p.basePrice || p.price || 299),
              originalPrice: parseFloat(p.compareAtPrice || p.basePrice || p.regular_price || 399),
              image: Array.isArray(p.images) && p.images[0] ? p.images[0] : (p.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'),
              category: p.category?.name || 'Sacred Incense'
            })))
            return
          }
        }
      } catch (err) {
        console.warn('Backend products not loaded:', err)
      }
    }
    fetchCatalog()
  }, [])

  // Load Initial Campaign if Editing
  useEffect(() => {
    if (!isEdit || initialData || !recordId) return

    const loadData = async () => {
      setLoadingInitial(true)
      try {
        const found = await getClubbingById(recordId)
        if (found) {
          setName(found.name || '')
          setTagline(found.tagline || 'Special Clubbing')
          setDescription(found.description || '')
          setApplicableCategory(found.applicableCategory || 'all')
          if (found.startsAt) setStartsAt(found.startsAt.slice(0, 10))
          if (found.endsAt) setEndsAt(found.endsAt.slice(0, 10))
          setIsActive(found.isActive !== undefined ? found.isActive : true)
          setFeaturedOnHomepage(found.featuredOnHomepage !== undefined ? found.featuredOnHomepage : true)

          setRuleType(found.type === 'percentage_off_bundle' ? 'percentage' : 'fixed_price')
          if (found.requiredQuantity) setRequiredQuantity(found.requiredQuantity)
          if (found.fixedPrice !== null && found.fixedPrice !== undefined) setFixedPrice(found.fixedPrice)
          if (found.percentageOff !== null && found.percentageOff !== undefined) setPercentageOff(found.percentageOff)

          if (found.bannerImageDesktop) setBannerImageDesktop(found.bannerImageDesktop)
          if (found.bannerImageMobile) setBannerImageMobile(found.bannerImageMobile)
          if (Array.isArray(found.clubbingProducts)) setClubbingProducts(found.clubbingProducts)
        } else {
          toast.error('Campaign not found')
        }
      } catch (err) {
        console.error('Failed to load campaign:', err)
        toast.error('Failed to load campaign details')
      } finally {
        setLoadingInitial(false)
      }
    }
    loadData()
  }, [isEdit, initialData, recordId])

  // Handle Desktop Banner File Upload
  const handleDesktopFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, or WEBP)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image exceeds 8MB limit')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        setBannerImageDesktop(dataUrl)
        // If mobile banner is not customized yet, mirror it
        if (!bannerImageMobile || bannerImageMobile === FESTIVE_BANNER_PRESETS[0].url) {
          setBannerImageMobile(dataUrl)
        }
        toast.success('Desktop banner picture uploaded!')
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Mobile Banner File Upload
  const handleMobileFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, or WEBP)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image exceeds 8MB limit')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        setBannerImageMobile(dataUrl)
        toast.success('Mobile banner picture uploaded!')
      }
    }
    reader.readAsDataURL(file)
  }

  // Add Product to Clubbing Collection
  const handleAddProductToClubbing = (product) => {
    const exists = clubbingProducts.some(p => p.productId === product.id || p.id === product.id)
    if (exists) {
      toast.info(`"${product.name}" is already in this clubbing section`)
      return
    }

    const defaultDealPrice = Math.round(product.price * 0.8) // Default 20% discount
    const newEntry = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      category: product.category,
      originalPrice: product.originalPrice || product.price,
      clubbingPrice: defaultDealPrice,
      discountPercentage: Math.round(((product.price - defaultDealPrice) / product.price) * 100)
    }

    setClubbingProducts(prev => [...prev, newEntry])
    toast.success(`Added "${product.name}" to clubbing!`)
  }

  // Update Clubbing Deal Price
  const handleUpdateDealPrice = (productId, newPrice) => {
    const numPrice = parseFloat(newPrice) || 0
    setClubbingProducts(prev => prev.map(item => {
      if (item.productId === productId || item.id === productId) {
        const orig = item.originalPrice || item.price || numPrice
        const discount = orig > numPrice ? Math.round(((orig - numPrice) / orig) * 100) : 0
        return {
          ...item,
          clubbingPrice: numPrice,
          discountPercentage: discount
        }
      }
      return item
    }))
  }

  // Remove Product from Clubbing Collection
  const handleRemoveClubbingProduct = (productId) => {
    setClubbingProducts(prev => prev.filter(p => p.productId !== productId && p.id !== productId))
  }

  // Validation
  const validate = () => {
    const newErrors = {}
    if (!name.trim()) newErrors.name = 'Campaign title is required'
    if (!tagline.trim()) newErrors.tagline = 'Badge / tagline is required'
    if (!bannerImageDesktop) newErrors.bannerImageDesktop = 'Please upload a desktop banner picture'
    if (!bannerImageMobile) newErrors.bannerImageMobile = 'Please upload a mobile banner picture'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        eventName: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        type: ruleType === 'percentage' ? 'percentage_off_bundle' : 'fixed_price_bundle',
        requiredQuantity: Number(requiredQuantity) || 1,
        fixedPrice: ruleType === 'fixed_price' ? Number(fixedPrice) : null,
        percentageOff: ruleType === 'percentage' ? Number(percentageOff) : null,
        applicableCategory: applicableCategory || 'all',
        applicableProductIds: clubbingProducts.map(p => p.productId || p.id).filter(Boolean),
        clubbingProducts: clubbingProducts,
        bannerImageDesktop,
        bannerImageMobile,
        bannerImage: bannerImageDesktop,
        startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive,
        featuredOnHomepage,
      }

      if (isEdit && recordId) {
        await updateClubbing(recordId, payload)
        toast.success(`Clubbing campaign "${name}" updated successfully!`)
      } else {
        await createClubbing(payload)
        toast.success(`Clubbing campaign "${name}" published successfully!`)
      }

      router.push(basePath)
    } catch (err) {
      console.error('Failed to save clubbing:', err)
      toast.error(err?.message || 'Failed to save clubbing campaign')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter Catalog Products
  const filteredCatalog = catalogProducts.filter(p => {
    const matchesSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = productCategoryFilter === 'all' || p.category?.toLowerCase().includes(productCategoryFilter.toLowerCase())
    return matchesSearch && matchesCategory
  })

  if (loadingInitial) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-stone-200 rounded-lg" />
        <Skeleton className="h-[600px] w-full bg-stone-100 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-stone-200">
            <Link href={basePath}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 font-display">
              {isEdit ? 'Edit Clubbing Section' : 'Add New Clubbing Section'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure festive details, upload device banners, and choose featured products
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-stone-200">
            <Link href={basePath}>Cancel</Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold shadow-xs"
          >
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Campaign'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Campaign Details, Pricing, & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Campaign Details */}
          <Card className="bg-white border-stone-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF6B00]" /> Campaign Details
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                General branding and customer-facing festival information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-stone-700">
                  Campaign Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diwali Dhamaka Clubbing, Navratri Grand Bundle"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tagline" className="text-xs font-semibold text-stone-700">
                    Badge / Tagline <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Special Clubbing, Festive Sale"
                    className={errors.tagline ? 'border-red-500' : ''}
                  />
                  {errors.tagline && <p className="text-xs text-red-500">{errors.tagline}</p>}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the bundle savings and festival blessings for customers..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startsAt" className="text-xs font-semibold text-stone-700">
                    Campaign Start Date
                  </Label>
                  <Input
                    id="startsAt"
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endsAt" className="text-xs font-semibold text-stone-700">
                    Campaign End Date (Optional)
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

          {/* Card 2: Bundle Rules & Pricing */}
          <Card className="bg-white border-stone-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF6B00]" /> Bundle Rules & Pricing
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Define the trigger quantity and bundle calculation model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRuleType('fixed_price')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between ${
                    ruleType === 'fixed_price'
                      ? 'border-[#FF6B00] bg-orange-50/50 text-[#FF6B00]'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5" /> Fixed Price Bundle
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Customer gets a set bundle for a single flat price (e.g. "Any 3 for ₹999")
                    </p>
                  </div>
                  {ruleType === 'fixed_price' && <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRuleType('percentage')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between ${
                    ruleType === 'percentage'
                      ? 'border-[#FF6B00] bg-orange-50/50 text-[#FF6B00]'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> % Percentage Discount
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Customer receives percentage savings when purchasing target quantity (e.g. "Buy 3, Get 20% Off")
                    </p>
                  </div>
                  {ruleType === 'percentage' && <CheckCircle2 className="w-4 h-4 text-[#FF6B00] shrink-0" />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="requiredQuantity" className="text-xs font-semibold text-stone-700">
                    Required Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requiredQuantity"
                    type="number"
                    min="1"
                    value={requiredQuantity}
                    onChange={(e) => setRequiredQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bundleValue" className="text-xs font-semibold text-stone-700">
                    {ruleType === 'fixed_price' ? 'Bundle Flat Price (₹)' : 'Discount Percentage (%)'}{' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bundleValue"
                    type="number"
                    min="1"
                    value={ruleType === 'fixed_price' ? fixedPrice : percentageOff}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      if (ruleType === 'fixed_price') setFixedPrice(val)
                      else setPercentageOff(val)
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Product Selection Section */}
          <Card className="bg-white border-stone-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FF6B00]" /> Featured Products Selection
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500">
                    Choose products from your database to feature under this specific clubbing section
                  </CardDescription>
                </div>
                <Badge className="bg-[#FF6B00]/10 text-[#FF6B00] border-none self-start sm:self-auto font-semibold">
                  {clubbingProducts.length} Selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Search catalog products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 bg-stone-50/50"
                  />
                </div>
                <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sandalwood">Sandalwood</SelectItem>
                    <SelectItem value="floral">Floral</SelectItem>
                    <SelectItem value="resins">Resins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Pick Shelf from Catalog */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-600">Available In Catalog (Click to add):</Label>
                <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-2 space-y-1 bg-stone-50/30">
                  {filteredCatalog.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4">No matching products found</p>
                  ) : (
                    filteredCatalog.map(prod => {
                      const isAdded = clubbingProducts.some(p => p.productId === prod.id || p.id === prod.id)
                      return (
                        <div
                          key={prod.id}
                          onClick={() => !isAdded && handleAddProductToClubbing(prod)}
                          className={`p-2 rounded-lg flex items-center justify-between transition text-xs ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-800 opacity-60 cursor-default'
                              : 'bg-white hover:bg-orange-50/70 border border-stone-150 cursor-pointer text-stone-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={prod.image} alt={prod.name} className="w-8 h-8 rounded object-cover border border-stone-200 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold truncate">{prod.name}</p>
                              <p className="text-[10px] text-stone-400">{prod.category} • ₹{prod.price}</p>
                            </div>
                          </div>
                          {isAdded ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-none">Added</Badge>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[#FF6B00] hover:text-[#e05e00] hover:bg-orange-100/50">
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add
                            </Button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Selected Products in this Clubbing Module */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <Label className="text-xs font-semibold text-stone-700">
                  Products in this Clubbing Module ({clubbingProducts.length}):
                </Label>
                {clubbingProducts.length === 0 ? (
                  <div className="text-center py-6 bg-stone-50 border border-dashed border-stone-200 rounded-lg">
                    <p className="text-xs text-stone-500">No products added yet. Click items above to add them to this clubbing.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clubbingProducts.map((item, idx) => {
                      const pId = item.productId || item.id
                      const orig = item.originalPrice || item.price || 399
                      const club = item.clubbingPrice || item.price || 299
                      const disc = orig > club ? Math.round(((orig - club) / orig) * 100) : 0

                      return (
                        <div
                          key={pId || idx}
                          className="p-3 bg-white border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-stone-900 truncate">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-stone-400 line-through">₹{orig}</span>
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] py-0">
                                  {disc}% OFF
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[11px] text-stone-500 font-semibold whitespace-nowrap">Clubbing Price:</Label>
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1.5 text-xs text-stone-400">₹</span>
                                <Input
                                  type="number"
                                  min="1"
                                  value={club}
                                  onChange={(e) => handleUpdateDealPrice(pId, e.target.value)}
                                  className="h-8 pl-5 pr-1 text-xs font-bold text-[#6B1024]"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveClubbingProduct(pId)}
                              className="h-8 w-8 p-0 text-stone-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Banner Images & Live Preview */}
        <div className="space-y-6">
          {/* Card 4: Banner Image Upload Section */}
          <Card className="bg-white border-stone-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#FF6B00]" /> Banner Image
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Upload custom festive art for desktop and mobile versions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 1. Desktop Banner Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-stone-500" /> Desktop Banner Picture
                  </Label>
                  <span className="text-[10px] text-stone-400">16:9 / 1920×800</span>
                </div>

                <input
                  type="file"
                  ref={desktopFileInputRef}
                  onChange={handleDesktopFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div
                  onClick={() => desktopFileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-200 hover:border-[#FF6B00] rounded-xl p-3 bg-stone-50/50 hover:bg-orange-50/30 transition text-center cursor-pointer group"
                >
                  {bannerImageDesktop ? (
                    <div className="space-y-2">
                      <div className="aspect-16/7 w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100 relative">
                        <img src={bannerImageDesktop} alt="Desktop Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] font-semibold text-[#FF6B00] group-hover:underline">
                        Change Desktop Picture
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-1.5">
                      <Upload className="w-6 h-6 text-stone-400 mx-auto group-hover:text-[#FF6B00] transition" />
                      <p className="text-xs font-bold text-stone-700">Upload Desktop Banner Picture</p>
                      <p className="text-[10px] text-stone-400">PNG, JPG, or WEBP up to 8MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Mobile Banner Upload */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-stone-500" /> Mobile Banner Picture
                  </Label>
                  <span className="text-[10px] text-stone-400">4:5 / 800×1000</span>
                </div>

                <input
                  type="file"
                  ref={mobileFileInputRef}
                  onChange={handleMobileFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div
                  onClick={() => mobileFileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-200 hover:border-[#FF6B00] rounded-xl p-3 bg-stone-50/50 hover:bg-orange-50/30 transition text-center cursor-pointer group"
                >
                  {bannerImageMobile ? (
                    <div className="space-y-2">
                      <div className="aspect-4/3 w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100 relative">
                        <img src={bannerImageMobile} alt="Mobile Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] font-semibold text-[#FF6B00] group-hover:underline">
                        Change Mobile Picture
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-1.5">
                      <Upload className="w-6 h-6 text-stone-400 mx-auto group-hover:text-[#FF6B00] transition" />
                      <p className="text-xs font-bold text-stone-700">Upload Mobile Banner Picture</p>
                      <p className="text-[10px] text-stone-400">PNG, JPG, or WEBP up to 8MB</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: LIVE CUSTOMER BANNER PREVIEW */}
          <Card className="bg-white border-stone-200 shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  LIVE CUSTOMER BANNER PREVIEW
                </CardTitle>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                      previewMode === 'desktop' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                      previewMode === 'mobile' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    Mobile
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`relative rounded-xl overflow-hidden border border-stone-300 shadow-md ${
                  previewMode === 'desktop' ? 'aspect-16/8' : 'aspect-4/4'
                }`}
              >
                {/* Background Image */}
                <img
                  src={previewMode === 'desktop' ? (bannerImageDesktop || FESTIVE_BANNER_PRESETS[0].url) : (bannerImageMobile || bannerImageDesktop || FESTIVE_BANNER_PRESETS[0].url)}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end text-white">
                  <div className="space-y-1.5 max-w-[85%]">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#FF6B00] text-white text-[9px] font-bold tracking-wider uppercase">
                      {tagline || 'SPECIAL CLUBBING'}
                    </span>
                    <h3 className="font-display font-bold text-sm sm:text-base leading-tight drop-shadow-sm">
                      {name || 'Diwali Dhamaka Clubbing'}
                    </h3>
                    <p className="text-[10px] text-stone-200 line-clamp-2">
                      {description || (ruleType === 'fixed_price' ? `Select any ${requiredQuantity} items and pay flat ₹${fixedPrice}!` : `Buy ${requiredQuantity} items and get ${percentageOff}% OFF!`)}
                    </p>
                    <div className="pt-1">
                      <span className="inline-flex items-center text-[10px] font-bold bg-white text-stone-900 px-2.5 py-1 rounded shadow-xs">
                        Shop Clubbing Deals →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Campaign Active Switch */}
          <Card className="bg-white border-stone-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="activeSwitch" className="text-xs font-bold text-stone-900 cursor-pointer">
                    Campaign Active
                  </Label>
                  <p className="text-[11px] text-stone-500">
                    Allow customers to claim this bundle on storefront
                  </p>
                </div>
                <Switch
                  id="activeSwitch"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  <Label htmlFor="featuredSwitch" className="text-xs font-bold text-stone-900 cursor-pointer">
                    Homepage Hero Banner
                  </Label>
                  <p className="text-[11px] text-stone-500">
                    Showcase this campaign in the hero slider
                  </p>
                </div>
                <Switch
                  id="featuredSwitch"
                  checked={featuredOnHomepage}
                  onCheckedChange={setFeaturedOnHomepage}
                  className="data-[state=checked]:bg-[#FF6B00]"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-2"
                >
                  {submitting ? 'Saving...' : isEdit ? 'Update Campaign' : 'Publish Campaign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
