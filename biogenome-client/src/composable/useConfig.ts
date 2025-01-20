import columnsConfig from '../../configs/columns.json'
import filtersConfig from '../../configs/filters.json'
import chartsConfig from '../../configs/charts.json'
import pagesConfig from '../../configs/pages.json'
import { DataModels, Filter, InfoBlock } from '../data/types'
import { computed } from 'vue'

function capitalizeFirstChar(str: string) {
    if (!str) return ''; // Handle empty strings
    return str.charAt(0).toUpperCase() + str.slice(1);
}

type Columns = keyof typeof columnsConfig;
type Charts = keyof typeof chartsConfig;
type Pages = keyof typeof pagesConfig;
type Filters = keyof typeof filtersConfig;

export function useConfig(model: DataModels | 'dashboard') {
    const page = computed(() => {
        const m = model as Pages
        const { title = capitalizeFirstChar(model), description = "" } = m in pagesConfig ? pagesConfig[m] : {};
        return { title, description };
    });

    const charts = computed(() => {
        const m = model as Charts
        return m in chartsConfig ? chartsConfig[m] as InfoBlock[] : []
    })
    const columns = computed(() => {
        const m = model as Columns
        return m in columnsConfig ? columnsConfig[m] as string[] : []
    })

    const filters = computed(() => {
        const m = model as Filters
        return m in filtersConfig ? filtersConfig[m] as Filter[] : []
    })
    return { page, charts, filters, columns }
}