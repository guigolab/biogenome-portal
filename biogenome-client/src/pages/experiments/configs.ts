import { Filter } from "../../data/types"


export const tableColumns = [
    'experiment_accession',
    'experiment_title',
    'scientific_name',
    'instrument_platform',
    'center_name',
    'first_created',
  ]

  export const tableFilters:Filter[] =  ([
    {
      label: 'experimentList.filters.textInput',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'experimentList.filters.sortColumn',
      key: 'sort_column',
      type: 'select',
      options: ['first_created'],
    },
    {
      label: 'experimentList.filters.sortOrder',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: 'experimentList.filters.date',
      key: 'date',
      type: 'date',
    },
  ])