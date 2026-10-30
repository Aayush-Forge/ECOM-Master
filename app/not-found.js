'use client'

import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-amber-700" />
      </div>
      <h1 className="text-3xl font-display font-bold text-stone-900 mb-2">Page Not Found</h1>
      <p className="text-stone-600 font-inter text-sm max-w-md mb-6">
        The page you are looking for might have been moved, deleted, or does not exist.
      </p>
      <Button asChild className="bg-saffron hover:bg-saffron/90 text-white font-bold">
        <Link href="/">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Store
        </Link>
      </Button>
    </div>
  )
}
