import { defineStore } from 'pinia'
import { ErrorResponseData, DataModels, Frequency, ConfigFilter } from '../data/types'
import { useToast } from 'vuestic-ui'
import CommonService from '../services/CommonService'
import StatisticsService from '../services/StatisticsService'
import { AxiosError } from 'axios'
import AssemblyService from '../services/AssemblyService'
import BioSampleService from '../services/BioSampleService'
import GeoLocationService from '../services/GeoLocationService'
import ExperimentService from '../services/ExperimentService'
import OrganismService from '../services/OrganismService'

export const staticFilters = {
    sort_order: "",
    sort_column: "",
}
const initPagination = {
    offset: 0,
    limit: 20,
}

export const useItemStore = defineStore('item', {
    state: () => {
        return {
            view: 'table' as 'table' | 'charts',
            frequencies: [] as Frequency[],
            customFilters: [] as ConfigFilter[],
            item: null as Record<string, any> | null,
            itemId: null as string | null,
            model: null as DataModels | null,
            searchForm: { ...staticFilters } as Record<string, any>,
            pagination: { ...initPagination },
            items: [] as Record<string, any>[],
            total: 0,
            showTsvModal: false,
            showChartModal: false,
            isTableLoading: false,
            isTSVLoading: false,
            toast: useToast().init
        }
    },

    actions: {
        initStore(model: DataModels) {
            this.searchForm = { ...staticFilters }
            this.customFilters = []
            this.model = model
        },
        setSearchFormField(key: string, value: any) {
            if (this.searchForm) {
                this.searchForm[key] = value;
            }
        },
        buildQuery() {
            if (this.searchForm) {
                const searchFormEntries = Object.entries(this.searchForm)
                    .filter(([_, value]) => value);
                return Object.fromEntries(searchFormEntries);
            } else {
                return {}
            }

        },
        //resets only the related filters (skips taxon_lineage)
        resetFilters() {
            if (this.searchForm) {
                const resettedForm = Object.fromEntries(Object.entries(this.searchForm).filter(([k, v]) => k !== 'taxon_lineage').map(([k, v]) => [k, null]))
                this.searchForm = { ...this.searchForm, ...resettedForm }
            }
            this.customFilters = []
        },
        removeCustomFilter(filter: ConfigFilter) {
            this.customFilters = this.customFilters.filter(f => f.key !== filter.key)
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
            const href = URL.createObjectURL(data);

            const filename = `${model}_report.${format}`
            // create "a" HTML element with href to file & click
            const link = document.createElement('a');
            link.href = href;
            link.setAttribute('download', filename); //or any other extension
            document.body.appendChild(link);
            link.click();
            // clean up "a" element & remove ObjectURL
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
        },
        async fetchItem(model: DataModels, id: string) {
            try {
                const { data } = await CommonService.getItem(model, id)
                return data
            } catch (err) {
                this.catchError(err)
            }
        },
        async handleQuery(model: DataModels) {
            this.resetPagination()
            this.resetFilters()
            this.fetchItems(model)
        },
        async getFieldFrequencies(model: DataModels, field: string, ignoreQuery?: boolean) {
            try {
                const query = ignoreQuery ? {} : this.buildQuery()
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                return data
            } catch (err) {
                this.catchError(err)
            }
        },
        addCustomFilter(filter: ConfigFilter) {
            this.customFilters.push(filter)
        },
        //incoming model may not correspond to currentModel
        async getFrequencies(model: DataModels, field: string, ignoreQuery: boolean) {
            // this.initStore(model);  // Ensure store exists
            try {

                const query = ignoreQuery ? {} : this.buildQuery()
                const freqs = this.frequencies
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                const newFreq: Frequency = { model, field, data }
                const existingIndex = freqs.findIndex(
                    f => f.model === model && f.field === field
                );
                if (existingIndex !== -1) {
                    freqs[existingIndex] = newFreq;
                } else {
                    freqs.push(newFreq);
                }
                this.frequencies = [...freqs]
            } catch (err) {
                this.catchError(err)
            }
        },
        async fetchItems(model: DataModels) {
            // this.initStore(model);  // Ensure store exists
            this.isTableLoading = true

            // Build the query params
            const params = { ...this.buildQuery(), ...this.pagination }
            try {
                const { data } = await CommonService.getItems(model, params)
                this.items = [...data.data]
                this.total = data.total
            } catch (err) {
                this.catchError(err)
            } finally {
                this.isTableLoading = false
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
                const experiments = await BioSampleService.getBioSampleRelatedData(id, 'experiments')
                const subSamples = await BioSampleService.getBioSampleRelatedData(id, 'sub_samples')
                const coordinates = await GeoLocationService.getLocationsFrequency({ sample_accession: id })
                return { assemblies: assemblies.data, biosamples: subSamples.data, experiments: experiments.data, coordinates: coordinates.data }

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
        async fetchExperimentData(id: string) {
            try {
                const { data } = await ExperimentService.getReadsByExperiment(id)
                return { reads: data }

            } catch (e) {
                this.catchError(e)
            }
        },
        async fetchOrganismData(id: string) {
            try {
                const assemblies = await OrganismService.getOrganismRelatedData(id, 'assemblies')
                const annotations = await OrganismService.getOrganismRelatedData(id, 'annotations')
                const experiments = await OrganismService.getOrganismRelatedData(id, 'experiments')
                const biosamples = await OrganismService.getOrganismRelatedData(id, 'biosamples')
                const local_samples = await OrganismService.getOrganismRelatedData(id, 'local_samples')
                const coordinates = await GeoLocationService.getLocationsFrequency({ taxid: id })
                return {
                    assemblies: assemblies.data,
                    biosamples: biosamples.data,
                    experiments: experiments.data,
                    local_samples: local_samples.data,
                    annotations: annotations.data,
                    coordinates: coordinates.data
                }
            } catch (e) {
                this.catchError(e)
            }
        }
    },
})
