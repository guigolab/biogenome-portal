'use client'

import { useEffect, useState } from 'react'

import { cmsGetModelFieldStats } from '@/lib/cms/services/auth'

const NO_ENTRY = 'No Entry'

export type OrganismFieldStats = {
   goat_status: Record<string, number>
   insdc_status: Record<string, number>
   target_list_status: Record<string, number>
}

export function useOrganismFieldStats() {
   const [data, setData] = useState<OrganismFieldStats | null>(null)
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      let cancelled = false
      ;(async () => {
         try {
            const fields = ['goat_status', 'insdc_status', 'target_list_status'] as const
            const results = await Promise.all(
               fields.map(async (field) => {
                  const res = await cmsGetModelFieldStats('organisms', field, {})
                  return Object.fromEntries(Object.entries(res).filter(([k]) => k !== NO_ENTRY))
               }),
            )
            if (!cancelled) {
               setData({
                  goat_status: results[0],
                  insdc_status: results[1],
                  target_list_status: results[2],
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
   }, [])

   return { data, loading }
}
