import type { CatalogCardFieldDef, DataModels } from '@/lib/portal/types'
import { pickLocalized } from '@/lib/i18n/pickLocalized'

/** Last path segment, underscores → spaces; light acronym handling — used when no catalog map entry exists. */
export function humanizeCatalogFieldKey(key: string): string {
   const trimmed = key.trim()
   if (!trimmed) return key
   const last = trimmed.includes('.') ? trimmed.slice(trimmed.lastIndexOf('.') + 1) : trimmed
   const words = last
      .split(/_+/)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
   if (words.length === 0) return key
   const fix = (w: string) => {
      const lower = w.toLowerCase()
      if (lower === 'gc') return 'GC'
      if (lower === 'id') return 'ID'
      if (lower === 'n50') return 'N50'
      if (lower === 'rna') return 'RNA'
      if (lower === 'dna') return 'DNA'
      if (lower === 'ena') return 'ENA'
      if (lower === 'insdc') return 'INSDC'
      if (w.length <= 2 && w === w.toUpperCase()) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
   }
   return words.map(fix).join(' ')
}

const COMMON_COLUMN_LABELS: Record<string, Record<string, string>> = {
   scientific_name: { en: 'Scientific name', cat: 'Nom científic' },
   taxid: { en: 'Taxon ID', cat: 'ID taxon' },
}

/**
 * Human-readable labels for catalog dot-paths (sort fields, export columns, card rows).
 * Taxon fields (`scientific_name`, `taxid`) are listed first in merged export lists.
 */
const COLUMN_LABELS: Partial<Record<DataModels, Record<string, Record<string, string>>>> = {
   assemblies: {
      accession: { en: 'Assembly accession', cat: "Accession d'assemblatge" },
      assembly_name: { en: 'Assembly name', cat: "Nom de l'assemblatge" },
      blobtoolkit_id: { en: 'BlobToolKit', cat: 'BlobToolKit' },
      'metadata.assembly_info.assembly_level': {
         en: 'Assembly level',
         cat: "Nivell de l'assemblatge",
      },
      'metadata.assembly_info.assembly_type': { en: 'Assembly type', cat: "Tipus d'assemblatge" },
      'metadata.assembly_info.assembly_status': { en: 'Assembly status', cat: "Estat de l'assemblatge" },
      'metadata.assembly_info.release_date': { en: 'Release date', cat: 'Data de publicació' },
      'metadata.assembly_info.sequencing_tech': { en: 'Sequencing tech', cat: 'Tecnologia de seqüenciació' },
      'metadata.assembly_info.refseq_category': {
         en: '',
         cat: '',
      },
      'metadata.assembly_stats.contig_n50': { en: 'Contig N50', cat: 'Contig N50' },
      'metadata.assembly_stats.scaffold_n50': { en: 'Scaffold N50', cat: 'Scaffold N50' },
      'metadata.assembly_stats.gc_percent': { en: 'GC content', cat: 'Contingut GC' },
      'metadata.assembly_stats.number_of_component_sequences': {
         en: 'Component sequences',
         cat: "Seqüències components",
      },
      'metadata.assembly_stats.total_sequence_length': {
         en: 'Total length (bp)',
         cat: 'Longitud total (bp)',
      },
      'metadata.source_database': { en: 'Source database', cat: 'Base de dades font' },
      'scatter.assembly.contig_n50_scaffold_n50': {
         en: 'Contig N50 vs scaffold N50',
         cat: 'Contig N50 vs scaffold N50',
      },
   },
   biosamples: {
      accession: { en: 'BioSample', cat: 'BioSample' },
      collection_date: { en: 'Collection date', cat: 'Data de recollida' },
      'metadata.ENA-CHECKLIST': { en: 'ENA checklist', cat: 'Llista ENA' },
      'metadata.project name': { en: 'Project', cat: 'Projecte' },
      'metadata.tolid': { en: 'ToLID', cat: 'ToLID' },
      'metadata.geographic location (country and/or sea)': {
         en: 'Country / sea',
         cat: 'País / mar',
      },
      'metadata.geographic location (region and locality)': {
         en: 'Locality',
         cat: 'Localitat',
      },
      'metadata.habitat': { en: 'Habitat', cat: 'Hàbitat' },
      'metadata.geo_loc_name': { en: 'Geographic location', cat: 'Ubicació geogràfica' },
      'metadata.lifestage': { en: 'Life stage', cat: 'Estadi vital' },
      'metadata.sex': { en: 'Sex', cat: 'Sexe' },
      'metadata.organism part': { en: 'Organism part', cat: "Part de l'organisme" },
      'metadata.title': { en: 'Sample title', cat: "Títol de la mostra" },
      'metadata.broker name': { en: 'Broker', cat: 'Broker' },
      'metadata.INSDC status': { en: 'INSDC status', cat: 'Estat INSDC' },
   },
   reads: {
      run_accession: { en: 'Run', cat: 'Execució' },
      experiment_accession: { en: 'Experiment', cat: 'Experiment' },
      sample_accession: { en: 'BioSample', cat: 'BioSample' },
      'metadata.instrument_platform': { en: 'Platform', cat: 'Plataforma' },
      'metadata.instrument_model': { en: 'Instrument', cat: 'Instrument' },
      'metadata.library_strategy': { en: 'Library strategy', cat: 'Estratègia de biblioteca' },
      'metadata.library_layout': { en: 'Layout', cat: 'Disposició' },
      'metadata.library_selection': { en: 'Library selection', cat: 'Selecció de biblioteca' },
      'metadata.read_count': { en: 'Read count', cat: 'Nombre de lectures' },
      'metadata.base_count': { en: 'Base count', cat: 'Nombre de bases' },
      'metadata.first_public': { en: 'First public', cat: 'Primera publicació' },
      'metadata.experiment_title': { en: 'Experiment title', cat: "Títol de l'experiment" },
      'metadata.center_name': { en: 'Center', cat: 'Centre' },
      'metadata.library_source': { en: 'Library source', cat: 'Font de biblioteca' },
      'metadata.broker_name': { en: 'Broker (ENA)', cat: 'Broker (ENA)' },
   },
   annotations: {
      name: { en: 'Annotation', cat: 'Anotació' },
      assembly_accession: { en: 'Assembly', cat: 'Assemblatge' },
      external: { en: 'External import', cat: 'Import extern' },
      'metadata.assembly_name': { en: 'Assembly name', cat: "Nom de l'assemblatge" },
      'metadata.annotation_id': { en: 'Annotation ID', cat: "ID d'anotació" },
      'metadata.organism_name': { en: 'Organism name', cat: "Nom de l'organisme" },
      'metadata.busco': { en: 'BUSCO', cat: 'BUSCO' },
      'metadata.features_summary': { en: 'Features summary', cat: 'Resum de característiques' },
      'metadata.busco.busco_lineage': { en: 'BUSCO lineage', cat: 'Llinatge BUSCO' },
      'metadata.busco.complete': { en: 'BUSCO complete', cat: 'BUSCO complet' },
      'metadata.source_file_info.database': { en: 'Source database', cat: 'Base de dades font' },
      'metadata.source_file_info.provider': { en: 'Data provider', cat: 'Proveïdor de dades' },
      'metadata.features_statistics.gene_category_stats.coding.total_count': {
         en: 'Coding genes',
         cat: 'Genes codificants',
      },
      'metadata.features_statistics.gene_category_stats.non_coding.total_count': {
         en: 'Non-coding genes',
         cat: 'Genes no codificants',
      },
      'metadata.features_statistics.gene_category_stats.pseudogene.total_count': {
         en: 'Pseudogenes',
         cat: 'Pseudogenes',
      },
      'metadata.features_summary.biotypes': { en: 'Gene biotypes', cat: 'Biotips de gens' },
   },
   local_samples: {
      local_id: { en: 'Local ID', cat: 'ID local' },
      country: { en: 'Country', cat: 'País' },
      user: { en: 'User', cat: 'Usuari' },
   },
}

/**
 * Label for catalog export / column pickers: optional per-field `label` from portal `cardFields`
 * overrides the static {@link COLUMN_LABELS} map and {@link humanizeCatalogFieldKey} fallback.
 */
export function catalogExportFieldDisplayLabel(
   model: DataModels,
   key: string,
   cardFieldByKey: ReadonlyMap<string, CatalogCardFieldDef> | undefined,
   locale: string,
): string {
   const def = cardFieldByKey?.get(key)
   if (def?.label) {
      const picked = pickLocalized(def.label, locale, '')
      if (picked) return picked
   }
   return catalogColumnHeaderLabel(model, key, locale)
}

export function catalogColumnHeaderLabel(model: DataModels, columnKey: string, locale: string): string {
   const common = COMMON_COLUMN_LABELS[columnKey]
   if (common) {
      const picked = pickLocalized(common, locale, '')
      if (picked) return picked
   }
   const map = COLUMN_LABELS[model]?.[columnKey]
   if (map) {
      const picked = pickLocalized(map, locale, '')
      if (picked) return picked
   }
   // Any model: try last-segment humanization (never show raw metadata paths in UI).
   return humanizeCatalogFieldKey(columnKey)
}
