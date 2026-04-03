/**
 * Fixed INSDC-backed catalog models — merged under portal.json `models`.
 */
import type { ConfigModelWire, DataModels } from './types'

export const INSDC_CATALOG_MODEL_KEYS: readonly DataModels[] = [
   'assemblies',
   'biosamples',
   'reads',
   'annotations',
]

export const defaultInsdcCatalogModels: Pick<
   Record<DataModels, ConfigModelWire>,
   'assemblies' | 'biosamples' | 'reads' | 'annotations'
> = {
   assemblies: {
      label: { en: 'Assemblies', cat: 'Assemblatges' },
      description: {
         en: 'Assemblies retrieved from NCBI under CBP (PRJEB49670)',
         cat: "Assemblatges recuperats de NCBI sota la CBP (PRJEB49670)",
      },
      filters: [
         { key: 'metadata.assembly_info.release_date', type: 'date' },
         { key: 'blobtoolkit_id', type: 'checkbox' },
         { key: 'metadata.assembly_info.assembly_level', type: 'select' },
         { key: 'metadata.assembly_info.assembly_type', type: 'select' },
         { key: 'metadata.assembly_info.assembly_status', type: 'select' },
      ],
      columns: [
         'assembly_name',
         'scientific_name',
         'blobtoolkit_id',
         'metadata.assembly_info.assembly_level',
         'metadata.assembly_info.assembly_type',
         'metadata.assembly_info.assembly_status',
         'metadata.assembly_info.release_date',
         'metadata.assembly_stats.contig_n50',
         'metadata.assembly_stats.scaffold_n50',
      ],
      charts: [
         { field: 'metadata.assembly_info.assembly_level', type: 'bar', size: 2 },
         { field: 'metadata.assembly_info.assembly_type', type: 'pie', size: 2 },
         { field: 'metadata.assembly_info.assembly_status', type: 'pie', size: 2 },
         { field: 'metadata.assembly_info.release_date', type: 'dateline', size: 4 },
      ],
   },
   biosamples: {
      label: { en: 'BioSamples', cat: 'BioSamples' },
      description: {
         en: 'These BioSamples include those associated with the CBP project, as well as those retrieved from assemblies and experiments metadata, all imported via a cronjob.',
         cat: "Aquestes BioSamples inclouen les associades amb el projecte CBP, així com les recuperades de les metadades d'assemblatges i experiments, totes importades mitjançant un cronjob.",
      },
      filters: [
         { key: 'metadata.collection_date', type: 'date' },
         { key: 'metadata.lifestage', type: 'select' },
         { key: 'metadata.sex', type: 'select' },
      ],
      columns: [
         'accession',
         'scientific_name',
         'metadata.collection_date',
         'metadata.sex',
         'metadata.lifestage',
         'metadata.tissue',
      ],
      charts: [
         { field: 'metadata.sex', type: 'bar', size: 2 },
         { field: 'metadata.lifestage', type: 'bar', size: 2 },
      ],
   },
   reads: {
      label: { en: 'Read runs', cat: 'Execucions de lectura' },
      description: {
         en: 'Sequencing read runs imported from INSDC under the CBP',
         cat: "Execucions de seqüenciació importades de l'INSDC sota l'accés al projecte CBP",
      },
      filters: [
         { key: 'metadata.first_public', type: 'date' },
         { key: 'metadata.library_selection', type: 'select' },
         { key: 'metadata.library_strategy', type: 'select' },
      ],
      columns: [
         'run_accession',
         'experiment_accession',
         'scientific_name',
         'metadata.experiment_title',
         'metadata.sample_accession',
         'metadata.library_strategy',
         'metadata.library_selection',
         'metadata.first_public',
      ],
      charts: [
         { field: 'metadata.library_strategy', type: 'pie', size: 2 },
         { field: 'metadata.library_selection', type: 'pie', size: 2 },
         { field: 'metadata.first_public', type: 'dateline', size: 4 },
      ],
   },
   annotations: {
      label: { en: 'Annotations', cat: 'Anotacions' },
      description: {
         en: 'Genome annotations linked to assemblies',
         cat: 'Anotacions del genoma enllaçades a assemblatges',
      },
      filters: [],
      columns: ['name', 'assembly_accession'],
      charts: [],
   },
}
