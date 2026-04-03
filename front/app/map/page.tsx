'use client'

import dynamic from 'next/dynamic'

import { FeatureGate } from '@/components/feature-gate'

const MapClient = dynamic(() => import('./map-client-page'), {
   ssr: false,
   loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading map…</div>
   ),
})

export default function MapPage() {
   return (
      <FeatureGate feature="map">
         <MapClient />
      </FeatureGate>
   )
}
