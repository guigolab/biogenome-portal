import { defineStore } from 'pinia'
import LookupService from '../services/LookupService'
import { DataModels } from '../data/types'
import TaxonService from '../services/TaxonService'
import GeoLocationService from '../services/GeoLocationService'


export const useStatsStore = defineStore('stats', {
    state: () => {
        return {
            portalStats: [] as { key: DataModels , count: number }[],
            currentStats: [] as { key: DataModels, count: number }[],
            isLoading: true,
        }
    },
    actions: {
        async getCoordinatesCount(taxid: string | 'root') {
            const query = taxid === 'root' ? {} : { taxid }
            const { data } = await GeoLocationService.getLocationsFrequency(query)
            return {
                key: 'coordinates' as DataModels | 'coordinates',
                count: Object.keys(data).length
            }
        },
        async getPortalStats() {
            try {
                this.isLoading = true
                const { data } = await LookupService.lookupData()
                const mappedStats = Object.entries(data as Record<DataModels, number>).map(([k, v]) => {
                    return { key: k as DataModels, count: v }
                })
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

                const { data } = await TaxonService.getTaxonStats(taxid)
                const mappedStats = Object.entries(data as Record<DataModels, number>).map(([k, v]) => {
                    return { key: k as DataModels, count: v }
                })
                this.currentStats = [...mappedStats]

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
        }
    },
})
