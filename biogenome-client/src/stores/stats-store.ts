import { defineStore } from 'pinia'
import { DataModels } from '../data/types'
import TaxonService from '../services/TaxonService'
import AuthService from '../services/AuthService'
import { taxonNodeToPortalStats } from '../composable/taxonNodeStats'

function defaultRootTaxid(): string {
   return import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE : '131567'
}

export const useStatsStore = defineStore('stats', {
   state: () => {
      return {
         portalStats: [] as { key: DataModels; count: number }[],
         currentStats: [] as { key: DataModels; count: number }[],
         userStats: [] as { key: DataModels; count: number }[],
         isLoading: true,
      }
   },
   actions: {
      /**
       * Load portal-wide counts from the root TaxonNode (denormalized aggregates).
       * @param preloaded — if already fetched (e.g. layout), avoids a second GET /taxons/:id
       */
      async getPortalStats(preloadedTaxon?: Record<string, unknown>) {
         try {
            this.isLoading = true
            const doc =
               preloadedTaxon ??
               (await TaxonService.getTaxon(defaultRootTaxid())).data as Record<string, unknown>
            const mappedStats = taxonNodeToPortalStats(doc)
            this.portalStats = [...mappedStats]
            if (!this.currentStats.length) this.currentStats = [...mappedStats]
         } catch (e) {
            console.log('Error fetching stats')
            console.error(e)
         } finally {
            this.isLoading = false
         }
      },
      async getTaxonStats(taxid: string) {
         try {
            this.isLoading = true
            const { data } = await TaxonService.getTaxon(taxid)
            const mappedStats = taxonNodeToPortalStats(data as Record<string, unknown>)
            this.currentStats = [...mappedStats]
         } catch (e) {
            console.log('Error fetching stats')
            console.error(e)
         } finally {
            this.isLoading = false
         }
      },
      async getUserStats(name: string) {
         try {
            this.isLoading = true

            const { data } = await AuthService.getUserRelatedData(name)
            const mappedStats = Object.entries(data as Record<DataModels, number>)
               .filter(([k, v]) => Boolean(v))
               .map(([k, v]) => {
                  return { key: k as DataModels, count: v }
               })
            this.userStats = [...mappedStats]
         } catch (e) {
            console.log('Error fetching stats')
            console.error(e)
         } finally {
            this.isLoading = false
         }
      },
      resetStore() {
         this.portalStats = []
         this.currentStats = []
         this.userStats = []
      },
   },
})
