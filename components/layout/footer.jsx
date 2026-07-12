import Link from 'next/link'
import { Mail, Instagram, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white text-[#6B1024] border-t border-stone-200 mt-20 relative overflow-hidden">
      <div className="container py-14 relative">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="mb-3 inline-block">
              <img
                src="/Mainlogo.svg"
                alt="SRIDATTAM"
                className="h-16 md:h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-[#D7A65B] text-xs font-semibold uppercase tracking-[0.25em] mb-2 mt-1">SANKALPA</p>
            <p className="text-xs text-[#6B1024]/75 font-light italic leading-relaxed max-w-xs">
              &ldquo;The world bends toward those who have already decided. Sankalpa is that decision.&rdquo;
            </p>
          </div>
          <div>
            <h4 className="font-display text-[#D7A65B] font-semibold mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-[#6B1024]/80 font-light">
              <li><Link href="/products" className="hover:text-[#D7A65B]">All Products</Link></li>
              <li><Link href="/about" className="hover:text-[#D7A65B]">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-[#D7A65B] font-semibold mb-3">Help</h4>
            <ul className="space-y-2 text-sm text-[#6B1024]/80 font-light">
              <li><Link href="/shipping-policy" className="hover:text-[#D7A65B]">Shipping Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-[#D7A65B]">Refund Policy</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-[#D7A65B]">Privacy Policy</Link></li>
              <li><Link href="/terms-conditions" className="hover:text-[#D7A65B]">Terms &amp; Conditions</Link></li>
              <li><Link href="#" className="hover:text-[#D7A65B]">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-[#D7A65B] font-semibold mb-3">Connect</h4>
            <p className="text-sm text-[#6B1024]/80 font-light">Subscribe for ritual guides and product launches.</p>
            <div className="flex gap-3 mt-4">
              <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-stone-100 hover:bg-[#6B1024] hover:text-[#F7E9D1] transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-stone-100 hover:bg-[#6B1024] hover:text-[#F7E9D1] transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="mailto:contact@sridattam.com" aria-label="Email" className="p-2 rounded-full bg-stone-100 hover:bg-[#6B1024] hover:text-[#F7E9D1] transition-colors"><Mail className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-stone-200 text-center text-xs text-[#6B1024]/60">
          © {new Date().getFullYear()} SRIDATTAM. Where Sacred Tradition Meets Modern Commerce.
        </div>
      </div>
    </footer>
  )
}
