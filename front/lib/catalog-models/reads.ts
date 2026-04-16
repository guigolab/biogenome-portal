import type { CatalogCardFieldDef, ConfigFilter, ConfigModelWire } from '@/lib/portal/types'

export const readsCardFields: CatalogCardFieldDef[] = [
   { key: 'experiment_accession', section: 'identifiers', icon: 'FlaskConical' },
   { key: 'sample_accession', section: 'identifiers', icon: 'TestTube' },
   { key: 'metadata.library_strategy', section: 'meta', icon: 'Library' },
   { key: 'metadata.library_source', section: 'meta', icon: 'Database' },
   { key: 'metadata.first_public', section: 'meta', icon: 'Calendar' },
   { key: 'metadata.broker_name', section: 'meta', icon: 'Building2' },
   { key: 'metadata.library_layout', section: 'meta', icon: 'LayoutGrid' },
]

export const readsSortableFields: string[] = [
   'run_accession',
   'experiment_accession',
   'sample_accession',
   'scientific_name',
   'taxid',
   'metadata.first_public',
   'metadata.read_count',
]

export const readsExportFields: string[] = [
   'scientific_name',
   'taxid',
   'run_accession',
   'experiment_accession',
   'sample_accession',
   'metadata.library_strategy',
   'metadata.library_source',
   'metadata.first_public',
   'metadata.broker_name',
   'metadata.library_layout',
]

export const readsFilters: ConfigFilter[] = [
   {
      key: 'metadata.first_public',
      type: 'histogramDate',
      labelKey: 'catalog.models.reads.filters.firstPublic',
   },
   {
      key: 'experiment_accession',
      type: 'experimentList',
      labelKey: 'catalog.models.reads.filters.experiment',
   },
   {
      key: 'metadata.library_strategy',
      type: 'select',
      labelKey: 'catalog.models.reads.filters.libraryStrategy',
   },
   {
      key: 'metadata.library_source',
      type: 'select',
      labelKey: 'catalog.models.reads.filters.librarySource',
   },
   {
      key: 'metadata.library_layout',
      type: 'select',
      labelKey: 'catalog.models.reads.filters.libraryLayout',
   },
   {
      key: 'metadata.broker_name',
      type: 'select',
      labelKey: 'catalog.models.reads.filters.brokerName',
   },
]

export const readsCharts: NonNullable<ConfigModelWire['charts']> = [
   { field: 'metadata.library_strategy', type: 'pie', size: 2 },
   { field: 'metadata.library_source', type: 'pie', size: 2 },
   { field: 'metadata.library_layout', type: 'bar', size: 2 },
   { field: 'metadata.broker_name', type: 'bar', size: 2 },
   { field: 'metadata.first_public', type: 'dateline', size: 4 },
]

export const readsModelWire: ConfigModelWire = {
   label: { en: 'Read runs', cat: 'Execucions de lectura' },
   filters: readsFilters,
   cardFields: readsCardFields,
   sortableFields: readsSortableFields,
   exportFields: readsExportFields,
   charts: readsCharts,
}
