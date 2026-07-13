import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Phone, Mail, Clock, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Contact Us | SRIDATTAM — Premium Incense & Fragrance',
  description: 'Reach out to the SRIDATTAM customer support team for inquiries, order queries, or spiritual guidance regarding our premium incense.',
}

export default function ContactPage() {
  return (
    <main className="bg-transparent min-h-screen text-[#6B1024] font-inter relative z-10">
      <Header />

      {/* HERO SECTION */}
      <section className="relative bg-transparent text-[#6B1024] py-20 overflow-hidden border-b border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="container relative text-center">
          <p className="text-[#D7A65B] text-xs font-semibold tracking-[0.3em] uppercase mb-2">Connect With Us</p>
          <h1 className="font-cormorant text-4xl md:text-6xl mb-4 tracking-widest uppercase text-[#6B1024]">Contact Us</h1>
          <p className="max-w-2xl mx-auto text-[#6B1024]/80 italic font-cormorant text-base md:text-lg leading-relaxed">
            We are here to assist you on your spiritual and sensory journey.
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="py-20 bg-transparent">
        <div className="container max-w-5xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-stretch">
            
            {/* Contact Details Card */}
            <div className="bg-white border border-stone-200 p-8 md:p-12 shadow-sm flex flex-col justify-between space-y-8">
              <div>
                <h2 className="font-cormorant text-2xl md:text-3xl text-[#D7A65B] tracking-wider uppercase mb-6 font-semibold">
                  Get in Touch
                </h2>
                <p className="text-stone-600 font-light text-sm leading-relaxed mb-8">
                  Whether you have questions about our premium handcrafted incense blends, need assistance tracking your order, or would like to share feedback, our care team is always here to listen.
                </p>

                <div className="space-y-6">
                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#D7A65B]/30 flex items-center justify-center text-[#D7A65B] shrink-0 bg-stone-50">
                      <Phone className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold mb-0.5">Call / WhatsApp</p>
                      <a href="tel:+917975600729" className="text-base text-[#6B1024] hover:text-[#D7A65B] transition-colors font-medium">
                        +91 7975600729
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#D7A65B]/30 flex items-center justify-center text-[#D7A65B] shrink-0 bg-stone-50">
                      <Mail className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold mb-0.5">Email Support</p>
                      <a href="mailto:care@sridattam.in" className="text-base text-[#6B1024] hover:text-[#D7A65B] transition-colors font-medium">
                        care@sridattam.in
                      </a>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#D7A65B]/30 flex items-center justify-center text-[#D7A65B] shrink-0 bg-stone-50">
                      <Clock className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-widest font-semibold mb-0.5">Care Hours</p>
                      <p className="text-sm text-stone-700 font-light">
                        Monday – Saturday: 9:00 AM – 6:00 PM
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 flex items-center">
                <img src="/Mainlogo.svg" alt="SRIDATTAM" className="h-10 w-auto object-contain opacity-70" />
                <p className="text-xs text-stone-400 italic ml-4 font-cormorant">
                  "Sankalpa is the beginning of all transformation."
                </p>
              </div>
            </div>

            {/* Ritual Purity Message & Decorative Box */}
            <div className="relative border border-stone-200 bg-stone-50/50 p-8 md:p-12 shadow-sm flex flex-col justify-center text-center overflow-hidden">
              <div className="absolute inset-0 bg-mandala opacity-[0.03] pointer-events-none" />
              <div className="relative z-10 max-w-sm mx-auto space-y-6">
                <span className="text-[#D7A65B] text-3xl font-serif">❖</span>
                <h3 className="font-cormorant text-2xl text-[#6B1024] tracking-widest uppercase">Our Commitment</h3>
                <p className="text-stone-600 font-light text-sm leading-relaxed">
                  Every product that leaves our facility is handcrafted using natural wood-powder bases, pure herbs, and essential resins.
                </p>
                <p className="text-stone-600 font-light text-sm leading-relaxed">
                  We handle every item with ritual care to maintain absolute purity from our hands to your sacred home altar.
                </p>
                <div className="w-16 h-[1px] bg-[#D7A65B] mx-auto pt-1" />
                <div className="text-xs text-[#D7A65B] font-semibold tracking-widest uppercase pt-2">
                  100% Charcoal-Free
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
