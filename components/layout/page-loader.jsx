'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'

export default function PageLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [shouldRender, setShouldRender] = useState(true)
  const [logoSrc, setLogoSrc] = useState('/PL.svg')

  // Detect initial load completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoad(false)
    }, 1200) // Initial loading time
    return () => clearTimeout(timer)
  }, [])

  // Detect page changes
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
    }, 700) // Smooth transition duration
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  // Handle visibility transitions
  const isVisible = loading || initialLoad

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 500) // Match transition duration (duration-500)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FFF3C1]/20 backdrop-blur-2xl transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        @keyframes progress-slide {
          0% { left: -30%; width: 30%; }
          50% { width: 40%; }
          100% { left: 100%; width: 30%; }
        }
        .animate-progress-slide {
          position: absolute;
          height: 100%;
          animation: progress-slide 1.6s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin-mandala-slow 180s linear infinite;
        }
        @keyframes spin-mandala-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Slow rotating Mandala background */}
      <div className="absolute inset-0 bg-mandala opacity-5 animate-spin-slow pointer-events-none" />

      {/* Loader Content Container */}
      <div className="relative flex flex-col items-center text-center space-y-6 px-4">
        {/* Pulsing Outer Ring (Glossy Glass Orb) */}
        <div className="relative flex items-center justify-center w-28 h-28 rounded-full border border-white/50 bg-white/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(255,255,255,0.25)]">
          <div className="absolute inset-1 rounded-full border border-dashed border-white/40 animate-spin-slow" />
          
          {/* Logo Image */}
          <div className="relative w-20 h-20 transition-all duration-300">
            <Image
              src={logoSrc}
              alt="SRIDATTAM"
              fill
              className="object-contain animate-flicker"
              unoptimized
            />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="font-cormorant text-2xl md:text-3xl font-semibold tracking-[0.1em] text-[#6B1024]">
            Sankalp Is Loading...
          </h2>
          <p className="text-xs text-[#D7A65B] font-medium tracking-[0.25em] uppercase">
            Preparing Your Sacred Spaces
          </p>
        </div>

        {/* Premium Progress Bar */}
        <div className="w-40 h-[2px] bg-[#6B1024]/10 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 bg-[#D7A65B] w-1/3 rounded-full animate-progress-slide" />
        </div>
      </div>
    </div>
  )
}
