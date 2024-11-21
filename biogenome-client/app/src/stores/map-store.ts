import { defineStore } from 'pinia'
import pages from '../../configs/pages.json'
import { CoordinatesFrequency, ChoroplethData } from '../data/types'
import GeoLocationService from '../services/GeoLocationService'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow'
import StatisticsService from '../services/StatisticsService'


export const useMapStore = defineStore('map', {

    state: () => {
        return {
            mapType: 'cloropleth' as 'cloropleth' | 'points',
            view: 'samples' as 'samples' | 'organisms',
            type: 'all' as 'all' | 'biosamples' | 'local_samples',
            showSelect: 'local_samples' in pages && 'biosamples' in pages,
            locations: [] as CoordinatesFrequency[],
            countries: [] as ChoroplethData[],
            isLoading: false
        }
    },
    actions: {
        async getCoordinates(query: Record<string, any>) {
            try {
                this.isLoading = true
                const { data } = await GeoLocationService.getLocationsFrequency(query)
                this.locations = [...data]
            } catch (e) {
                console.error(e)
            } finally {
                this.isLoading = false

            }
        },
        async getCountries(query: Record<string, any>) {
            try {
                this.isLoading = true
                const { data } = await StatisticsService.getModelFieldStats('organisms', 'countries', query)
                this.countries = am5geodata_worldLow.features
                    .filter(({ id }) => id && Object.keys(data).includes(id.toString()))
                    .map((ft) => ({ occurrences: data[ft.id as keyof typeof data], geojson: ft, countryName: ft.properties?.name as string, countryId: ft.id?.toString() })) as ChoroplethData[]

            } catch (e) {
                console.error(e)
            } finally {
                this.isLoading = false

            }
        }
    }
})
