import { defineStore } from 'pinia'
import { ErrorResponseData, DataModels, Frequency, ConfigFilter } from '../data/types'
import { useToast } from 'vuestic-ui'
import CommonService from '../services/CommonService'
import StatisticsService from '../services/StatisticsService'
import { AxiosError } from 'axios'
import AssemblyService from '../services/AssemblyService'
import BioSampleService from '../services/BioSampleService'
import GeoLocationService from '../services/GeoLocationService'
import ReadService from '../services/ReadService'
import OrganismService from '../services/OrganismService'

export const staticFilters = {
   sort_order: '',
   sort_column: '',
}
const initPagination = {
   offset: 0,
   limit: 20,
}
const ITEMS_CACHE_TTL_MS = 1500

const isMeaningfulFilterValue = (value: unknown): boolean => {
   if (value === null || value === undefined || value === '' || value === false) return false
   if (Array.isArray(value)) return value.length > 0
   return true
}

const serializeParams = (params: Record<string, any>): string => {
   return Object.keys(params)
      .sort()
      .map((key) => {
         const value = params[key]
         const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
         return `${key}:${serializedValue}`
      })
      .join('|')
}

const buildItemsRequestKey = (model: DataModels, params: Record<string, any>): string =>
   `${model}|${serializeParams(params)}`

const buildFrequencyRequestKey = (model: DataModels, field: string, query: Record<string, any>): string =>
   `${model}|${field}|${serializeParams(query)}`

const buildItemDetailRequestKey = (model: DataModels, id: string): string => `${model}|${id}`

export const useItemStore = defineStore('item', {
   state: () => {
      return {
         view: 'cards' as 'cards' | 'table' | 'charts',
         frequencies: [] as Frequency[],
         customFilters: [] as ConfigFilter[],
         item: null as Record<string, any> | null,
         itemId: null as string | null,
         selectedItemId: null as string | null,
         model: null as DataModels | null,
         searchForm: { ...staticFilters } as Record<string, any>,
         pagination: { ...initPagination },
         items: [] as Record<string, any>[],
         total: 0,
         showTsvModal: false,
         showChartModal: false,
         showExportModal: false,
         isTableLoading: false,
         isLoadMoreLoading: false,
         isTSVLoading: false,
         lastItemsFetchKey: null as string | null,
         lastItemsFetchAt: 0,
         itemsRequestSeq: 0,
         pendingItemsRequests: {} as Partial<Record<string, Promise<void>>>,
         pendingFrequencyRequests: {} as Partial<Record<string, Promise<Record<string, number> | undefined>>>,
         frequencyCache: {} as Record<string, Record<string, number>>,
         pendingItemDetailRequests: {} as Partial<Record<string, Promise<Record<string, any> | undefined>>>,
         itemDetailCache: {} as Record<string, Record<string, any>>,
         toast: useToast().init,
      }
   },

   actions: {
      initStore(model: DataModels) {
         this.searchForm = { ...staticFilters }
         this.customFilters = []
         this.model = model
      },
      selectItem(id: string) {
         this.selectedItemId = id
      },
      setSelectedItem(model: DataModels, id: string) {
         this.model = model
         this.selectedItemId = id
      },
      clearSelectedItem() {
         this.selectedItemId = null
         this.item = null
      },
      setSearchFormField(key: string, value: any) {
         if (this.searchForm) {
            this.searchForm[key] = value
         }
      },
      buildQuery() {
         if (this.searchForm) {
            const searchFormEntries = Object.entries(this.searchForm).filter(([, value]) =>
               isMeaningfulFilterValue(value),
            )
            return Object.fromEntries(searchFormEntries)
         } else {
            return {}
         }
      },
      //resets only the related filters (skips taxon_lineage)
      resetFilters() {
         if (this.searchForm) {
            const resettedForm = Object.fromEntries(
               Object.entries(this.searchForm)
                  .filter(([k]) => k !== 'taxon_lineage')
                  .map(([k]) => [k, null]),
            )
            this.searchForm = { ...this.searchForm, ...resettedForm }
         }
         this.customFilters = []
      },
      removeCustomFilter(filter: ConfigFilter) {
         this.customFilters = this.customFilters.filter((f) => f.key !== filter.key)
      },
      resetPagination() {
         this.pagination = { ...initPagination }
      },
      catchError(error: any) {
         console.error(error)
         const axiosError = error as AxiosError<ErrorResponseData>
         let message
         if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
            message = axiosError.response.data.message
         } else {
            message = axiosError.message
         }
         this.toast({ message: message, color: 'danger' })
      },

      downloadFile(model: DataModels, data: any, format: string) {
         const href = URL.createObjectURL(data)

         const filename = `${model}_report.${format}`
         // create "a" HTML element with href to file & click
         const link = document.createElement('a')
         link.href = href
         link.setAttribute('download', filename) //or any other extension
         document.body.appendChild(link)
         link.click()
         // clean up "a" element & remove ObjectURL
         document.body.removeChild(link)
         URL.revokeObjectURL(href)
      },
      async fetchItem(model: DataModels, id: string) {
         const key = buildItemDetailRequestKey(model, id)
         if (this.itemDetailCache[key]) {
            return this.itemDetailCache[key]
         }
         if (this.pendingItemDetailRequests[key]) {
            return await this.pendingItemDetailRequests[key]
         }

         const request = (async () => {
            try {
               const { data } = await CommonService.getItem(model, id)
               this.itemDetailCache[key] = data
               return data
            } catch (err) {
               this.catchError(err)
            } finally {
               delete this.pendingItemDetailRequests[key]
            }
         })()
         this.pendingItemDetailRequests[key] = request
         try {
            return await request
         } catch (err) {
            this.catchError(err)
         }
      },
      async handleQuery(model: DataModels) {
         this.model = model
         this.items = []
         this.total = 0
         this.resetPagination()
         this.resetFilters()
         await this.fetchItems(model)
      },
      async getFieldFrequencies(model: DataModels, field: string, ignoreQuery?: boolean) {
         const query = ignoreQuery ? {} : this.buildQuery()
         const key = buildFrequencyRequestKey(model, field, query)
         if (this.frequencyCache[key]) {
            return this.frequencyCache[key]
         }
         if (this.pendingFrequencyRequests[key]) {
            return await this.pendingFrequencyRequests[key]
         }

         const request = (async () => {
            try {
               const { data } = await StatisticsService.getModelFieldStats(model, field, query)
               const normalizedData = data ? { ...data } : {}
               this.frequencyCache[key] = normalizedData
               return normalizedData
            } catch (err) {
               this.catchError(err)
            } finally {
               delete this.pendingFrequencyRequests[key]
            }
         })()
         this.pendingFrequencyRequests[key] = request
         try {
            return await request
         } catch (err) {
            this.catchError(err)
         }
      },
      addCustomFilter(filter: ConfigFilter) {
         this.customFilters.push(filter)
      },
      //incoming model may not correspond to currentModel
      async getFrequencies(model: DataModels, field: string, ignoreQuery: boolean) {
         try {
            const query = ignoreQuery ? {} : this.buildQuery()
            const key = buildFrequencyRequestKey(model, field, query)
            const freqs = this.frequencies
            const data = await this.getFieldFrequencies(model, field, ignoreQuery)
            if (!data) return
            const newFreq: Frequency = { model, field, data }
            const existingIndex = freqs.findIndex((f) => f.model === model && f.field === field)
            if (existingIndex !== -1) {
               freqs[existingIndex] = newFreq
            } else {
               freqs.push(newFreq)
            }
            this.frequencies = [...freqs]
            this.frequencyCache[key] = data
         } catch (err) {
            this.catchError(err)
         }
      },
      async fetchItems(model: DataModels, options?: { force?: boolean }) {
         const params = { ...this.buildQuery(), ...this.pagination }
         const requestKey = buildItemsRequestKey(model, params)

         if (this.pendingItemsRequests[requestKey]) {
            await this.pendingItemsRequests[requestKey]
            return
         }

         if (
            !options?.force &&
            this.lastItemsFetchKey === requestKey &&
            Date.now() - this.lastItemsFetchAt < ITEMS_CACHE_TTL_MS
         ) {
            return
         }

         const requestSeq = ++this.itemsRequestSeq
         this.isTableLoading = true
         const request = (async () => {
            try {
               const { data } = await CommonService.getItems(model, params)
               if (requestSeq !== this.itemsRequestSeq) return
               this.items = [...data.data]
               this.total = data.total
               this.lastItemsFetchKey = requestKey
               this.lastItemsFetchAt = Date.now()
            } catch (err) {
               if (requestSeq === this.itemsRequestSeq) {
                  this.catchError(err)
               }
            } finally {
               delete this.pendingItemsRequests[requestKey]
               if (requestSeq === this.itemsRequestSeq) {
                  this.isTableLoading = false
               }
            }
         })()
         this.pendingItemsRequests[requestKey] = request
         try {
            await request
         } catch (err) {
            this.catchError(err)
         }
      },
      async fetchMoreItems(model: DataModels) {
         if (this.isLoadMoreLoading) return
         if (this.items.length >= this.total) return
         const nextOffset = this.pagination.offset + this.pagination.limit
         this.isLoadMoreLoading = true
         try {
            const params = { ...this.buildQuery(), offset: nextOffset, limit: this.pagination.limit }
            const { data } = await CommonService.getItems(model, params)
            this.items = [...this.items, ...data.data]
            this.pagination.offset = nextOffset
            this.total = data.total
         } catch (err) {
            this.catchError(err)
         } finally {
            this.isLoadMoreLoading = false
         }
      },
      async downloadData(model: DataModels, fields: string[], format: string) {
         // this.initStore(model);  // Ensure store exists

         this.isTSVLoading = true
         const downloadRequest = { format, fields: fields.join(',') }
         const query = this.buildQuery()

         try {
            const requestData = { ...query, ...downloadRequest, ...{ offset: 0, limit: this.total + 1 } }
            const { data } = await CommonService.getTsv(model, requestData)
            this.downloadFile(model, data, format)
         } catch (e) {
            this.catchError(e)
         } finally {
            this.isTSVLoading = false
         }
      },
      async fetchAssemblyData(id: string) {
         try {
            const chromosomes = await AssemblyService.getRelatedChromosomes(id)
            const annotations = await AssemblyService.getRelatedAnnotations(id)
            return { chromosomes: chromosomes.data, annotations: annotations.data }
         } catch (e) {
            this.catchError(e)
         }
      },
      async fetchBioSampleData(id: string) {
         try {
            const assemblies = await BioSampleService.getBioSampleRelatedData(id, 'assemblies')
            const reads = await BioSampleService.getBioSampleRelatedData(id, 'reads')
            const subSamples = await BioSampleService.getBioSampleRelatedData(id, 'sub_samples')
            const coordinates = await GeoLocationService.getLocationsFrequency({ sample_accession: id })
            return {
               assemblies: assemblies.data,
               biosamples: subSamples.data,
               reads: reads.data,
               coordinates: coordinates.data,
            }
         } catch (e) {
            this.catchError(e)
         }
      },
      async fetchLocalSampleData(id: string) {
         try {
            const coordinates = await GeoLocationService.getLocationsFrequency({ sample_accession: id })
            return { coordinates: coordinates.data }
         } catch (e) {
            this.catchError(e)
         }
      },
      async fetchReadRunSiblingsByExperiment(experimentAccession: string | undefined) {
         try {
            if (!experimentAccession) return { reads: [] }
            const { data } = await ReadService.getReadRunsByExperiment(experimentAccession)
            return { reads: data }
         } catch (e) {
            this.catchError(e)
         }
      },
      async fetchOrganismData(id: string) {
         try {
            const assemblies = await OrganismService.getOrganismRelatedData(id, 'assemblies')
            const annotations = await OrganismService.getOrganismRelatedData(id, 'annotations')
            const reads = await OrganismService.getOrganismRelatedData(id, 'reads')
            const biosamples = await OrganismService.getOrganismRelatedData(id, 'biosamples')
            const local_samples = await OrganismService.getOrganismRelatedData(id, 'local_samples')
            const coordinates = await GeoLocationService.getLocationsFrequency({ taxid: id })
            return {
               assemblies: assemblies.data,
               biosamples: biosamples.data,
               reads: reads.data,
               local_samples: local_samples.data,
               annotations: annotations.data,
               coordinates: coordinates.data,
            }
         } catch (e) {
            this.catchError(e)
         }
      },
   },
})
