import type { CatalogCardFieldDef, ConfigFilter, ConfigModelWire } from '@/lib/portal/types'

export const biosampleCardFields: CatalogCardFieldDef[] = [
   { key: 'collection_date', section: 'meta', icon: 'Calendar' },
   { key: 'metadata.project name', section: 'meta', icon: 'FolderKanban' },
   { key: 'metadata.broker name', section: 'meta', icon: 'Building2' },
   {
      key: 'metadata.geographic location (country and/or sea)',
      section: 'location',
      icon: 'Globe',
   },
   {
      key: 'metadata.geographic location (region and locality)',
      section: 'location',
      icon: 'MapPin',
   },
   { key: 'metadata.habitat', section: 'location', icon: 'Trees' },
]

export const biosampleSortableFields: string[] = [
   'accession',
   'scientific_name',
   'taxid',
   'collection_date',
   'metadata.collection date',
   'metadata.title',
]

export const biosampleExportFields: string[] = [
   'scientific_name',
   'taxid',
   'accession',
   'collection_date',
   'metadata.project name',
   'metadata.broker name',
   'metadata.geographic location (country and/or sea)',
   'metadata.geographic location (region and locality)',
   'metadata.habitat',
]

export const biosampleFilters: ConfigFilter[] = [
   {
      key: 'metadata.collection date',
      type: 'histogramDate',
      labelKey: 'catalog.models.biosamples.filters.collectionDate',
   },
   {
      key: 'metadata.habitat',
      type: 'select',
      labelKey: 'catalog.models.biosamples.filters.habitat',
   },
   {
      key: 'metadata.project name',
      type: 'select',
      labelKey: 'catalog.models.biosamples.filters.projectName',
   },
   {
      key: 'metadata.broker name',
      type: 'select',
      labelKey: 'catalog.models.biosamples.filters.brokerName',
   },
   {
      key: 'metadata.geographic location (country and/or sea)',
      type: 'select',
      labelKey: 'catalog.models.biosamples.filters.countrySea',
   },
   {
      key: 'metadata.geographic location (region and locality)',
      type: 'select',
      labelKey: 'catalog.models.biosamples.filters.locality',
   },
]

export const biosampleCharts: NonNullable<ConfigModelWire['charts']> = [
   { field: 'metadata.habitat', type: 'bar', size: 3 },
   { field: 'metadata.broker name', type: 'pie', size: 1 },
   { field: 'metadata.geographic location (region and locality)', type: 'bar', size: 4 },
   { field: 'metadata.collection date', type: 'dateline', size: 4 },
]

export const biosamplesModelWire: ConfigModelWire = {
   label: { en: 'BioSamples', cat: 'BioSamples' },
   filters: biosampleFilters,
   cardFields: biosampleCardFields,
   sortableFields: biosampleSortableFields,
   exportFields: biosampleExportFields,
   charts: biosampleCharts,
}
