import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

export const metadata = {
  title: 'Shipping Policy | SRIDATTAM',
  description: 'Shipping and Delivery Policy for SRIDATTAM. Learn about our delivery timelines, charges, and tracking methods.',
}

export default function ShippingPolicyPage() {
  return (
    <main className="bg-transparent min-h-screen text-[#6B1024] font-inter relative z-10">
      <Header />
      
      {/* HERO SECTION */}
      <section className="relative bg-transparent text-[#6B1024] py-16 overflow-hidden border-b border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="container relative text-center">
          <p className="text-[#D7A65B] text-xs font-semibold tracking-[0.3em] uppercase mb-2">Policies</p>
          <h1 className="font-cormorant text-3xl md:text-5xl mb-3 tracking-widest uppercase text-[#6B1024]">Shipping &amp; Delivery Policy</h1>
          <p className="max-w-2xl mx-auto text-[#6B1024]/80 italic font-cormorant text-sm md:text-base leading-relaxed">
            Understand our shipping timelines, flat rates, and delivery processes.
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="py-16 bg-transparent">
        <div className="container max-w-4xl px-4">
          <div className="bg-white border border-stone-200 rounded-none p-8 md:p-12 shadow-sm space-y-6 text-[#6B1024] leading-relaxed">
            <p className="text-stone-700 leading-relaxed font-light">
              We process and ship all orders with utmost care to maintain their sacred quality and ensure they reach you in a timely and secure manner.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">1. Dispatch Timelines</h2>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 font-light">
              <li>All standard orders are processed and dispatched within 24 to 48 hours of order confirmation.</li>
              <li>Orders placed on Sundays or public holidays will be processed on the next business day.</li>
            </ul>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">2. Delivery Timelines</h2>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 font-light">
              <li>We deliver to most locations across India.</li>
              <li>Estimated delivery times:
                <ul className="list-[circle] pl-6 mt-1 space-y-1">
                  <li><strong>Metro Cities:</strong> 3 to 5 business days after dispatch.</li>
                  <li><strong>Rest of India:</strong> 5 to 7 business days after dispatch.</li>
                </ul>
              </li>
              <li>Deliveries may occasionally be delayed due to unforeseen logistical issues or regional holidays.</li>
            </ul>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">3. Shipping Charges</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              Our shipping rates are calculated dynamically based on the total order value of the cart:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 font-light">
              <li><strong>Orders of ₹499 and above:</strong> Free Shipping.</li>
              <li><strong>Orders below ₹499:</strong> Standard flat rate of ₹49 per delivery.</li>
            </ul>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">4. Tracking Your Order</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              Once your package is dispatched, you will receive a tracking link via email or SMS. You can also track your order details directly through our portal using your Order ID on our Track Order page.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
