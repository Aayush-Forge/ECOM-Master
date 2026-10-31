'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ClubbingRulesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/clubbings')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-600 gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00]" />
      <span>Redirecting to Clubbing Module...</span>
    </div>
  )
}