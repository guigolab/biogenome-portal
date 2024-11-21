import { defineStore } from 'pinia'
import LookupService from '../services/clients/LookupService'
import { DataModels } from '../data/types'
import TaxonService from '../services/clients/TaxonService'
import GeoLocationService from '../services/clients/GeoLocationService'
import generalConf from '../../configs/general.json'

const isSampleMapActive = generalConf.maps.includes('samples-map')

export const useStatsStore = defineStore('stats', {
    state: () => {
        return {
            portalStats: [] as { key: DataModels | 'coordinates', count: number }[],
            currentStats: [] as { key: DataModels | 'coordinates', count: number }[],
            isLoading: true,
        }
    },
    actions: {
        async getStats(taxid: string | 'root') {

            // Helper function to map stats
            const mapStats = (data: Record<DataModels | 'coordinates', number>) => {
                return Object.entries(data).map(([key, count]) => ({ key: key as DataModels | 'coordinates', count }));
            };
            if (taxid === 'root' && this.portalStats.length) {
                this.currentStats = [...this.portalStats]
                return
            }
            try {
                this.isLoading = true;

                // Determine service based on taxid
                const { data } = taxid === 'root'
                    ? await LookupService.lookupData()
                    : await TaxonService.getTaxonStats(taxid);

                // Map stats and update state
                const mappedStats = mapStats(data as Record<DataModels | 'coordinates', number>);
                if (isSampleMapActive) {
                    const coords = await this.getCoordinatesCount(taxid)
                    mappedStats.push(coords)
                }

                this.currentStats = [...mappedStats];

                // Set portalStats only if taxid is 'root' and if it's initially empty
                if (taxid === 'root' && !this.portalStats.length) {
                    this.portalStats = [...mappedStats];
                }

            } catch (e) {
                console.log('Error fetching stats');
                console.error(e);
            } finally {
                this.isLoading = false;
            }
        },
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
