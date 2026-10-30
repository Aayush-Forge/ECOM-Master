'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App Router error captured:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-3xl font-display font-bold text-stone-900 mb-2">Something went wrong</h1>
      <p className="text-stone-600 font-inter text-sm max-w-md mb-6">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()} variant="outline" className="font-inter">
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
        <Button asChild className="bg-saffron hover:bg-saffron/90 text-white font-bold">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Store
          </Link>
        </Button>
      </div>
    </div>
  )
}
