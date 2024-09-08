import { defineStore } from 'pinia'
import { Filter, ErrorResponseData, ConfigFilter } from '../data/types'
import { useToast } from 'vuestic-ui'
import CommonService from '../services/clients/CommonService'
import StatisticsService from '../services/clients/StatisticsService'
import filters from '../../configs/filters.json'
import columns from '../../configs/columns.json'

import { AxiosError } from 'axios'

const staticFilters = {
    filter: "",
    sort_order: "",
    sort_column: "",
}
const initPagination = {
    offset: 0,
    limit: 10,
}

function mapSearchForm(filters: ConfigFilter[]) {

    const formEntries = filters.map(f => {
        if (f.type === "date") {
            return [[`${f.key}__gte`, null], [`${f.key}__lte`, null]]
        } else if (f.type === "checkbox") {
            return [[`${f.key}__exists`, null]]
        }
        return [[f.key, null]]
    }).flat()

    return Object.fromEntries(formEntries)
}


//add configs in each store to manage everything from here
function mapModelStore(value: ConfigFilter[], key: keyof typeof filters) {

    const searchForm = mapSearchForm(value)
    const tableFilters = { ...staticFilters }
    const columnsToShow = [...columns[key]] //show all columns by default
    const pagination = { ...initPagination }
    const items: Record<string, any>[] = []
    const total = 0
    return {
        searchForm,
        tableFilters,
        pagination,
        items,
        total,
        columnsToShow,
        filters,
    }
}

export const useItemStore = defineStore('item', {
    state: () => {
        const mappedEntries = Object.entries(filters).map(([key, value]) => {
            return [key, mapModelStore(value as ConfigFilter[], key as keyof typeof filters)]
        })

        const stores = Object.fromEntries(mappedEntries)
        return {
            view: 'table' as 'table' | 'charts',
            stores: { ...stores },
            parentTaxon: "" as string | undefined,
            country: "" as string | undefined,
            showTsvModal: false,
            showChartModal: false,
            currentModel: "",
            isTableLoading: false,
            isTSVLoading: false,
            toast: useToast().init
        }
    },

    actions: {
        resetPagination() {
            this.stores[this.currentModel].pagination = { ...initPagination }
        },
        resetActiveFilter(field: string) {
            const model = this.currentModel
            this.stores[model].searchForm[field] = null
        },
        //incoming model may not correspond to currentModel
        async getStats(model: string, field: string) {
            try {
                //filter out filter, and sort fields
                const filteredEntries = Object.entries(this.stores[model].searchForm).filter(([k, v]) => !Object.keys(staticFilters).includes(k))
                const query = Object.fromEntries(filteredEntries)
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                return data
            } catch (err) {
                const axiosError = err as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            }
        },
        async fetchItems() {
            const model = this.currentModel
            this.stores[model].isLoading = true
            const { searchForm, pagination } = this.stores[model]

            // Build the query params
            const params = { ...searchForm, ...pagination }

            // Conditionally add `countries` and `parentTaxon` if they exist
            if (this.country) {
                params['countries'] = this.country
            }
            if (this.parentTaxon) {
                params['taxon_lineage'] = this.parentTaxon
            }

            try {
                const { data } = await CommonService.getItems(`/${model}`, params)
                this.stores[model].items = [...data.data]
                this.stores[model].total = data.total
            } catch (err) {
                const axiosError = err as AxiosError<ErrorResponseData>
                let message
                if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
                    message = axiosError.response.data.message

                } else {
                    message = axiosError.message
                }
                this.toast({ message: message, color: 'danger' })
            } finally {
                this.stores[model].isLoading = false
            }
        },
        async downloadData(fields: string[], applyFilters: boolean) {
            const model = this.currentModel
            this.isTSVLoading = true
            const downloadRequest = { format: "tsv", fields: [...fields] }
            try {
                const requestData = applyFilters ? { ...this.stores[model].searchForm, ...downloadRequest } : { ...downloadRequest }
                const response = await CommonService.getTsv(`/${model}`, requestData)
                const data = response.data
                const href = URL.createObjectURL(data);

                const filename = `${model}_report.tsv`
                // create "a" HTML element with href to file & click
                const link = document.createElement('a');
                link.href = href;
                link.setAttribute('download', filename); //or any other extension
                document.body.appendChild(link);
                link.click();
                // clean up "a" element & remove ObjectURL
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
            } catch (e) {
                console.log(e)
                const axiosError = e as AxiosError
                this.toast({ message: axiosError.message, color: 'danger' })
            } finally {
                this.isTSVLoading = false
            }
        }

    },
})
