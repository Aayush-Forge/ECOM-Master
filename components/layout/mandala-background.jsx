'use client'

import React from 'react'

// FloralMandala: Intricate organic hand-drawn style with curved petals and scrolls
const FloralMandala = ({ className }) => (
  <svg viewBox="0 0 600 600" className={className} fill="none" stroke="rgba(197, 155, 108, 0.82)" strokeWidth="1.4" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(300, 300)">
      {/* Structural layout rings */}
      <circle cx="0" cy="0" r="285" stroke="rgba(197, 155, 108, 0.3)" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="260" stroke="rgba(197, 155, 108, 0.25)" strokeDasharray="4,4" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="180" stroke="rgba(197, 155, 108, 0.3)" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="100" stroke="rgba(197, 155, 108, 0.25)" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="45" stroke="rgba(197, 155, 108, 0.4)" strokeWidth="1" />
      
      {/* 12-fold rotational symmetry */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 360) / 12
        return (
          <g key={`floral-sec-${i}`} transform={`rotate(${angle})`}>
            {/* Center lotus leaf */}
            <path d="M 0,0 C -15,-20 -20,-35 0,-50 C 20,-35 15,-20 0,0 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="1.5" />
            
            {/* Center leaf accents */}
            <path d="M 0,-25 Q -8,-35 -4,-45 Q 0,-48 4,-45 Q 8,-35 0,-25" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="1" />

            {/* Mid-layer stylized leaf with curved lobes */}
            <path d="M 0,-50 C -25,-60 -35,-85 0,-115 C 35,-85 25,-60 0,-50 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="1.5" />
            <path d="M 0,-70 Q -12,-80 0,-95 Q 12,-80 0,-70" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="1" />
            
            {/* Outer paisley / swirl flourish */}
            <path d="M 0,-115 C -45,-130 -65,-185 0,-235 C 65,-185 45,-130 0,-115 Z" stroke="rgba(197, 155, 108, 0.95)" strokeWidth="1.7" />
            
            {/* Elegant internal scrolls within outer paisley */}
            <path d="M 0,-130 C -25,-152 -30,-182 -10,-197 C 10,-212 20,-192 0,-172" stroke="rgba(197, 155, 108, 0.8)" strokeWidth="1.2" />
            <path d="M 0,-130 C 25,-152 30,-182 10,-197 C -10,-212 -20,-192 0,-172" stroke="rgba(197, 155, 108, 0.8)" strokeWidth="1.2" />

            {/* Arched divider frames */}
            <path d="M -22,-115 Q 0,-138 22,-115" stroke="rgba(197, 155, 108, 0.65)" strokeWidth="1" />
            <path d="M -42,-180 Q 0,-212 42,-180" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="1" />
            
            {/* Drop nodes */}
            <circle cx="0" cy="-248" r="4" fill="rgba(197, 155, 108, 0.9)" stroke="none" />
            <circle cx="-16" cy="-238" r="2.5" fill="rgba(197, 155, 108, 0.75)" stroke="none" />
            <circle cx="16" cy="-238" r="2.5" fill="rgba(197, 155, 108, 0.75)" stroke="none" />
          </g>
        )
      })}
    </g>
  </svg>
)

// BorderPattern: Renders the repeating circular crosshair & flower medallion grid
const BorderPattern = ({ className, id }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
        {/* Grid lines */}
        <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(197, 155, 108, 0.55)" strokeWidth="0.65" />
        <line x1="0" y1="0" x2="0" y2="40" stroke="rgba(197, 155, 108, 0.55)" strokeWidth="0.65" />
        <line x1="0" y1="20" x2="40" y2="20" stroke="rgba(197, 155, 108, 0.55)" strokeWidth="0.65" />
        <line x1="20" y1="0" x2="20" y2="40" stroke="rgba(197, 155, 108, 0.55)" strokeWidth="0.65" />

        {/* Row 1: Crosshair Circles */}
        {/* Circle 1 at (10, 10) */}
        <circle cx="10" cy="10" r="7.5" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <line x1="10" y1="1" x2="10" y2="19" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="0.6" />
        <line x1="1" y1="10" x2="19" y2="10" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="0.6" />

        {/* Circle 2 at (30, 10) */}
        <circle cx="30" cy="10" r="7.5" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <line x1="30" y1="1" x2="30" y2="19" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="0.6" />
        <line x1="21" y1="10" x2="39" y2="10" stroke="rgba(197, 155, 108, 0.7)" strokeWidth="0.6" />

        {/* Row 2: Flower Medallions */}
        {/* Flower 1 at (10, 30) */}
        <circle cx="10" cy="30" r="1.5" fill="rgba(197, 155, 108, 0.9)" />
        <path d="M 10,30 C 7,27 7,24 10,24 C 13,24 13,27 10,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <path d="M 10,30 C 7,33 7,36 10,36 C 13,36 13,33 10,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <path d="M 10,30 C 4,27 1,27 4,30 C 1,33 4,33 10,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <path d="M 10,30 C 16,27 19,27 16,30 C 19,33 16,33 10,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />

        {/* Flower 2 at (30, 30) */}
        <circle cx="30" cy="30" r="1.5" fill="rgba(197, 155, 108, 0.9)" />
        <path d="M 30,30 C 27,27 27,24 30,24 C 33,24 33,27 30,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <path d="M 30,30 C 27,33 27,36 30,36 C 33,36 33,33 30,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <path d="M 30,30 C 24,27 21,27 24,30 C 21,33 24,33 30,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
        <path d="M 30,30 C 36,27 39,27 36,30 C 39,33 36,33 30,30 Z" stroke="rgba(197, 155, 108, 0.9)" strokeWidth="0.85" fill="none" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
)

export default function MandalaBackground() {
  return (
    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-hidden z-0 bg-[#FFFDF9]/60">
      {/* Top Border Pattern Strip */}
      <BorderPattern className="absolute top-0 left-0 right-0 h-20" id="sacred-border-t" />

      {/* Bottom Border Pattern Strip */}
      <BorderPattern className="absolute bottom-0 left-0 right-0 h-20" id="sacred-border-b" />

      {/* Scrolling / Fading / Slow Rotating Mandalas distributed down the page */}
      
      {/* Mandala 1: Top Left (under Hero) */}
      <div className="absolute w-64 h-64 top-[200px] -left-28 md:w-[480px] md:h-[480px] md:top-[150px] md:-left-36">
        <FloralMandala className="w-full h-full animate-spin-slow" />
      </div>

      {/* Mandala 2: Top Right (behind features) */}
      <div className="absolute w-64 h-64 top-[1000px] -right-28 md:w-[480px] md:h-[480px] md:top-[900px] md:-right-36" style={{ animationDelay: '-3s' }}>
        <FloralMandala className="w-full h-full animate-spin-slow-reverse" />
      </div>

      {/* Mandala 3: Mid-Page Left (behind combos) */}
      <div className="absolute w-64 h-64 top-[1800px] -left-28 md:w-[500px] md:h-[500px] md:top-[1700px] md:-left-36" style={{ animationDelay: '-6s' }}>
        <FloralMandala className="w-full h-full animate-spin-slow" />
      </div>

      {/* Mandala 4: Mid-Page Right (behind story) */}
      <div className="absolute w-64 h-64 top-[2600px] -right-28 md:w-[500px] md:h-[500px] md:top-[2500px] md:-right-36" style={{ animationDelay: '-9s' }}>
        <FloralMandala className="w-full h-full animate-spin-slow-reverse" />
      </div>

      {/* Mandala 5: Lower Left (behind testimonials) */}
      <div className="absolute w-64 h-64 top-[3400px] -left-28 md:w-[480px] md:h-[480px] md:top-[3300px] md:-left-36" style={{ animationDelay: '-12s' }}>
        <FloralMandala className="w-full h-full animate-spin-slow" />
      </div>

      {/* Mandala 6: Bottom Right (above footer) */}
      <div className="absolute w-64 h-64 bottom-[350px] -right-28 md:w-[500px] md:h-[500px] md:bottom-[400px] md:-right-36" style={{ animationDelay: '-15s' }}>
        <FloralMandala className="w-full h-full animate-spin-slow-reverse" />
      </div>
    </div>
  )
}
