import { Filter } from "../../data/types"

export const tableFilters: Filter[] = [
    {
        label: 'annotationList.filters.textInput',
        key: 'filter',
        type: 'input',
    },
    {
        label: 'annotationList.filters.filterBy',
        key: 'filter_option',
        type: 'select',
        options: ['name', 'assembly_name', 'scientific_name'],
    },
    {
        label: 'annotationList.filters.sortColumn',
        key: 'sort_column',
        type: 'select',
        options: ['created'],
    },
    {
        label: 'annotationList.filters.sortOrder',
        key: 'sort_order',
        type: 'select',
        options: ['asc', 'desc'],
    },
    {
        label: 'annotationList.filters.date',
        key: 'date',
        type: 'date',
    },
]


export const tableColumns = ['annotation_name', 'related_assembly', 'scientific_name', 'taxid', 'created', 'gff_gz_location', 'tab_index_location']
