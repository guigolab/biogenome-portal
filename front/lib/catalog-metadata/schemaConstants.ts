/**
 * Metadata layout constants derived from GET /api/<catalog> samples
 * (e.g. http://localhost:91/bgp/api/assemblies?limit=100).
 *
 * - Assemblies: NCBI DataSets-style blob; top-level union across samples includes optional
 *   `paired_accession`, `organelle_info`, `annotation_info`, `wgs_info`.
 * - Reads: ENA filereport row — 41 scalar keys, stable across sampled ReadRun rows.
 * - Annotations: Annotrieve metadata; optional `mapped_regions`.
 * - BioSamples: flat ENA attributes; universal keys across 100 sampled rows were only
 *   `ENA-CHECKLIST` and `scientific_name`; other keys vary by checklist (e.g. ERC000011 vs ERC000053)
 *   and submitter conventions (`collection date` vs `collection_date`).
 */

/** Preferred top-level section order for Assembly.metadata (NCBI assembly report). */
export const ASSEMBLY_METADATA_TOP_LEVEL_ORDER = [
   'accession',
   'current_accession',
   'source_database',
   'paired_accession',
   'organism',
   'assembly_info',
   'assembly_stats',
   'organelle_info',
   'annotation_info',
   'wgs_info',
] as const

/** ENA read/run filereport metadata keys (order stable in sampled data). */
export const READ_RUN_METADATA_KEY_ORDER = [
   'run_accession',
   'run_alias',
   'experiment_accession',
   'experiment_alias',
   'experiment_title',
   'sample_accession',
   'sample_alias',
   'sample_title',
   'tax_id',
   'scientific_name',
   'study_accession',
   'study_alias',
   'study_title',
   'submission_accession',
   'secondary_sample_accession',
   'secondary_study_accession',
   'instrument_platform',
   'instrument_model',
   'library_name',
   'library_layout',
   'library_strategy',
   'library_source',
   'library_selection',
   'read_count',
   'base_count',
   'first_created',
   'first_public',
   'last_updated',
   'center_name',
   'broker_name',
   'fastq_ftp',
   'fastq_aspera',
   'fastq_galaxy',
   'fastq_md5',
   'fastq_bytes',
   'submitted_ftp',
   'submitted_aspera',
   'submitted_galaxy',
   'submitted_md5',
   'submitted_bytes',
   'submitted_format',
] as const

/** Annotrieve / portal annotation metadata — union of top-level keys in samples. */
export const ANNOTATION_METADATA_TOP_LEVEL_ORDER = [
   'annotation_id',
   'assembly_accession',
   'assembly_name',
   'organism_name',
   'taxid',
   'taxon_lineage',
   'busco',
   'features_statistics',
   'features_summary',
   'source_file_info',
   'indexed_file_info',
   'mapped_regions',
] as const

/**
 * Keys that appeared on every one of 100 consecutive biosample catalog rows
 * (intersection); everything else is checklist- or submitter-specific.
 */
export const BIOSAMPLE_UNIVERSAL_KEYS = ['ENA-CHECKLIST', 'scientific_name'] as const

const BIOSAMPLE_INFRA_EXACT = new Set([
   'ENA-FIRST-PUBLIC',
   'ENA-LAST-UPDATE',
   'External Id',
   'INSDC center name',
   'INSDC first public',
   'INSDC last update',
   'INSDC status',
   'SRA accession',
   'Submitter Id',
])

export function isBiosampleInfrastructureKey(key: string): boolean {
   if (BIOSAMPLE_INFRA_EXACT.has(key)) return true
   if (key.startsWith('ENA-')) return true
   if (key.startsWith('INSDC ')) return true
   return false
}
