import { Filter } from "../../data/types"

export const tableFilters: Filter[] = [
    {
        label: 'biosampleList.filters.searchInput',
        key: 'filter',
        type: 'input',
    },
    {
        label: 'biosampleList.filters.searchSelect',
        key: 'filter_option',
        type: 'select',
        options: ['taxid', 'gal', 'scientific_name', 'habitat'],
    },
    {
        label: 'biosampleList.filters.sortColumn',
        key: 'sort_column',
        type: 'select',
        options: ['collection_date'],
    },
    {
        label: 'biosampleList.filters.sortOrder',
        key: 'sort_order',
        type: 'select',
        options: ['asc', 'desc'],
    },
    {
        label: 'biosampleList.filters.date',
        key: 'date',
        type: 'date',
    },
]

export const tableColumns = ['accession', 'scientific_name', 'collection_date', 'gal', 'habitat', 'organism_part']

export const relatedData:Record<string,any>[] = [
    {
      title: 'uiComponents.relatedDataCard.biosamples',
      icon: 'hubs',
      key: 'sub_samples',
      route: 'biosample',
      columns: ['accession', 'organism_part'],
    },
    {
      title: 'uiComponents.relatedDataCard.experiments',
      icon: 'widgets',
      key: 'experiments',
      route: 'experiment',
      columns: ['experiment_accession', 'instrument_platform'],
    },
    {
      title: 'uiComponents.relatedDataCard.assemblies',
      icon: 'library_books',
      key: 'assemblies',
      route: 'assembly',
      columns: ['accession', 'assembly_name', 'assembly_level'],
    },
  ]