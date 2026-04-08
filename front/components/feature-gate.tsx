'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

import { usePortalConfig } from '@/contexts/portal-context'
import { showGoatStatusPage, showMap } from '@/lib/portal'

type GateFeature = 'progress' | 'map' | 'goatStatus'

export function FeatureGate({ feature, children }: { feature: GateFeature; children: ReactNode }) {
   const { config, loading } = usePortalConfig()
   const router = useRouter()

   useEffect(() => {
      if (loading || !config) return
      if (feature === 'goatStatus' && !showGoatStatusPage(config)) {
         router.replace('/')
      }
      if (feature === 'map' && !showMap(config)) {
         router.replace('/')
      }
   }, [config, loading, feature, router])

   if (loading || !config) {
      return (
         <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-[40vh] flex-1 items-center justify-center text-muted-foreground">
               Loading…
            </div>
         </div>
      )
   }

   if (feature === 'goatStatus' && !showGoatStatusPage(config)) return null
   if (feature === 'map' && !showMap(config)) return null

   return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
}
