'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { extractApiMessage } from '@/lib/cms/extract-api-message'

export function useActiveTabOverviewStats<T>(active: boolean, fetcher: () => Promise<T>) {
   const [data, setData] = useState<T | null>(null)
   const [loading, setLoading] = useState(false)

   useEffect(() => {
      if (!active) return
      let cancelled = false
      void (async () => {
         setLoading(true)
         try {
            const result = await fetcher()
            if (!cancelled) setData(result)
         } catch (e) {
            if (!cancelled) {
               setData(null)
               toast.error(extractApiMessage(e, 'Could not load overview stats'))
            }
         } finally {
            if (!cancelled) setLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
      // fetcher is a stable module-level reference
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [active])

   return { data, loading }
}
