import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

export const metadata = {
  title: 'Refund Policy | SRIDATTAM',
  description: 'Refund and Return Policy for SRIDATTAM. Learn about the conditions and process for returning a product and receiving a refund.',
}

export default function RefundPolicyPage() {
  return (
    <main className="bg-transparent min-h-screen text-[#6B1024] font-inter relative z-10">
      <Header />
      
      {/* HERO SECTION */}
      <section className="relative bg-transparent text-[#6B1024] py-16 overflow-hidden border-b border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="container relative text-center">
          <p className="text-[#D7A65B] text-xs font-semibold tracking-[0.3em] uppercase mb-2">Policies</p>
          <h1 className="font-cormorant text-3xl md:text-5xl mb-3 tracking-widest uppercase text-[#6B1024]">Cancellation &amp; Refund Policy</h1>
          <p className="max-w-2xl mx-auto text-[#6B1024]/80 italic font-cormorant text-sm md:text-base leading-relaxed">
            Learn about our cancellation timelines, return conditions, and refund process.
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="py-16 bg-transparent">
        <div className="container max-w-4xl px-4">
          <div className="bg-white border border-stone-200 rounded-none p-8 md:p-12 shadow-sm space-y-6 text-[#6B1024] leading-relaxed">
            <p className="text-stone-700 leading-relaxed font-light">
              At SRIDATTAM, we are committed to providing quality products and a transparent experience for our customers. Please read the following policy carefully before making a purchase.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">1. Cancellation Policy</h2>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 font-light">
              <li>Cancellation requests will be accepted only if made on the same day of placing the order.</li>
              <li>If the order has already been processed, packed, or shipped to the vendor/logistics partner, cancellation requests will not be entertained.</li>
              <li>Orders for perishable or custom-made items cannot be cancelled once confirmed.</li>
            </ul>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">2. Return, Replacement &amp; Refund Policy</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              We only accept return, replacement, or refund requests under the following conditions:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 font-light">
              <li>The product received is damaged, defective, or not as described/shown on our website.</li>
              <li>To be eligible for a claim, customers must record a clear unboxing video starting from the parcel being unopened to the full inspection of the product.</li>
              <li>Requests made without an unboxing video will not be accepted under any circumstances.</li>
              <li>All issues must be reported to our customer service on the same day of delivery.</li>
              <li>Once the claim is verified and approved by our internal team, we will initiate:
                <ul className="list-[circle] pl-6 mt-1 space-y-1">
                  <li>A replacement, if stock is available.</li>
                  <li>A refund, if the product is unavailable or based on customer preference.</li>
                </ul>
              </li>
            </ul>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">3. Products with Manufacturer Warranty</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              For items that come with a manufacturer&apos;s warranty, any issues must be directly raised with the respective manufacturer in accordance with their terms.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">4. Refund Timeline</h2>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 font-light">
              <li>Once a refund is approved by SRIDATTAM, the amount will be processed to your original payment method within 6–8 business days.</li>
              <li>Refunds will be initiated only after claim validation and product return (if applicable).</li>
            </ul>
            <p className="text-stone-700 leading-relaxed font-light mt-4">
              For any assistance or to raise a claim, please contact our Customer Support Team. We&apos;re here to ensure your experience with SRIDATTAM is reliable and satisfactory.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
