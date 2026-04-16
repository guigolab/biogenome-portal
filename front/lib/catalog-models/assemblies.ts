import type { CatalogCardFieldDef, ConfigFilter, ConfigModelWire } from '@/lib/portal/types'

export const assemblyCardFields: CatalogCardFieldDef[] = [
   { key: 'assembly_name', section: 'identifiers', icon: 'Tag' },
   { key: 'metadata.assembly_info.assembly_level', section: 'meta', icon: 'Layers' },
   { key: 'metadata.assembly_info.release_date', section: 'meta', icon: 'Calendar' },
   { key: 'metadata.assembly_info.sequencing_tech', section: 'meta', icon: 'Dna' },
   { key: 'metadata.assembly_stats.gc_percent', section: 'stats', icon: 'Percent' },
   { key: 'metadata.assembly_stats.number_of_component_sequences', section: 'stats', icon: 'Hash' },
]

export const assemblySortableFields: string[] = [
   'accession',
   'assembly_name',
   'scientific_name',
   'taxid',
   'metadata.assembly_info.release_date',
   'metadata.assembly_stats.contig_n50',
   'metadata.assembly_stats.scaffold_n50',
]

export const assemblyExportFields: string[] = [
   'scientific_name',
   'taxid',
   'accession',
   'assembly_name',
   'metadata.assembly_info.assembly_level',
   'metadata.assembly_info.release_date',
   'metadata.assembly_info.sequencing_tech',
   'metadata.assembly_stats.gc_percent',
   'metadata.assembly_stats.number_of_component_sequences',
]

export const assemblyFilters: ConfigFilter[] = [
   {
      key: 'metadata.assembly_info.release_date',
      type: 'histogramDate',
      labelKey: 'catalog.models.assemblies.filters.releaseDate',
   },
   {
      key: 'metadata.assembly_info.refseq_category',
      type: 'referenceGenome',
      labelKey: 'catalog.models.assemblies.filters.referenceGenome',
      checkboxLabelKey: 'catalog.models.assemblies.filters.referenceGenomeCheckbox',
   },
   {
      key: 'assembly_n50_pair',
      type: 'thresholdPair',
      labelKey: 'catalog.models.assemblies.filters.assemblyN50Thresholds',
      thresholdPair: [
         {
            key: 'metadata.assembly_stats.contig_n50',
            threshold: 1_000_000,
            labelKey: 'catalog.models.assemblies.filters.contigN50Threshold',
         },
         {
            key: 'metadata.assembly_stats.scaffold_n50',
            threshold: 10_000_000,
            labelKey: 'catalog.models.assemblies.filters.scaffoldN50Threshold',
         },
      ],
   },
   {
      key: 'metadata.assembly_info.sequencing_tech',
      type: 'select',
      labelKey: 'catalog.models.assemblies.filters.sequencingTech',
   },
   {
      key: 'metadata.assembly_info.assembly_level',
      type: 'select',
      labelKey: 'catalog.models.assemblies.filters.assemblyLevel',
   },
   {
      key: 'metadata.assembly_info.assembly_type',
      type: 'select',
      labelKey: 'catalog.models.assemblies.filters.assemblyType',
   },
   {
      key: 'metadata.assembly_info.assembly_status',
      type: 'select',
      labelKey: 'catalog.models.assemblies.filters.assemblyStatus',
   },
]

export const assemblyCharts: NonNullable<ConfigModelWire['charts']> = [
   { field: 'metadata.assembly_info.assembly_level', type: 'pie', size: 2 },
   { field: 'metadata.assembly_info.assembly_type', type: 'pie', size: 2 },
   {
      field: 'scatter.assembly.contig_n50_scaffold_n50',
      type: 'scatter',
      size: 4,
      xField: 'metadata.assembly_stats.contig_n50',
      yField: 'metadata.assembly_stats.scaffold_n50',
      colorField: 'metadata.assembly_info.assembly_level',
   },
   { field: 'metadata.assembly_info.release_date', type: 'dateline', size: 4 },
]

export const assembliesModelWire: ConfigModelWire = {
   label: { en: 'Assemblies', cat: 'Assemblatges' },
   filters: assemblyFilters,
   cardFields: assemblyCardFields,
   sortableFields: assemblySortableFields,
   exportFields: assemblyExportFields,
   charts: assemblyCharts,
}
