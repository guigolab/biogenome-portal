import { Filter } from "../../data/types"

export const tabs = [
    {
        icon: 'table_chart'
    },
    {
        icon: 'search'
    },
    {
        icon: 'fa-sitemap'
    }
]

export const tableFilters: Filter[] = [
    {
        label: 'taxonList.filters.searchInput',
        placeholder: 'Search by name or taxid',
        key: 'filter',
        type: 'input',
    },
    {
        label: 'taxonList.filters.sortColumn',
        key: 'sort_column',
        type: 'select',
        options: ['leaves'],
    },
    {
        label: 'taxonList.filters.sortOrder',
        key: 'sort_order',
        type: 'select',
        options: ['asc', 'desc'],
    },
]

export const tableColumns = ['taxon_taxid', 'name', 'rank', 'organisms']

export const relatedTaxonFilters: Filter[] = [
    {
        label: 'relatedTaxon.searchInput.label',
        placeholder: 'relatedTaxon.searchInput.placeholder',
        key: 'taxid',
        type: 'input',
    },
    {
        label: 'relatedTaxon.selectInput',
        key: 'insdc_status',
        type: 'select',
        options: ['Biosample Submitted', 'Reads Submitted', 'Assemblies Submitted'],
    },
]