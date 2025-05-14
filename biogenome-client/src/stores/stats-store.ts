import { defineStore } from 'pinia'
import LookupService from '../services/LookupService'
import { DataModels } from '../data/types'
import TaxonService from '../services/TaxonService'
import GeoLocationService from '../services/GeoLocationService'
import AuthService from '../services/AuthService'


export const useStatsStore = defineStore('stats', {
    state: () => {
        return {
            portalStats: [] as { key: DataModels, count: number }[],
            currentStats: [] as { key: DataModels, count: number }[],
            userStats: [] as { key: DataModels, count: number }[],
            isLoading: true,
        }
    },
    actions: {
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
        async getUserStats(name: string) {
            try {
                this.isLoading = true

                const { data } = await AuthService.getUserRelatedData(name)
                const mappedStats = Object.entries(data as Record<DataModels, number>).filter(([k, v]) => Boolean(v)).map(([k, v]) => {
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
        }
    },
})
