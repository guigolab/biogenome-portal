import { Filter } from "../../data/types"

export const relatedData: Record<string, any>[] = [
  {
    title: 'uiComponents.relatedDataCard.biosamples',
    icon: 'fa-vial',
    key: 'biosamples',
    color: 'success',
    route: 'biosample',
    columns: ['accession', 'organism_part'],
  },
  {
    title: 'uiComponents.relatedDataCard.local_samples',
    icon: 'fa-vial',
    key: 'local_samples',
    color: 'warning',
    route: 'local_sample',
    columns: ['local_id'],
  },
  {
    title: 'uiComponents.relatedDataCard.experiments',
    icon: 'fa-file-lines',
    color: 'secondary',
    key: 'experiments',
    route: 'experiment',
    columns: ['experiment_accession', 'instrument_platform'],
  },
  {
    title: 'uiComponents.relatedDataCard.assemblies',
    icon: 'fa-dna',
    color: 'primary',
    key: 'assemblies',
    route: 'assembly',
    columns: ['accession', 'assembly_name', 'assembly_level'],
  },
  {
    title: 'uiComponents.relatedDataCard.annotations',
    icon: 'fa-bars-progress',
    color: 'info',
    key: 'annotations',
    route: 'annotation',
    columns: ['name', 'assembly_name'],
  },
]


export const tableFilters: Filter[] = [
  {
    label: 'organismList.filters.searchInput',
    key: 'filter',
    type: 'input',
  },
  {
    label: 'organismList.filters.searchSelect',
    key: 'filter_option',
    type: 'select',
    options: ['taxid', 'common_name', 'scientific_name', 'tolid'],
  }
]
