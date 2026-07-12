import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

export const metadata = {
  title: 'Privacy Policy | SRIDATTAM',
  description: 'Privacy Policy for SRIDATTAM. Understand how we collect, use, and protect your personal information when you visit our website or purchase our products.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-transparent min-h-screen text-[#6B1024] font-inter relative z-10">
      <Header />
      
      {/* HERO SECTION */}
      <section className="relative bg-transparent text-[#6B1024] py-16 overflow-hidden border-b border-stone-150">
        <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
        <div className="container relative text-center">
          <p className="text-[#D7A65B] text-xs font-semibold tracking-[0.3em] uppercase mb-2">Policies</p>
          <h1 className="font-cormorant text-3xl md:text-5xl mb-3 tracking-widest uppercase text-[#6B1024]">Privacy Policy</h1>
          <p className="max-w-2xl mx-auto text-[#6B1024]/80 italic font-cormorant text-sm md:text-base leading-relaxed">
            Understand how we collect, use, and protect your personal information when you visit our website or purchase our products.
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="py-16 bg-transparent">
        <div className="container max-w-4xl px-4">
          <div className="bg-white border border-stone-200 rounded-none p-8 md:p-12 shadow-sm space-y-6 text-[#6B1024] leading-relaxed">
            <p className="text-stone-700 leading-relaxed font-light">
              This Privacy Policy outlines how SRIDATTAM (“we”, “us”, or “our”) collects, uses, and protects the personal information you provide when you visit or make a purchase through our website.
            </p>
            <p className="text-stone-700 leading-relaxed font-light">
              We are committed to safeguarding your privacy and ensuring the security of your personal information. This document describes what data we collect, why we collect it, how we use it, and the rights you have in relation to your data.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">1. Contact Information</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              If you have any questions, concerns, or requests regarding this Privacy Policy, you may reach us at:<br />
              <strong>Email:</strong> support.sridattam@gmail.com<br />
              <strong>Phone:</strong> +91 7975600729
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">2. Information We Collect</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              We only collect data that is necessary to fulfill your order, provide customer support, and improve our services.
            </p>
            
            <div className="pl-4 border-l-2 border-stone-200 space-y-4 my-4">
              <h3 className="font-semibold text-[#6B1024] text-base">a. Order Information</h3>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Purpose:</strong> To process your purchase, arrange shipping, issue invoices and confirmations, and resolve related concerns.
              </p>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Data Collected:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1 text-stone-700 font-light">
                <li>Full name</li>
                <li>Shipping address</li>
                <li>Billing address</li>
                <li>Phone number</li>
                <li>Email address</li>
                <li>Payment-related details (only securely processed through trusted third-party payment gateways; we do not store card information)</li>
              </ul>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Source:</strong> Provided directly by the customer during checkout.
              </p>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Disclosure:</strong> Shared only with delivery partners and payment processors to fulfill your order.
              </p>
            </div>

            <div className="pl-4 border-l-2 border-stone-200 space-y-4 my-4">
              <h3 className="font-semibold text-[#6B1024] text-base">b. Customer Support</h3>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Purpose:</strong> To respond to queries, handle returns, or resolve issues.
              </p>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Data Collected:</strong> Name, contact details, and order-related information.
              </p>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Source:</strong> Provided voluntarily when you contact our support team.
              </p>
              <p className="text-stone-700 leading-relaxed font-light">
                <strong>Disclosure:</strong> Not shared with any third party without your explicit consent.
              </p>
            </div>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">3. Cookies &amp; Tracking Technologies</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              We do not use cookies, tracking pixels, or third-party analytics tools. Your interactions on our site remain private and are not monitored for advertising or profiling purposes.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">4. Third-Party Services</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              We work with third-party logistics and payment gateways for secure transactions. These third parties are only provided with the information necessary to complete their specific functions and are bound by confidentiality.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">5. Data Security</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              We implement appropriate physical, technical, and administrative measures to safeguard the information you provide. All payment-related transactions are encrypted and handled through certified third-party gateways.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">6. Your Rights</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-stone-700 font-light">
              <li>Request access to the data we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal data (where applicable by law)</li>
            </ul>
            <p className="text-stone-700 leading-relaxed font-light">
              To exercise these rights, contact us at support.sridattam@gmail.com.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">7. Policy Updates</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              We may update this Privacy Policy from time to time to reflect changes in our practices, services, or legal obligations.
            </p>

            <h2 className="font-cormorant text-xl md:text-2xl text-[#D7A65B] border-b border-stone-200 pb-2 mt-8 mb-4 font-semibold tracking-wider uppercase">8. Contact Us</h2>
            <p className="text-stone-700 leading-relaxed font-light">
              If you have any questions about this Privacy Policy, please contact us at:<br />
              Email: support.sridattam@gmail.com<br />
              Phone: +91 7975600729
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
