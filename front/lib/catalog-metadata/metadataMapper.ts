import {
   ANNOTATION_METADATA_TOP_LEVEL_ORDER,
   ASSEMBLY_METADATA_TOP_LEVEL_ORDER,
   BIOSAMPLE_UNIVERSAL_KEYS,
   isBiosampleInfrastructureKey,
   READ_RUN_METADATA_KEY_ORDER,
} from '@/lib/catalog-metadata/schemaConstants'
import type {
   BiosampleMetadataPartition,
   InsdcCatalogMetadataModel,
   MappedCatalogMetadata,
   MetadataEntry,
   MetadataSection,
   MetadataValueKind,
} from '@/lib/catalog-metadata/types'

export function isInsdcCatalogMetadataModel(m: string): m is InsdcCatalogMetadataModel {
   return m === 'assemblies' || m === 'reads' || m === 'annotations' || m === 'biosamples'
}

export function asMetadataRecord(raw: unknown): Record<string, unknown> | null {
   if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
   return raw as Record<string, unknown>
}

export function inferMetadataValueKind(value: unknown): MetadataValueKind {
   if (value === null || value === undefined) return 'null'
   if (Array.isArray(value)) return 'array'
   const t = typeof value
   if (t === 'string' || t === 'number' || t === 'boolean') return t
   return 'object'
}

export function stringifyMetadataValue(value: unknown, indent = 2): string {
   if (value === null || value === undefined) return ''
   if (typeof value === 'string') return value
   if (typeof value === 'number' || typeof value === 'boolean') return String(value)
   try {
      return JSON.stringify(value, null, indent)
   } catch {
      return String(value)
   }
}

function entry(key: string, value: unknown): MetadataEntry {
   const valueKind = inferMetadataValueKind(value)
   const displayValue =
      valueKind === 'object' || valueKind === 'array' ? stringifyMetadataValue(value) : stringifyMetadataValue(value, 0)
   return {
      key,
      label: key,
      value,
      valueKind,
      displayValue,
   }
}

function sortEntriesByKeyOrder(entries: MetadataEntry[], order: readonly string[]): MetadataEntry[] {
   const idx = new Map(order.map((k, i) => [k, i]))
   return [...entries].sort((a, b) => {
      const ia = idx.get(a.key)
      const ib = idx.get(b.key)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return a.key.localeCompare(b.key)
   })
}

/** Assembly: one section per known top-level key; unknown keys appended alphabetically. */
export function mapAssemblyMetadata(metadata: unknown): MetadataSection[] {
   const meta = asMetadataRecord(metadata)
   if (!meta) return []

   const known = new Set<string>([...ASSEMBLY_METADATA_TOP_LEVEL_ORDER])
   const sections: MetadataSection[] = []

   for (const key of ASSEMBLY_METADATA_TOP_LEVEL_ORDER) {
      if (!(key in meta)) continue
      sections.push({
         id: key,
         title: key,
         entries: [entry(key, meta[key])],
      })
   }

   const extras = Object.keys(meta)
      .filter((k) => !known.has(k))
      .sort()
   for (const key of extras) {
      sections.push({
         id: key,
         title: key,
         entries: [entry(key, meta[key])],
      })
   }

   return sections
}

/** ReadRun: single flat section, fixed key order (ENA filereport). */
export function mapReadRunMetadata(metadata: unknown): MetadataSection[] {
   const meta = asMetadataRecord(metadata)
   if (!meta) return []

   const ordered: MetadataEntry[] = []
   const seen = new Set<string>()
   for (const key of READ_RUN_METADATA_KEY_ORDER) {
      if (!(key in meta)) continue
      ordered.push(entry(key, meta[key]))
      seen.add(key)
   }
   const rest = Object.keys(meta)
      .filter((k) => !seen.has(k))
      .sort()
   for (const key of rest) {
      ordered.push(entry(key, meta[key]))
   }

   return [{ id: 'ena_run', title: 'ENA run / experiment', entries: ordered }]
}

/** GenomeAnnotation: ordered top-level sections (Annotrieve). */
export function mapAnnotationMetadata(metadata: unknown): MetadataSection[] {
   const meta = asMetadataRecord(metadata)
   if (!meta) return []

   const known = new Set<string>([...ANNOTATION_METADATA_TOP_LEVEL_ORDER])
   const sections: MetadataSection[] = []

   for (const key of ANNOTATION_METADATA_TOP_LEVEL_ORDER) {
      if (!(key in meta)) continue
      sections.push({
         id: key,
         title: key,
         entries: [entry(key, meta[key])],
      })
   }

   const extras = Object.keys(meta)
      .filter((k) => !known.has(k))
      .sort()
   for (const key of extras) {
      sections.push({
         id: key,
         title: key,
         entries: [entry(key, meta[key])],
      })
   }

   return sections
}

const universalSet = new Set<string>([...BIOSAMPLE_UNIVERSAL_KEYS])

export function partitionBiosampleMetadata(metadata: unknown): BiosampleMetadataPartition {
   const meta = asMetadataRecord(metadata)
   if (!meta) {
      return {
         checklistId: null,
         universal: [],
         infrastructure: [],
         sampleAttributes: [],
      }
   }

   const checklistRaw = meta['ENA-CHECKLIST']
   const checklistId = typeof checklistRaw === 'string' && checklistRaw.trim() ? checklistRaw.trim() : null

   const universal: MetadataEntry[] = []
   for (const key of BIOSAMPLE_UNIVERSAL_KEYS) {
      if (!(key in meta)) continue
      universal.push(entry(key, meta[key]))
   }

   const infrastructureKeys: string[] = []
   const sampleKeys: string[] = []
   for (const key of Object.keys(meta)) {
      if (universalSet.has(key)) continue
      if (isBiosampleInfrastructureKey(key)) infrastructureKeys.push(key)
      else sampleKeys.push(key)
   }

   const infrastructure = sortEntriesByKeyOrder(
      infrastructureKeys.map((k) => entry(k, meta[k])),
      [
         'ENA-FIRST-PUBLIC',
         'ENA-LAST-UPDATE',
         'External Id',
         'Submitter Id',
         'SRA accession',
         'INSDC status',
         'INSDC center name',
         'INSDC first public',
         'INSDC last update',
      ],
   )

   sampleKeys.sort((a, b) => a.localeCompare(b))
   const sampleAttributes = sampleKeys.map((k) => entry(k, meta[k]))

   return {
      checklistId,
      universal,
      infrastructure,
      sampleAttributes,
   }
}

export function mapCatalogMetadata(
   model: InsdcCatalogMetadataModel,
   metadata: unknown,
): MappedCatalogMetadata {
   switch (model) {
      case 'assemblies':
         return { model: 'assemblies', sections: mapAssemblyMetadata(metadata) }
      case 'reads':
         return { model: 'reads', sections: mapReadRunMetadata(metadata) }
      case 'annotations':
         return { model: 'annotations', sections: mapAnnotationMetadata(metadata) }
      case 'biosamples':
         return { model: 'biosamples', partition: partitionBiosampleMetadata(metadata) }
   }
}

/**
 * Summarise multiple biosample rows: key intersection (common) and distinct key signatures.
 * Useful when probing a deployment for checklist diversity.
 */
export function analyzeBiosampleMetadataBatch(
   rows: Array<{ metadata?: unknown; accession?: unknown }>,
): {
   commonKeys: string[]
   signatures: { signature: string; count: number; sampleAccession: string | null }[]
} {
   const keySets: Set<string>[] = []
   const sigToCount = new Map<string, { count: number; acc: string | null }>()

   for (const row of rows) {
      const meta = asMetadataRecord(row.metadata)
      if (!meta) continue
      const keys = Object.keys(meta).sort()
      keySets.push(new Set(keys))
      const sig = keys.join('\u0001')
      const acc = typeof row.accession === 'string' ? row.accession : null
      const prev = sigToCount.get(sig)
      if (prev) prev.count += 1
      else sigToCount.set(sig, { count: 1, acc })
   }

   let commonKeys: string[] = []
   if (keySets.length > 0) {
      commonKeys = [...keySets[0]!].filter((k) => keySets.every((s) => s.has(k)))
      commonKeys.sort()
   }

   const signatures = [...sigToCount.entries()]
      .map(([signature, v]) => ({
         signature,
         count: v.count,
         sampleAccession: v.acc,
      }))
      .sort((a, b) => b.count - a.count)

   return { commonKeys, signatures }
}
