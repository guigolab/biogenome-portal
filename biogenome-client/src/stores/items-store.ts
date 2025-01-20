import { defineStore } from 'pinia'
import { ErrorResponseData, ConfigFilter, DataModels, Frequency, TaxonNode, ConfigModel } from '../data/types'
import { useToast } from 'vuestic-ui'
import CommonService from '../services/CommonService'
import StatisticsService from '../services/StatisticsService'
import { AxiosError } from 'axios'

export const staticFilters = {
    sort_order: "",
    sort_column: "",
}
const initPagination = {
    offset: 0,
    limit: 10,
}


function mapSearchForm(modelFilters: ConfigFilter[]) {

    const staticEntries = Object.entries({ ...staticFilters })
    const formEntries = modelFilters.map(f => {
        if (f.type === "date") {
            return [[`${f.key}__gte`, null], [`${f.key}__lte`, null]]
        } else if (f.type === "checkbox") {
            return [[`${f.key}__exists`, null]]
        }else if(f.type === "input"){
            return [[`${f.key}__icontains`]]
        }
        return [[f.key, null]]
    }).flat()

    return Object.fromEntries([...formEntries, ...staticEntries])
}

// Factory function to create a store for a specific model
function createModelStore(config: ConfigModel) {
    const { filters } = config
    return {
        searchForm: mapSearchForm(filters ?? []),
        pagination: { ...initPagination },
        items: [],
        total: 0,
    };
}

export const useItemStore = defineStore('item', {
    state: () => {
        return {
            view: 'table' as 'table' | 'charts',
            stores: {} as Record<DataModels, any>,
            frequencies: [] as Frequency[],
            model: 'organisms' as DataModels,
            searchForm: null as Record<string, any> | null,
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
        initStore(model: DataModels, filters: ConfigFilter[]) {
            this.searchForm = { ...mapSearchForm(filters) }
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
                    .filter(([key, value]) => !staticFilters.hasOwnProperty(key) && value !== null && value !== "");
                return Object.fromEntries(searchFormEntries);
            }else{
                return {}
            }

        },
        //resets only the related filters (skips taxon_lineage)
        resetFilters(){
            if(this.searchForm){
                const resettedForm = Object.fromEntries(Object.entries(this.searchForm).filter(([k,v]) => k !== 'taxon_lineage').map(([k,v]) => [k, null]))
                this.searchForm = {...this.searchForm, ...resettedForm}
            }
        },
        resetPagination() {
            // this.initStore(model);  // Ensure store exists
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

        downloadFile(model: DataModels, data: any, format:string) {
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

        async handleQuery() {
            this.resetPagination()
            this.fetchItems()
        },
        async getFieldFrequencies(model: DataModels, field: string, ignoreQuery:boolean) {
            try {
                const query = ignoreQuery ? {} : this.buildQuery()
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                return data
            } catch (err) {
                this.catchError(err)
            }
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
        async fetchItems() {
            // this.initStore(model);  // Ensure store exists

            this.isTableLoading = true
            const { searchForm, pagination } = this

            // Build the query params
            const params = { ...searchForm, ...pagination }
            try {
                const { data } = await CommonService.getItems(this.model, params)
                this.items = [...data.data]
                this.total = data.total
            } catch (err) {
                this.catchError(err)
            } finally {
                this.isTableLoading = false
            }
        },
        async downloadData(model: DataModels, fields: string[], format:string) {
            // this.initStore(model);  // Ensure store exists

            this.isTSVLoading = true
            const downloadRequest = { format, fields: [...fields] }
            const query = this.buildQuery()
            
            try {
                const requestData = { ...query, ...downloadRequest, ...{offset: 0, limit: this.total+1} } 
                const { data } = await CommonService.getTsv(model, requestData)
                this.downloadFile(model, data, format)

            } catch (e) {
                this.catchError(e)
            } finally {
                this.isTSVLoading = false
            }
        }

    },
})
