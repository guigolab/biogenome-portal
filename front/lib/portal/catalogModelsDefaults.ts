/**
 * Default catalog filters & charts — aligned with `front/lib/catalog-metadata/schemaConstants.ts`.
 *
 * - **Assemblies**: NCBI DataSets blob → `metadata.assembly_info.*`, `metadata.source_database`, etc.
 * - **Reads**: ENA filereport scalars → `metadata.<key>` for each key in `READ_RUN_METADATA_KEY_ORDER`.
 * - **BioSamples**: document `collection_date` + flat ENA `metadata.*` (checklist, INSDC, traits).
 * - **Annotations**: document `external` + Annotrieve row keys in `ANNOTATION_METADATA_TOP_LEVEL_ORDER`.
 */
import type { ConfigModelWire, DataModels } from './types'

/** NCBI/ENA-derived catalog models: layout always comes from code (portal.json cannot change filters/columns/charts). */
export const INSDC_CODE_ONLY_CATALOG_MODEL_KEYS = ['assemblies', 'biosamples', 'reads'] as const
export type InsdcCodeOnlyCatalogDataModel = (typeof INSDC_CODE_ONLY_CATALOG_MODEL_KEYS)[number]

/** Only `models.local_samples` in portal.json may override catalog layout; other models are code-defined. */
export const PORTAL_OVERRIDABLE_CATALOG_MODEL_KEYS: readonly DataModels[] = ['local_samples']

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
         {
            key: 'metadata.assembly_info.release_date',
            type: 'date',
            label: { en: 'Release date', cat: 'Data de publicació' },
         },
         { key: 'blobtoolkit_id', type: 'checkbox', label: { en: 'BlobToolKit', cat: 'BlobToolKit' } },
         {
            key: 'metadata.source_database',
            type: 'select',
            label: { en: 'Source database', cat: 'Base de dades font' },
         },
         {
            key: 'metadata.assembly_info.assembly_level',
            type: 'select',
            label: { en: 'Assembly level', cat: "Nivell de l'assemblatge" },
         },
         {
            key: 'metadata.assembly_info.assembly_type',
            type: 'select',
            label: { en: 'Assembly type', cat: "Tipus d'assemblatge" },
         },
         {
            key: 'metadata.assembly_info.assembly_status',
            type: 'select',
            label: { en: 'Assembly status', cat: "Estat de l'assemblatge" },
         },
      ],
      columns: [
         'accession',
         'assembly_name',
         'blobtoolkit_id',
         'metadata.source_database',
         'metadata.assembly_info.assembly_level',
         'metadata.assembly_info.assembly_type',
         'metadata.assembly_info.assembly_status',
         'metadata.assembly_info.release_date',
         'metadata.assembly_info.sequencing_tech',
         'metadata.assembly_stats.contig_n50',
         'metadata.assembly_stats.scaffold_n50',
         'metadata.assembly_stats.total_sequence_length',
      ],
      charts: [
         { field: 'metadata.assembly_info.assembly_level', type: 'bar', size: 2 },
         { field: 'metadata.assembly_info.assembly_type', type: 'bar', size: 2 },
         { field: 'metadata.assembly_info.assembly_status', type: 'pie', size: 2 },
         { field: 'metadata.source_database', type: 'pie', size: 2 },
         { field: 'metadata.assembly_info.sequencing_tech', type: 'bar', size: 2 },
         { field: 'metadata.assembly_info.release_date', type: 'dateline', size: 4 },
      ],
   },
   biosamples: {
      label: { en: 'BioSamples', cat: 'BioSamples' },
      description: {
         en: 'BioSamples from the CBP project and linked INSDC imports (ENA checklist attributes in metadata).',
         cat: "BioSamples del projecte CBP i importacions INSDC enllaçades (atributs ENA a les metadades).",
      },
      filters: [
         {
            key: 'collection_date',
            type: 'date',
            label: { en: 'Collection date (document)', cat: 'Data de recollida (document)' },
         },
         {
            key: 'metadata.ENA-CHECKLIST',
            type: 'select',
            label: { en: 'ENA checklist', cat: 'Llista ENA' },
         },
         {
            key: 'metadata.INSDC status',
            type: 'select',
            label: { en: 'INSDC status', cat: 'Estat INSDC' },
         },
         {
            key: 'metadata.sex',
            type: 'select',
            label: { en: 'Sex', cat: 'Sexe' },
         },
         {
            key: 'metadata.lifestage',
            type: 'select',
            label: { en: 'Life stage', cat: 'Estadi vital' },
         },
         {
            key: 'metadata.habitat',
            type: 'select',
            label: { en: 'Habitat', cat: 'Hàbitat' },
         },
         {
            key: 'metadata.project name',
            type: 'select',
            label: { en: 'Project name', cat: 'Nom del projecte' },
         },
         {
            key: 'metadata.broker name',
            type: 'select',
            label: { en: 'Broker name', cat: 'Nom del broker' },
         },
      ],
      columns: [
         'accession',
         'collection_date',
         'metadata.ENA-CHECKLIST',
         'metadata.INSDC status',
         'metadata.project name',
         'metadata.broker name',
         'metadata.tolid',
         'metadata.geographic location (country and/or sea)',
         'metadata.geographic location (region and locality)',
         'metadata.habitat',
         'metadata.lifestage',
         'metadata.sex',
         'metadata.title',
      ],
      charts: [
         { field: 'metadata.ENA-CHECKLIST', type: 'pie', size: 2 },
         { field: 'metadata.INSDC status', type: 'pie', size: 2 },
         { field: 'metadata.sex', type: 'bar', size: 2 },
         { field: 'metadata.lifestage', type: 'bar', size: 2 },
         { field: 'metadata.broker name', type: 'bar', size: 2 },
         { field: 'collection_date', type: 'dateline', size: 4 },
      ],
   },
   reads: {
      label: { en: 'Read runs', cat: 'Execucions de lectura' },
      description: {
         en: 'Sequencing read runs imported from INSDC (ENA filereport metadata; keys match READ_RUN_METADATA_KEY_ORDER).',
         cat: "Execucions de seqüenciació importades de l'INSDC (metadades ENA; claus segons READ_RUN_METADATA_KEY_ORDER).",
      },
      filters: [
         {
            key: 'metadata.first_public',
            type: 'date',
            label: { en: 'First public', cat: 'Primera publicació' },
         },
         {
            key: 'metadata.library_strategy',
            type: 'select',
            label: { en: 'Library strategy', cat: 'Estratègia de biblioteca' },
         },
         {
            key: 'metadata.library_source',
            type: 'select',
            label: { en: 'Library source', cat: 'Font de biblioteca' },
         },
         {
            key: 'metadata.library_selection',
            type: 'select',
            label: { en: 'Library selection', cat: 'Selecció de biblioteca' },
         },
         {
            key: 'metadata.library_layout',
            type: 'select',
            label: { en: 'Library layout', cat: 'Disposició de biblioteca' },
         },
         {
            key: 'metadata.instrument_platform',
            type: 'select',
            label: { en: 'Instrument platform', cat: 'Plataforma' },
         },
         {
            key: 'metadata.instrument_model',
            type: 'select',
            label: { en: 'Instrument model', cat: "Model d'instrument" },
         },
         {
            key: 'metadata.broker_name',
            type: 'select',
            label: { en: 'Broker name (ENA)', cat: 'Broker (ENA)' },
         },
         {
            key: 'metadata.center_name',
            type: 'select',
            label: { en: 'Center name (ENA)', cat: 'Centre (ENA)' },
         },
      ],
      columns: [
         'run_accession',
         'experiment_accession',
         'sample_accession',
         'metadata.experiment_title',
         'metadata.instrument_platform',
         'metadata.instrument_model',
         'metadata.library_strategy',
         'metadata.library_source',
         'metadata.library_layout',
         'metadata.library_selection',
         'metadata.broker_name',
         'metadata.center_name',
         'metadata.read_count',
         'metadata.base_count',
         'metadata.first_public',
      ],
      charts: [
         { field: 'metadata.library_strategy', type: 'pie', size: 2 },
         { field: 'metadata.library_source', type: 'pie', size: 2 },
         { field: 'metadata.library_layout', type: 'bar', size: 2 },
         { field: 'metadata.instrument_platform', type: 'bar', size: 2 },
         { field: 'metadata.broker_name', type: 'bar', size: 2 },
         { field: 'metadata.first_public', type: 'dateline', size: 4 },
      ],
   },
   annotations: {
      label: { en: 'Annotations', cat: 'Anotacions' },
      description: {
         en: 'Genome annotations: document fields plus Annotrieve payload keys under metadata (see ANNOTATION_METADATA_TOP_LEVEL_ORDER).',
         cat: "Anotacions de genoma: camps del document i claus Annotrieve sota metadata (vegeu ANNOTATION_METADATA_TOP_LEVEL_ORDER).",
      },
      filters: [
         {
            key: 'external',
            type: 'checkbox',
            label: { en: 'External / Annotrieve import', cat: 'Extern / import Annotrieve' },
         },
         {
            key: 'metadata.busco.busco_lineage',
            type: 'select',
            label: { en: 'BUSCO lineage (Annotrieve)', cat: 'Llinatge BUSCO (Annotrieve)' },
         },
         {
            key: 'metadata.organism_name',
            type: 'select',
            label: { en: 'Organism name (metadata)', cat: "Nom d'organisme (metadades)" },
         },
         {
            key: 'metadata.assembly_name',
            type: 'select',
            label: { en: 'Assembly name (metadata)', cat: "Nom d'assemblatge (metadades)" },
         },
      ],
      columns: [
         'name',
         'assembly_accession',
         'external',
         'metadata.annotation_id',
         'metadata.assembly_name',
         'metadata.organism_name',
         'metadata.busco',
         'metadata.features_summary',
      ],
      charts: [
         { field: 'external', type: 'pie', size: 2 },
         { field: 'metadata.busco.busco_lineage', type: 'pie', size: 2 },
         { field: 'metadata.organism_name', type: 'bar', size: 2 },
         { field: 'metadata.assembly_name', type: 'bar', size: 2 },
         { field: 'assembly_accession', type: 'bar', size: 2 },
      ],
   },
}

/** Default portal-facing catalog rows when portal.json omits or partially overrides the model. */
export const defaultOrganismCatalogWire: ConfigModelWire = {
   label: { en: 'Organisms', cat: 'Organismes' },
   description: {
      en: 'List of organisms currently targeted by the CBP',
      cat: "Llista d'organismes actualment objectiu del CBP",
   },
   filters: [],
   columns: ['image', 'insdc_common_name'],
   charts: [],
}

export const defaultLocalSamplesCatalogWire: ConfigModelWire = {
   label: { en: 'Local samples', cat: 'Mostres locals' },
   description: {
      en: 'Locally registered samples',
      cat: 'Mostres registrades localment',
   },
   filters: [],
   columns: ['local_id'],
   charts: [],
}
