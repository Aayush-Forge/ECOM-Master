'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

export default function WhatsAppButton() {
  const pathname = usePathname()
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/staff') ||
    pathname?.startsWith('/login')
  ) {
    return null
  }
  return (
    <a
      href="https://wa.me/917975600729"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group select-none"
      aria-label="Chat on WhatsApp"
    >
      {/* Tooltip */}
      <span className="absolute right-16 bg-white text-stone-800 text-[11px] font-bold tracking-wider uppercase px-3.5 py-2 rounded-md shadow-xl opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap border border-stone-150/60 z-20">
        WhatsApp Support
      </span>

      {/* Ripple Effect */}
      <span className="absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping opacity-75 group-hover:animate-none scale-105" />

      {/* SVG Icon - Official WhatsApp Logo */}
      <svg 
        viewBox="0 0 24 24" 
        className="w-14 h-14 relative z-10 drop-shadow-md" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path fill="#FFF" d="M12.004 2C6.5 2 2.002 6.5 2.002 12c0 1.9.5 3.7 1.5 5.3l-1.6 5.8 6-1.6c1.6.9 3.4 1.4 5.2 1.4 5.5 0 10-4.5 10-10S17.5 2 12.004 2z"/>
        <path fill="#25D366" d="M12.004 3.1c4.9 0 8.9 4 8.9 8.9S16.9 20.9 12 20.9c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3.5.9.9-3.4-.2-.3C3.4 15.2 2.9 13.6 2.9 12c0-5 4-9 9.1-9zm5.2 11.7c-.3-.1-1.7-.8-1.9-.9-.2-.1-.4-.2-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4 0-.2 0-.4-.1-.5-.1-.2-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3s-.9.9-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4-.1-.2-.3-.3-.6-.4z"/>
      </svg>
    </a>
  )
}
