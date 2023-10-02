import { Filter } from "../../data/types"

export const tableFilters: Filter[] = [
    {
      label: 'statusList.filters.searchInput',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'statusList.filters.filterBy',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
    },
    {
      label: 'statusList.filters.goatStatus',
      key: 'goat_status',
      type: 'select',
      options: [
        'Sample Collected',
        'Sample Acquired',
        'Data Generation',
        'In Assembly',
        'INSDC Submitted',
        'Publication Available',
      ],
    },
    {
      label: 'statusList.filters.targetListStatus',
      key: 'target_list_status',
      type: 'select',
      options: ['long_list', 'family_representative', 'other_priority'],
    },
  ]

  export const tableColumns = ['scientific_name','insdc_common_name', 'tolid_prefix', 'goat_status', 'target_list_status']
