'use client'

import ClubbingFormView from '@/components/clubbings/clubbing-form-view'

export default function EditClubbingPage() {
  return <ClubbingFormView basePath="/clubbings" isEdit={true} />
}
