'use client'

import { useEffect, useState } from 'react'

import { cmsGetModelFieldStats } from '@/lib/cms/services/auth'

const NO_ENTRY = 'No Entry'

export type OrganismFieldStats = {
   goat_status: Record<string, number>
   target_list_status: Record<string, number>
}

type UseOrganismFieldStatsOptions = {
   /** When false, skips fetch (e.g. GoaT disabled for portal). */
   enabled?: boolean
}

export function useOrganismFieldStats(options?: UseOrganismFieldStatsOptions) {
   const enabled = options?.enabled !== false
   const [data, setData] = useState<OrganismFieldStats | null>(null)
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      if (!enabled) {
         setData(null)
         setLoading(false)
         return
      }
      let cancelled = false
      ;(async () => {
         setLoading(true)
         try {
            const fields = ['goat_status', 'target_list_status'] as const
            const results = await Promise.all(
               fields.map(async (field) => {
                  const res = await cmsGetModelFieldStats('organisms', field, {})
                  return Object.fromEntries(Object.entries(res).filter(([k]) => k !== NO_ENTRY))
               }),
            )
            if (!cancelled) {
               setData({
                  goat_status: results[0],
                  target_list_status: results[1],
               })
            }
         } catch {
            if (!cancelled) setData(null)
         } finally {
            if (!cancelled) setLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [enabled])

   return { data, loading }
}
