import { defineStore } from 'pinia'
import { CoordinatesFrequency, ChoroplethData } from '../data/types'
import GeoLocationService from '../services/GeoLocationService'
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldHigh'
import StatisticsService from '../services/StatisticsService'


export const useMapStore = defineStore('map', {

    state: () => {
        return {
            mapType: 'points' as 'cloropleth' | 'points',
            view: 'samples' as 'samples' | 'organisms',
            type: 'all' as 'all' | 'biosamples' | 'local_samples',
            locations: [] as CoordinatesFrequency[],
            countries: [] as ChoroplethData[],
            selectedCountries:[] as {id:string,name:string}[],
            isLoading: false,
            hasCoordinates:false,
            hasCountries:false,
            showCountriesMap:false,
        }
    },
    actions: {
        async getCoordinates(query: Record<string, any>) {
            this.hasCoordinates = false
            try {
                this.isLoading = true
                const { data } = await GeoLocationService.postLocationsFrequency(query)
                this.locations = [...data]
                this.hasCoordinates = this.locations.length > 0
            } catch (e) {
                console.error(e)
                this.hasCoordinates = false
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
                this.hasCountries = this.countries.length > 0
            } catch (e) {
                console.error(e)
                this.hasCountries = false
            } finally {
                this.isLoading = false

            }
        }
    }
})
