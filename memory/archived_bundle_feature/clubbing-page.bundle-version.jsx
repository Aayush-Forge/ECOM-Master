'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { getActiveClubbings } from '@/lib/api/clubbings'
import { SEED_PRODUCTS } from '@/lib/products-seed'
import { useCart } from '@/lib/cart-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Sparkles,
  Tag,
  Gift,
  Flame,
  Check,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  Heart,
  Truck,
  Eye
} from 'lucide-react'

import { PRE_CURATED_FESTIVE_BUNDLES } from '@/lib/festive-bundles'

export default function ClubbingStorefrontPage() {
  const router = useRouter()
  const { addItem, openDrawer } = useCart()
  const [activeRules, setActiveRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)

  const loadCampaigns = async () => {
    try {
      const active = await getActiveClubbings()
      setActiveRules(active || [])
    } catch (err) {
      console.error('Failed to load active clubbings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()

    const handleUpdate = () => loadCampaigns()
    window.addEventListener('sd:clubbings-updated', handleUpdate)
    return () => window.removeEventListener('sd:clubbings-updated', handleUpdate)
  }, [])

  // Single-Click Add to Cart: Adds all pre-packaged bundle items into cart in one step
  const handleAddBundleToCart = (bundle) => {
    setAddingId(bundle.id)
    try {
      bundle.items.forEach((item) => {
        addItem({
          product_id: item.id,
          name: item.name,
          slug: item.slug || item.id,
          price: parseFloat(item.price) || 0,
          regular_price: parseFloat(item.regular_price || item.price) || 0,
          image: item.image || null,
          weight: 0.25,
          attrs: [],
        }, item.qty || 1)
      })

      toast.success(`✨ Festive Bundle "${bundle.title}" added to cart! Flat ₹${bundle.fixedPrice} applied.`)
      openDrawer()
    } finally {
      setTimeout(() => setAddingId(null), 400)
    }
  }

  // Single-Click Buy Now: Adds all bundle items and immediately routes to Checkout
  const handleBuyBundleNow = (bundle) => {
    bundle.items.forEach((item) => {
      addItem({
        product_id: item.id,
        name: item.name,
        slug: item.slug || item.id,
        price: parseFloat(item.price) || 0,
        regular_price: parseFloat(item.regular_price || item.price) || 0,
        image: item.image || null,
        weight: 0.25,
        attrs: [],
      }, item.qty || 1)
    })

    toast.success(`Proceeding to checkout with ${bundle.title}...`)
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#6B1024] font-inter">
      <Header />

      {/* Hero Banner Section */}
      <section className="relative bg-[#1A0308] text-white py-12 md:py-16 overflow-hidden border-b border-[#D7A65B]/40">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-radial-gradient from-[#4D0013]/60 via-[#1A0308] to-[#0A0103] opacity-90" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#D7A65B]/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="container max-w-6xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7A65B]/20 text-[#FFF3C1] border border-[#D7A65B]/40 text-xs font-semibold uppercase tracking-widest animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#D7A65B]" />
            Festive Curated Gift Sets • Flat Rate Bundles
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-wide leading-tight drop-shadow-md">
            Sacred Festive Packages &amp; Gift Boxes
          </h1>
          <p className="text-sm sm:text-base text-amber-50 font-normal max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Pre-packaged ceremonial bundle sets crafted for Diwali, Navratri, and sacred celebrations.
            Each luxury package includes complimentary temple brass items and instant bundle pricing.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-amber-100 font-semibold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#FF6B00]" /> 100% Temple-Grade Natural
            </span>
            <span className="text-[#D7A65B]">✦</span>
            <span className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#D7A65B]" /> Free Brass Puja Item Included
            </span>
            <span className="text-[#D7A65B]">✦</span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-300" /> Free Express Delivery Above ₹499
            </span>
          </div>
        </div>
      </section>

      {/* Main Campaign List Section: Pre-Curated Festive Bundles */}
      <main className="flex-1 py-10 md:py-14">
        <div className="container max-w-6xl mx-auto px-4 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-[#4D0013]">
              Pre-Curated Festive Packages
            </h2>
            <p className="text-sm sm:text-base text-stone-900 font-semibold leading-relaxed">
              No manual picking required. Add the complete ceremonial package with 1-click and enjoy automatic bundle savings.
            </p>
          </div>

          <div className="space-y-10">
            {PRE_CURATED_FESTIVE_BUNDLES.map((bundle) => {
              const totalItemsInBox = bundle.items.reduce((s, it) => s + (it.qty || 1), 0)

              return (
                <section
                  key={bundle.id}
                  id={bundle.id}
                  className="bg-white rounded-2xl border-2 border-[#D7A65B]/60 shadow-xl overflow-hidden transition-all duration-300 hover:border-[#D7A65B] hover:shadow-2xl"
                >
                  {/* Top Campaign Banner - Clickable Link to Products Page with this bundle */}
                  <div className="relative min-h-[175px] md:min-h-[200px] w-full overflow-hidden bg-[#1A0308] text-white">
                    <img
                      src={bundle.bannerImage}
                      alt={bundle.title}
                      className="absolute inset-0 w-full h-full object-cover object-center opacity-60 scale-100 transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2B040B] via-[#4D0013]/90 to-black/60" />

                    <div className="relative p-6 sm:p-8 md:p-10 flex flex-col justify-between h-full z-10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3.5 py-1 rounded-full bg-[#D7A65B] text-[#2D1515] text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 fill-current text-[#2D1515]" />
                            {bundle.campaignTag}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-[#FFF9EE] text-[#2D1515] text-xs font-black uppercase tracking-wide border-2 border-[#D7A65B] shadow-sm">
                            Flat ₹{bundle.fixedPrice} (All-Inclusive Box)
                          </span>
                        </div>

                        <Link
                          href={`/products?category=festive-bundles&bundle=${bundle.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/30 backdrop-blur-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#D7A65B]" />
                          <span>View on Products Page</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <Link
                        href={`/products?category=festive-bundles&bundle=${bundle.id}`}
                        className="group/title block max-w-2xl"
                      >
                        <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wide leading-tight drop-shadow-md group-hover/title:text-[#D7A65B] transition flex items-center gap-2">
                          <span>{bundle.title}</span>
                          <ArrowRight className="w-6 h-6 opacity-0 group-hover/title:opacity-100 transition -translate-x-2 group-hover/title:translate-x-0 text-[#D7A65B] shrink-0" />
                        </h3>
                        <p className="text-xs sm:text-sm text-amber-100 font-medium line-clamp-2 drop-shadow-sm leading-relaxed mt-1">
                          {bundle.description}
                        </p>
                      </Link>
                    </div>
                  </div>

                  {/* Pre-Curated Items Visual Breakdown - Rich, High-Contrast UI */}
                  <div className="p-6 sm:p-8 space-y-6 bg-white border-t-2 border-[#D7A65B]/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-stone-200 pb-4">
                      <div>
                        <h4 className="font-display font-black text-lg sm:text-xl text-[#4D0013] flex items-center gap-2.5">
                          <Package className="w-5 h-5 text-[#FF6B00]" />
                          Package Contents ({totalItemsInBox} Items + 1 Festive Gift Included)
                        </h4>
                        <p className="text-xs sm:text-sm text-stone-900 font-semibold font-inter mt-0.5">
                          Every item listed below is pre-packaged and delivered in a collector festive gift box.
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 bg-[#4D0013] text-[#FFD700] text-xs font-black px-4 py-1.5 rounded-full border-2 border-[#D7A65B] shadow-sm">
                        <Check className="w-4 h-4 text-[#FFD700] stroke-[3]" />
                        Pre-Calculated Bundle Discount
                      </div>
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {bundle.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#D7A65B]/60 bg-[#FFFDF9] hover:border-[#6B1024] hover:shadow-lg transition-all group/item relative shadow-xs"
                        >
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border-2 border-stone-200 shrink-0 shadow-inner">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute top-1 left-1 bg-[#4D0013] text-[#FFF3C1] text-[11px] font-black px-2 py-0.5 rounded shadow-md">
                              {item.qty}x
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-display font-black text-sm sm:text-base text-[#4D0013] group-hover/item:text-[#8B1E3F] transition truncate">
                              {item.name}
                            </p>
                            <span className="inline-flex items-center text-[11px] font-bold text-[#4D0013] bg-[#FFF6D2] border border-[#D7A65B] px-2 py-0.5 rounded-md mt-1 truncate max-w-full">
                              {item.category} • {item.weight}
                            </span>
                            <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-stone-200">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-base font-black text-[#6B1024]">
                                  ₹{item.price}
                                </span>
                                <span className="text-xs text-stone-500 line-through font-bold">
                                  ₹{item.regular_price}
                                </span>
                              </div>
                              <Link
                                href={`/products?category=festive-bundles&bundle=${bundle.id}`}
                                className="text-xs font-black text-white bg-[#4D0013] hover:bg-[#6B1024] px-2.5 py-1 rounded-md transition shadow-xs flex items-center gap-1 shrink-0"
                              >
                                <span>Details</span>
                                <span>➔</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Complimentary Free Gift Card */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-5 sm:p-6 rounded-2xl border-2 border-[#D7A65B] bg-[#FFF9EE] sm:col-span-2 md:col-span-3 shadow-md relative overflow-hidden">
                        <div className="w-14 h-14 rounded-2xl bg-[#6B1024] text-[#FFD700] flex items-center justify-center shrink-0 shadow-md border-2 border-[#D7A65B]">
                          <Gift className="w-7 h-7 text-[#FFD700]" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <span className="inline-block text-[11px] font-black uppercase px-3 py-0.5 rounded-full bg-[#6B1024] text-[#FFF3C1] tracking-wider mb-1 shadow-xs">
                            ✦ Festive Bonus Included
                          </span>
                          <p className="text-base sm:text-lg font-display font-black text-[#4D0013]">
                            {bundle.complimentaryGift}
                          </p>
                          <p className="text-xs sm:text-sm text-stone-900 font-semibold mt-0.5 leading-relaxed">
                            {bundle.complimentaryGiftDetails?.description || 'Authentic temple-grade brass item, reusable for all daily rituals.'}
                          </p>
                        </div>
                        <div className="bg-[#6B1024] text-[#FFD700] border-2 border-[#D7A65B] font-black text-xs px-4 py-2 rounded-xl uppercase tracking-wider shadow-md shrink-0 text-center">
                          <span className="block text-sm font-black text-[#FFD700]">100% FREE</span>
                          <span className="block text-[10px] text-white/90 font-bold">BONUS GIFT</span>
                        </div>
                      </div>
                    </div>

                    {/* Single-Click Instant Pricing & Checkout Bar */}
                    <div className="bg-gradient-to-r from-[#4D0013] via-[#6B1024] to-[#4D0013] text-white border-2 border-[#D7A65B] rounded-2xl p-6 sm:p-7 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl">
                      <div className="space-y-2 text-center xl:text-left">
                        <div className="flex flex-wrap items-center justify-center xl:justify-start gap-3">
                          <span className="text-xs text-[#FFE082] line-through font-bold">
                            MRP: ₹{bundle.mrp}
                          </span>
                          <span className="text-xs text-[#FFE082] line-through font-bold">
                            Regular: ₹{bundle.regularTotal}
                          </span>
                          <span className="text-2xl sm:text-3xl font-black font-display text-white">
                            Festive Price: <span className="text-[#FFD700] font-black drop-shadow-sm">Flat ₹{bundle.fixedPrice}</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 pt-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#4D0013] bg-[#FFD700] border border-[#FFE29A] px-3.5 py-1 rounded-md shadow-md">
                            <Sparkles className="w-3.5 h-3.5 fill-[#4D0013] text-[#4D0013]" />
                            Instant Savings: ₹{bundle.savings} OFF
                          </span>
                          <span className="text-xs text-amber-100 font-bold">
                            • Free Express Shipping &amp; Collector Gift Box Included
                          </span>
                        </div>
                      </div>

                      {/* Direct Single-Click Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        <Button
                          asChild
                          size="lg"
                          className="bg-white hover:bg-[#FFF9EE] text-[#4D0013] border-2 border-[#D7A65B] font-black px-5 py-3.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md w-full sm:w-auto transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <Link href={`/products?category=festive-bundles&bundle=${bundle.id}`}>
                            <Eye className="w-4 h-4 text-[#4D0013]" />
                            <span>View Bundle Products</span>
                          </Link>
                        </Button>

                        <Button
                          onClick={() => handleAddBundleToCart(bundle)}
                          disabled={addingId === bundle.id}
                          size="lg"
                          className="bg-[#D7A65B] hover:bg-[#c29145] text-[#4D0013] font-black px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl border-2 border-[#FFE29A] w-full sm:w-auto flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                          <span>{addingId === bundle.id ? 'Adding Pack...' : 'Add Festive Pack to Cart'}</span>
                        </Button>

                        <Button
                          onClick={() => handleBuyBundleNow(bundle)}
                          size="lg"
                          className="bg-[#4D0013] hover:bg-[#6B1024] text-[#FFD700] border-2 border-[#D7A65B] font-black px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl w-full sm:w-auto flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <CreditCard className="w-4 h-4 stroke-[2.5]" />
                          <span>Buy Package Now</span>
                        </Button>
                      </div>
                    </div>

                  </div>
                </section>
              )
            })}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
