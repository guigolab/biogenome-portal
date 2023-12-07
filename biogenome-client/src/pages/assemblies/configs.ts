import { Filter } from "../../data/types"

export const tableFilters: Filter[] = [
    {
        label: 'assemblyList.filters.searchInput',
        key: 'filter',
        type: 'input',
    },
    {
        label: 'assemblyList.filters.searchSelect',
        key: 'filter_option',
        type: 'select',
        options: ['taxid', 'assembly_name', 'scientific_name'],
    },
    {
        label: 'assemblyList.filters.assemblyLevel',
        key: 'assembly_level',
        type: 'select',
        options: ['Chromosome', 'Complete Genome', 'Contig', 'Scaffold'],
    },
    {
        label: 'assemblyList.filters.sortColumn',
        key: 'sort_column',
        type: 'select',
        options: ['contig_n50', 'size', 'submission_date'],
    },
    {
        label: 'assemblyList.filters.sortOrder',
        key: 'sort_order',
        type: 'select',
        options: ['asc', 'desc'],
    },
    {
        label: 'assemblyList.filters.date',
        key: 'date',
        type: 'date',
    },
    {
        label: 'assemblyList.filters.blobtoolkit',
        key: 'blobtoolkit',
        type: 'checkbox',
    },
]
export const tableColumns = [
    'assembly_name',
    'scientific_name',
    'assembly_level',
    'contig_n50',
    'submitter',
    'submission_date',
    'size',
    'chromosomes',
]

export const tabs = [
    'uiComponents.metadata',
    'assemblyDetails.genomeBrowser',
]