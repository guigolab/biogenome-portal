import { defineStore } from 'pinia'
import { ErrorResponseData, ConfigFilter, DataModels, Frequency, TaxonNode } from '../data/types'
import { useToast } from 'vuestic-ui'
import CommonService from '../services/clients/CommonService'
import StatisticsService from '../services/clients/StatisticsService'
import { AxiosError } from 'axios'
import { useConfig } from '../composable/useConfig'
import general from '../../configs/general.json';

export const staticFilters = {
    filter: "",
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
        }
        return [[f.key, null]]
    }).flat()

    return Object.fromEntries([...formEntries, ...staticEntries])
}

// Factory function to create a store for a specific model
function createModelStore(model: DataModels) {
    const { columns, filters } = useConfig(model);

    return {
        searchForm: mapSearchForm(filters.value),
        pagination: { ...initPagination },
        items: [],
        total: 0,
        frequencies: [] as Record<string, Record<string, number>>[],
        columnsToShow: columns.value,
    };
}

export const useItemStore = defineStore('item', {
    state: () => {

        return {
            view: 'table' as 'table' | 'charts',
            stores: {} as Record<DataModels, any>,
            parentTaxon: null as TaxonNode | null,
            country: null as { name: string, id: string, rank: string } | null,
            frequencies: [] as Frequency[],
            showTsvModal: false,
            showChartModal: false,
            isTableLoading: false,
            isTSVLoading: false,
            showFilters: false,
            toast: useToast().init
        }
    },

    actions: {
        initStore(model: DataModels) {
            if (!this.stores[model]) {
                this.stores[model] = createModelStore(model);
            }
        },
        getSearchForm(model: DataModels) {
            this.initStore(model);  // Ensure store exists
            return this.stores[model]?.searchForm ?? null;
        },
        initSearchForm(model: DataModels) {
            this.initStore(model);  // Ensure store exists
            const { filters } = useConfig(model)
            this.stores[model].searchForm = mapSearchForm(filters.value)
        },
        setSearchFormField(model: DataModels, key: string, value: any) {
            this.initStore(model);  // Ensure store exists
            if (this.stores[model]) {
                this.stores[model].searchForm[key] = value;
            }
        },
        buildQuery(model: DataModels) {
            const searchFormEntries = Object.entries(this.stores[model].searchForm)
                .filter(([key, value]) => !staticFilters.hasOwnProperty(key) && value !== null && value !== "");

            if (this.country && model === 'organisms') searchFormEntries.push(['countries', this.country.id]);

            return Object.fromEntries(searchFormEntries);
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
            this.toast({ message: message, color: 'danger' })
        },

        downloadFile(model: DataModels, data: any) {
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
        },
        async fetchFrequenciesForSelectFields(model: DataModels) {
            const { filters } = useConfig(model)
            const selectFields = filters.value
                .filter((field: ConfigFilter) => field.type === 'select')
                .map((field: ConfigFilter) => field.key);
            for (const field of selectFields) {
                await this.getFrequencies(model, model, field, false);
            }
        },
        async handleQuery(model: DataModels) {
            if (model === 'organisms' && general.maps && general.maps.includes('countries')) {
                //handle countries frequencies
                await this.getFrequencies('organisms', 'organisms', 'countries', false)
            }
            this.resetPagination(model)
            this.fetchItems(model)
            this.fetchFrequenciesForSelectFields(model)
        },
        //incoming model may not correspond to currentModel
        async getFrequencies(source: string, model: DataModels, field: string, ignoreQuery: boolean) {
            this.initStore(model);  // Ensure store exists
            try {

                const query = ignoreQuery ? {} : this.buildQuery(model)
                if (this.parentTaxon) query.taxon_lineage = this.parentTaxon.taxid
                const freqs = this.frequencies
                const { data } = await StatisticsService.getModelFieldStats(model, field, query)
                const newFreq: Frequency = { source, model, field, data }
                const existingIndex = freqs.findIndex(
                    f => f.source === source && f.model === model && f.field === field
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
            this.initStore(model);  // Ensure store exists

            this.isTableLoading = true
            const { searchForm, pagination } = this.stores[model]

            // Build the query params
            const params = { ...searchForm, ...pagination }

            // Conditionally add `countries` and `parentTaxon` if they exist
            if (this.country && model === 'organisms') {
                params['countries'] = this.country.id
            }
            if (this.parentTaxon) {
                params['taxon_lineage'] = this.parentTaxon.taxid
            }
            try {
                const { data } = await CommonService.getItems(`/${model}`, params)
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
                const requestData = applyFilters ? { ...this.stores[model].searchForm, ...downloadRequest } : { ...downloadRequest }
                if (this.country) {
                    requestData['countries'] = this.country
                }
                if (this.parentTaxon) {
                    requestData['taxon_lineage'] = this.parentTaxon
                }
                const { data } = await CommonService.getTsv(`/${model}`, requestData)
                this.downloadFile(model, data)

            } catch (e) {
                this.catchError(e)
            } finally {
                this.isTSVLoading = false
            }
        }

    },
})
