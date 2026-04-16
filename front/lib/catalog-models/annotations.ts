import type { CatalogCardFieldDef, ConfigFilter, ConfigModelWire } from '@/lib/portal/types'

export const annotationAnnotrieveCardFields: CatalogCardFieldDef[] = [
   { key: 'assembly_accession', section: 'identifiers', icon: 'Link' },
   /** Header badge only (Annotrieve); never listed in the card body — see getCatalogCardFieldsForModel. */
   { key: 'metadata.busco.complete', section: 'annotation', icon: 'Gauge' },
   { key: 'metadata.source_file_info.database', section: 'annotation', icon: 'Database' },
   { key: 'metadata.source_file_info.provider', section: 'annotation', icon: 'Cloud' },
   {
      key: 'metadata.features_statistics.gene_category_stats.coding.total_count',
      section: 'stats',
      icon: 'Binary',
   },
   {
      key: 'metadata.features_statistics.gene_category_stats.non_coding.total_count',
      section: 'stats',
      icon: 'Binary',
   },
   {
      key: 'metadata.features_statistics.gene_category_stats.pseudogene.total_count',
      section: 'stats',
      icon: 'Binary',
   },
   { key: 'metadata.features_summary.biotypes', section: 'stats', icon: 'ListTree' },
]

export const annotationPortalCardFields: CatalogCardFieldDef[] = [
   { key: 'assembly_accession', section: 'identifiers', icon: 'Link' },
   { key: 'external', section: 'meta', icon: 'ToggleLeft' },
   { key: 'metadata.assembly_name', section: 'meta', icon: 'Tag' },
   { key: 'metadata.organism_name', section: 'meta', icon: 'Leaf' },
]

export const annotationSortableFields: string[] = [
   'name',
   'assembly_accession',
   'scientific_name',
   'taxid',
   'metadata.organism_name',
]

export const annotationExportFields: string[] = [
   'scientific_name',
   'taxid',
   'name',
   'assembly_accession',
   'metadata.assembly_name',
   'metadata.busco.complete',
   'metadata.source_file_info.database',
   'metadata.source_file_info.provider',
   'metadata.features_statistics.gene_category_stats.coding.total_count',
   'metadata.features_statistics.gene_category_stats.non_coding.total_count',
   'metadata.features_statistics.gene_category_stats.pseudogene.total_count',
   'metadata.features_summary.biotypes',
   'external',
]

export const annotationFilters: ConfigFilter[] = [

   {
      key: 'metadata.busco.busco_lineage',
      type: 'select',
      labelKey: 'catalog.models.annotations.filters.buscoLineage',
   },
   {
      key: 'metadata.source_file_info.database',
      type: 'select',
      labelKey: 'catalog.models.annotations.filters.database',
   },
   {
      key: 'metadata.source_file_info.provider',
      type: 'select',
      labelKey: 'catalog.models.annotations.filters.provider',
   },
]

export const annotationCharts: NonNullable<ConfigModelWire['charts']> = [
   { field: 'external', type: 'pie', size: 2 },
   { field: 'metadata.busco.busco_lineage', type: 'pie', size: 2 },
   { field: 'metadata.source_file_info.database', type: 'bar', size: 2 },
   { field: 'metadata.source_file_info.provider', type: 'bar', size: 2 },
   { field: 'metadata.source_file_info.release_date', type: 'dateline', size: 4 },
]

/** Default card/export fields; runtime card selection uses `getCatalogCardFieldsForModel` (annotrieve vs portal). */
export const annotationsModelWire: ConfigModelWire = {
   label: { en: 'Annotations', cat: 'Anotacions' },
   filters: annotationFilters,
   cardFields: annotationAnnotrieveCardFields,
   sortableFields: annotationSortableFields,
   exportFields: annotationExportFields,
   charts: annotationCharts,
}
