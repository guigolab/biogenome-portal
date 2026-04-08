'use client'

import dynamic from 'next/dynamic'

import { FeatureGate } from '@/components/feature-gate'
import { useLocale } from '@/contexts/locale-context'

function MapLoadingFallback() {
   const { t } = useLocale()
   return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
         {t('map.loadingMap')}
      </div>
   )
}

const MapClient = dynamic(() => import('./map-client-page'), {
   ssr: false,
   loading: () => <MapLoadingFallback />,
})

export default function MapPage() {
   return (
      <FeatureGate feature="map">
         <MapClient />
      </FeatureGate>
   )
}
