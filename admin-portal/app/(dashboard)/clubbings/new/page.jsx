'use client'

import ClubbingFormView from '@/components/clubbings/clubbing-form-view'

export default function NewClubbingPage() {
  return <ClubbingFormView basePath="/clubbings" isEdit={false} />
}
