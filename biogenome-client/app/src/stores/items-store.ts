import { defineStore } from 'pinia'
import { ErrorResponseData, ConfigFilter, DataModels, TaxonNode, Filter } from '../data/types'
import CommonService from '../services/CommonService'
import StatisticsService from '../services/StatisticsService'
import { AxiosError } from 'axios'
import { useConfig } from '../composable/useConfig'
import { useToast } from 'primevue'

const initPagination = {
    offset: 0,
    limit: 10,
}

const initSort = {
    sort_column: "",
    sort_order: ""
}

const mapFilters = (filters: Filter[]) => filters.map(f => ({ ...f, value: null }))
    .sort((a, b) => (a.type === 'checkbox' ? 1 : 0) - (b.type === 'checkbox' ? 1 : 0))
// Factory function to create a store for a specific model
function createModelStore(model: DataModels) {
    const { filters } = useConfig(model);
    return {
        filters: mapFilters(filters.value),
        pagination: { ...initPagination },
        sort: { ...initSort },
        items: [],
        total: 0,
    };
}

export const useItemStore = defineStore('item', {
    state: () => {

        return {
            view: 'table' as 'table' | 'charts',
            stores: {} as Record<DataModels, any>,
            parentTaxon: null as TaxonNode | null,
            country: null as { name: string, id: string, rank: string } | null,
            showTsvModal: false,
            showChartModal: false,
            isTableLoading: false,
            isTSVLoading: false,
            showFilters: false,
            toast: useToast()
        }
    },
    actions: {
        initStore(model: DataModels) {
            if (!this.stores[model]) {
                this.stores[model] = createModelStore(model);
            }
        },
        resetFilters(model: DataModels) {
            this.initStore(model)
            const { filters } = useConfig(model)
            this.stores[model].filters = [...mapFilters(filters.value)]
        },
        async updateFilter(model: DataModels, filter: ConfigFilter) {
            this.initStore(model)
            const { filters } = this.stores[model] as { filters: ConfigFilter[] }
            // Find the index of the filter to update
            const index = filters.findIndex(({ key }) => key === filter.key);

            if (index !== -1) {
                // Update the specific filter in the list
                const updatedFilters = [...filters];
                const { value } = filter
                updatedFilters[index] = { ...updatedFilters[index], value };

                // Replace the filters array to trigger reactivity
                this.stores[model].filters = [...updatedFilters]
                this.resetPagination(model)
                await this.fetchItems(model)
            }
        },
        // agnostic query does not contain pagination or sort
        buildQuery(model: DataModels) {
            const entries = [] as [string, any][]
            const { filters } = this.stores[model]
            filters
                .filter((f: ConfigFilter) => f.value !== null && f.value !== "")
                .forEach((f: ConfigFilter) => {
                    if (f.type === 'checkbox') {
                        entries.push([`${f.key}__exists`, f.value])
                    } else if (f.type === 'date') {
                        const [lt, gt] = f.value
                        entries.push([`${f.key}__lte`, lt], [`${f.key}__gte`, gt])
                    } else if (f.type === 'range') {
                        const [lt, gt] = f.value
                        entries.push([`${f.key}__lt`, lt], [`${f.key}__gt`, gt])
                    } else if (f.type === 'select') {
                        entries.push([f.key, f.value])
                    } else {
                        entries.push([`${f.key}__icontains`, f.value])
                    }
                })
            if (this.parentTaxon) entries.push(['taxon_lineage', this.parentTaxon.taxid])
            if (this.country && model === 'organisms') entries.push(['countries', this.country.id]);
            return Object.fromEntries(entries);
        },
        resetPagination(model: DataModels) {
            this.initStore(model);  // Ensure store exists
            this.stores[model].pagination = { ...initPagination }
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
            this.toast.add({ detail: message, severity: 'error' })
        },

        //incoming model may not correspond to currentModel
        async getFrequencies(model: DataModels, field: string) {
            this.initStore(model);  // Ensure store exists
            try {
                const query = this.buildQuery(model)
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                return data
            } catch (err) {
                this.catchError(err)
            }
        },
        async fetchItems(model: DataModels) {
            this.initStore(model);  // Ensure store exists

            this.isTableLoading = true
            const { sort, pagination } = this.stores[model]
            const query = this.buildQuery(model)

            // Build the query params
            const params = { ...query, ...pagination, ...sort }

            try {
                const { data } = await CommonService.getItems(model, params)
                this.stores[model].items = [...data.data]
                this.stores[model].total = data.total
            } catch (err) {
                this.catchError(err)
            } finally {
                this.isTableLoading = false
            }
        },
        async downloadData(model: DataModels, fields: string[], applyFilters: boolean) {
            this.initStore(model);  // Ensure store exists

            this.isTSVLoading = true
            const downloadRequest = { format: "tsv", fields: [...fields] }
            try {
                const requestData = applyFilters ? { ...this.buildQuery(model), ...downloadRequest } : { ...downloadRequest }
                const { data } = await CommonService.getTsv(model, requestData)
                return data

            } catch (e) {
                this.catchError(e)
            } finally {
                this.isTSVLoading = false
            }
        }

    },
})
