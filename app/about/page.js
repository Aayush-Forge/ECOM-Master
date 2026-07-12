import Image from 'next/image'
import Link from 'next/link'
import { Flame, Leaf, Heart, ShieldCheck } from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'

function AboutPage() {
  return (
    <main className="bg-transparent min-h-screen text-[#6B1024] font-inter relative z-10">
      <Header />
      
      {/* SECTION 1 - HERO */}
      <section className="relative bg-transparent text-[#6B1024] py-24 overflow-hidden border-b border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=1600&q=80" 
            alt="" 
            fill 
            className="object-cover opacity-5 mix-blend-overlay" 
            unoptimized 
          />
        </div>
        <div className="container relative text-center">
          <p className="text-[#D7A65B] text-xs font-semibold tracking-[0.3em] uppercase mb-3">Pure Incense &amp; Fragrance</p>
          <h1 className="font-cormorant text-4xl md:text-6xl mb-4 tracking-widest uppercase">The Story of <span className="text-[#D7A65B]">SRIDATTAM</span></h1>
          <p className="max-w-2xl mx-auto text-[#6B1024]/80 italic font-cormorant text-lg md:text-xl leading-relaxed">Preserving the timeless tradition of Indian fragrance for the modern home.</p>
        </div>
      </section>

      {/* SECTION: SANKALPA QUOTE */}
      <section className="py-16 bg-stone-50/50 border-b border-stone-150 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-mandala opacity-[0.03] pointer-events-none" />
        <div className="container max-w-3xl relative">
          <span className="text-[#D7A65B] text-2xl font-serif block mb-2">❖</span>
          <blockquote className="font-cormorant text-2xl md:text-3xl text-[#6B1024] italic leading-relaxed tracking-wide">
            &ldquo;The world bends toward those who have already decided. Sankalpa is that decision.&rdquo;
          </blockquote>
          <div className="w-16 h-[1px] bg-[#D7A65B] mx-auto mt-6" />
        </div>
      </section>

      {/* SECTION 2 - MISSION */}
      <section className="py-20 bg-transparent">
        <div className="container max-w-4xl text-center">
          <p className="text-[#D7A65B] tracking-[0.25em] text-xs font-semibold uppercase">OUR MISSION &amp; PURPOSE</p>
          <h2 className="font-cormorant text-3xl md:text-5xl text-[#6B1024] mt-1 mb-6 tracking-widest uppercase font-light">Elevating Daily Life</h2>
          <p className="text-base md:text-lg leading-relaxed text-[#6B1024]/85 font-cormorant italic mb-6">
            We aim to bring daily ritual wellness and peace of mind to modern homes, providing premium fragrances and products that beautifully enrich your lifestyle.
          </p>
          <p className="text-sm md:text-base leading-relaxed text-stone-600 max-w-2xl mx-auto font-light">
            Every creation is a reflection of absolute purity: 100% charcoal-free, crafted from pure natural woods, sacred Sambrani resins, and herbal botanical ingredients. Proudly hand-blended and Made in India.
          </p>
        </div>
      </section>

      {/* SECTION 3 - WHAT WE CRAFT */}
      <section className="py-20 bg-transparent relative border-y border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="container relative grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-[#D7A65B] tracking-[0.25em] text-xs font-semibold uppercase">WHAT WE CRAFT</p>
            <h2 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] mt-1 mb-4 tracking-widest uppercase font-light">Pure Botanical Blends</h2>
            <p className="text-[#6B1024]/85 leading-relaxed text-sm">
              Our incense is a sacred fragrant blend. Each stick is a precise recipe of herbs, woods, and natural resins — carefully chosen to elevate your focus, bring peace, and purify your space.
            </p>
            <p className="text-[#6B1024]/85 leading-relaxed text-sm">
              When lit with intent, our incense becomes the medium through which tranquility fills your home, bringing calm and alignment to your daily routine.
            </p>
            <div className="pt-2">
              <img src="/Mainlogo.svg" alt="SRIDATTAM" className="h-10 w-auto object-contain" />
            </div>
          </div>
          <div className="relative aspect-square border border-stone-200 shadow-lg">
            <Image src="/traditional_incense_burning.png" alt="Premium incense burning setup" fill className="object-cover" unoptimized />
          </div>
        </div>
      </section>

      {/* SECTION 4 - PURITY PROMISE */}
      <section className="py-20 bg-transparent relative overflow-hidden border-b border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="container relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-[#D7A65B] tracking-[0.25em] text-xs font-semibold uppercase">OUR PURITY PROMISE</p>
            <h2 className="font-cormorant text-3xl md:text-5xl text-[#6B1024] tracking-widest uppercase font-light mt-1">Our Purity Promise</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { i: Leaf, text: 'Pure Wood Base', d: 'Made entirely from clean, natural wood-powder bases without toxic binders or coal dust.' },
              { i: Flame, text: 'Sacred Sambrani', d: 'Infused with authentic natural Sambrani resin (Loban) for air purification and positive energy.' },
              { i: ShieldCheck, text: '100% Charcoal-Free', d: 'Completely free from charcoal, guaranteeing zero toxic black soot and pure botanical smoke.' },
              { i: Heart, text: 'Proudly Made in India', d: 'Crafted using local sacred flora, herbs, and traditional Vedic processes by Indian artisans.' }
            ].map((it, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-none p-7 text-center shadow-sm">
                <div className="w-14 h-14 mx-auto rounded-full border border-[#D7A65B]/40 text-[#D7A65B] flex items-center justify-center mb-4 bg-stone-50">
                  <it.i className="w-7 h-7 stroke-[1.25]" />
                </div>
                <h3 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] tracking-widest uppercase mb-2 font-bold lining-nums">{it.text}</h3>
                <p className="text-xs text-[#6B1024]/80 leading-relaxed font-light">{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 - RITUAL BIBLE */}
      <section className="py-20 text-center bg-transparent">
        <div className="container max-w-2xl">
          <Heart className="w-8 h-8 text-[#D7A65B] mx-auto mb-4 stroke-[1.25]" />
          <h2 className="font-cormorant text-3xl md:text-4xl text-[#6B1024] tracking-widest uppercase font-light mb-3">Begin Your Sacred Journey</h2>
          <p className="text-sm text-[#6B1024]/80 leading-relaxed font-cormorant italic mb-6">Join thousands who trust SRIDATTAM for their daily rituals and home fragrance.</p>
          <Button asChild size="lg" className="bg-[#6B1024] hover:bg-[#4D0013] text-white px-10 py-6 rounded-none uppercase tracking-wider font-semibold border border-[#6B1024]">
            <Link href="/products">Shop Premium Incense</Link>
          </Button>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}

export default AboutPage
