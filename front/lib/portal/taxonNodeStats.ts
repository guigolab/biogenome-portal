import type { DataModels } from './types'

const TAXON_COUNT_TO_MODEL: { field: string; key: DataModels }[] = [
   { field: 'organisms_count', key: 'organisms' },
   { field: 'assemblies_count', key: 'assemblies' },
   { field: 'reads_count', key: 'reads' },
   { field: 'biosamples_count', key: 'biosamples' },
   { field: 'local_samples_count', key: 'local_samples' },
   { field: 'genome_annotations_count', key: 'annotations' },
]

export type PortalStatRow = { key: DataModels; count: number }

export function taxonNodeToPortalStats(node: Record<string, unknown> | null | undefined): PortalStatRow[] {
   if (!node || typeof node !== 'object') return []
   return TAXON_COUNT_TO_MODEL.map(({ field, key }) => {
      const raw = node[field]
      const n = typeof raw === 'number' ? raw : Number(raw)
      return { key, count: Number.isFinite(n) ? n : 0 }
   })
}
