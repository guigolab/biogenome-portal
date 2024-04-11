import { Filter } from "../../data/types"

export const tableFilters: Filter[] = [
    {
      label: 'localSampleList.filters.searchInput',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'localSampleList.filters.sortColumn',
      key: 'sort_column',
      type: 'select',
      options: ['created'],
    },
    {
      label: 'localSampleList.filters.sortOrder',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: 'localSampleList.filters.date',
      key: 'date',
      type: 'date',
    },
  ] 

export const tableColumns = ['local_id', 'scientific_name', 'taxid', 'created']
