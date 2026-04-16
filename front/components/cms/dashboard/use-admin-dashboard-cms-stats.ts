'use client'

import { useEffect, useState } from 'react'

import { cmsListTotal } from '@/lib/cms/cmsListTotal'
import {
   cmsGetItems,
   cmsGetOrganismsWithUsers,
   cmsGetSubmittedBioSamples,
   cmsGetUnassignedOrganisms,
} from '@/lib/cms/services/auth'

const listParams = { limit: 1, offset: 0, format: 'json' as const }

export type AdminDashboardCmsStats = {
   assignedSpecies: number | null
   unassignedSpecies: number | null
   mySubmittedBiosamples: number | null
   allSubmittedBiosamples: number | null
   pendingDeletionRequests: number | null
   loading: boolean
}

const initial: Omit<AdminDashboardCmsStats, 'loading'> = {
   assignedSpecies: null,
   unassignedSpecies: null,
   mySubmittedBiosamples: null,
   allSubmittedBiosamples: null,
   pendingDeletionRequests: null,
}

/**
 * Lightweight totals for the admin dashboard (limit=1 list calls; uses `total` only).
 */
export function useAdminDashboardCmsStats(userName: string | null) {
   const [stats, setStats] = useState<AdminDashboardCmsStats>({ ...initial, loading: true })

   useEffect(() => {
      let cancelled = false
      ;(async () => {
         setStats({ ...initial, loading: true })
         try {
            const minePromise = userName
               ? cmsGetSubmittedBioSamples({ ...listParams, user: userName })
               : Promise.resolve({})

            const [assigned, unassigned, mine, all, deletions] = await Promise.all([
               cmsGetOrganismsWithUsers({ ...listParams }),
               cmsGetUnassignedOrganisms({ ...listParams }),
               minePromise,
               cmsGetSubmittedBioSamples({ ...listParams }),
               cmsGetItems('organisms', { ...listParams, pending_deletion: true }),
            ])
            if (cancelled) return
            setStats({
               assignedSpecies: cmsListTotal(assigned),
               unassignedSpecies: cmsListTotal(unassigned),
               mySubmittedBiosamples: userName ? cmsListTotal(mine) : null,
               allSubmittedBiosamples: cmsListTotal(all),
               pendingDeletionRequests: cmsListTotal(deletions),
               loading: false,
            })
         } catch {
            if (!cancelled) {
               setStats({ ...initial, loading: false })
            }
         }
      })()
      return () => {
         cancelled = true
      }
   }, [userName])

   return stats
}
