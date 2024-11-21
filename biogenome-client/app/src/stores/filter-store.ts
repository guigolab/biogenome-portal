import { defineStore } from 'pinia'
import { ConfigFilter, DataModels, Filter } from '../data/types'
import { useConfig } from '../composable/useConfig'

function mapSearchForm(modelFilters: ConfigFilter[]) {

    const formEntries = modelFilters.map(f => {
        if (f.type === "date") {
            return [[`${f.key}__gte`, null], [`${f.key}__lte`, null]]
        } else if (f.type === "checkbox") {
            return [[`${f.key}__exists`, null]]
        }
        return [[f.key, null]]
    }).flat()

    return Object.fromEntries([...formEntries])
}

// Factory function to create a store for a specific model
function createFormStore(model: DataModels) {
    const { filters } = useConfig(model);
    return {
        model,
        searchForm: mapSearchForm(filters.value),
        filters: filters.value,
    };
}

export const useFilterStore = defineStore('item', {
    state: () => {
        return {
            searchForms: [] as { model: DataModels, searchForm: Record<string, any>, filters: Filter[] }[],
            showFilters: false,
        }
    },

    actions: {
        getForm(m: DataModels) {
            const index = this.searchForms.findIndex(({ model }) => m === model)
            //store old form if exists
            if (index === -1) {
                return createFormStore(m)
            } else {
                return this.searchForms[index]
            }
        },
        storeForm(m: DataModels, searchForm: Record<string, any>, filters: Filter[]) {
            const index = this.searchForms.findIndex(({ model }) => m === model)
            //store old form if exists
            const obj = { model: m, searchForm, filters }
            if (index === -1) {
                this.searchForms.push(obj)
            } else {
                this.searchForms[index] = obj
            }
        },
    },
})
