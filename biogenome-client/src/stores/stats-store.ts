import { defineStore } from 'pinia'
import LookupService from '../services/clients/LookupService'
import { DataModels } from '../data/types'

export const useStatsStore = defineStore('stats', {
    state: () => {
        return {
            stats: [] as { key: DataModels, count: number }[],
        }
    },
    actions: {
        async getStats() {
            try {
                const { data } = await LookupService.lookupData()
                const mappedStats = Object.entries(data as Record<DataModels, number>).map(([k, v]) => {
                    return { key: k as DataModels, count: v }
                })
                this.stats = [...mappedStats]

            } catch (e) {
                console.log('Error fetching stats')
                console.error(e)
            }
        },
        resetStore() {
            this.stats = []
        }
    },
})
