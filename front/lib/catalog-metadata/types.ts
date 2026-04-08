import type { DataModels } from '@/lib/portal/types'

/** Catalog list models whose `metadata` field is shaped by INSDC / Annotrieve ingest. */
export type InsdcCatalogMetadataModel = Extract<
   DataModels,
   'assemblies' | 'reads' | 'annotations' | 'biosamples'
>

export type MetadataValueKind =
   | 'null'
   | 'string'
   | 'number'
   | 'boolean'
   | 'object'
   | 'array'

export type MetadataEntry = {
   key: string
   label: string
   value: unknown
   valueKind: MetadataValueKind
   /** Preformatted for tables / monospace blocks */
   displayValue: string
}

export type MetadataSection = {
   id: string
   title: string
   entries: MetadataEntry[]
}

export type BiosampleMetadataPartition = {
   /** ENA checklist accession when present (e.g. ERC000011). */
   checklistId: string | null
   /** Keys observed across ≥100 biosample rows in a portal sample (ENA-CHECKLIST + scientific_name). */
   universal: MetadataEntry[]
   /** ENA / INSDC housekeeping fields (stable labels, not checklist traits). */
   infrastructure: MetadataEntry[]
   /** Checklist- and submitter-specific attributes (varies by sample). */
   sampleAttributes: MetadataEntry[]
}

export type MappedCatalogMetadata =
   | { model: 'assemblies'; sections: MetadataSection[] }
   | { model: 'reads'; sections: MetadataSection[] }
   | { model: 'annotations'; sections: MetadataSection[] }
   | { model: 'biosamples'; partition: BiosampleMetadataPartition }
