import { defineStore } from 'pinia'
import { ErrorResponseData, ConfigFilter, ConfigType } from '../data/types'
import { useToast } from 'vuestic-ui'
import CommonService from '../services/clients/CommonService'
import StatisticsService from '../services/clients/StatisticsService'
import filters from '../../configs/filters.json'
import columns from '../../configs/columns.json'
import { AxiosError } from 'axios'


const columnsConf = columns as ConfigType
const filtersConf = filters as ConfigType

const MODELS = ['organisms', 'biosamples', 'assemblies', 'experiments', 'annotations', 'local_samples']

const staticFilters = {
    filter: "",
    sort_order: "",
    sort_column: "",
}
const initPagination = {
    offset: 0,
    limit: 10,
}

function mapSearchForm(modelFilters: ConfigFilter[]) {

    const staticEntries = Object.entries(staticFilters)
    const formEntries = modelFilters.map(f => {
        if (f.type === "date") {
            return [[`${f.key}__gte`, null], [`${f.key}__lte`, null]]
        } else if (f.type === "checkbox") {
            return [[`${f.key}__exists`, null]]
        }
        return [[f.key, null]]
    }).flat()

    return Object.fromEntries([...formEntries, ...staticEntries])
}


//add configs in each store to manage everything from here
function mapModelStore(m: string) {

    const columnsToShow = m in columnsConf ? columnsConf[m] : []

    const modelFilters = m in filtersConf ? filtersConf[m] : []

    const searchForm = mapSearchForm(modelFilters)

    const pagination = { ...initPagination }
    const items: Record<string, any>[] = []
    const total = 0
    return {
        searchForm,
        pagination,
        items,
        total,
        columnsToShow,
        filters,
    }
}

export const useItemStore = defineStore('item', {
    state: () => {

        const mappedStores = MODELS.map(m => [m, mapModelStore(m)])

        const stores = Object.fromEntries(mappedStores)
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
                if (this.country) query['countries'] = this.country
                if (this.parentTaxon) query['taxon_lineage'] = this.parentTaxon

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
                if (this.country) {
                    requestData['countries'] = this.country
                }
                if (this.parentTaxon) {
                    requestData['taxon_lineage'] = this.parentTaxon
                }

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