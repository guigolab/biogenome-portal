import { taxonNodeToPortalStats } from '@/lib/portal/taxonNodeStats'
import type { DataModels } from '@/lib/portal/types'

export type SpeciesSortMode =
   | 'alpha'
   | 'recent'
   | 'samples'
   | 'reads'
   | 'assemblies'
   | 'annotations'

/** Base order; `visibleSpeciesSortModes` may omit count-based modes when root has no data. */
export const ALL_SPECIES_SORT_MODES: SpeciesSortMode[] = [
   'alpha',
   'recent',
   'samples',
   'reads',
   'assemblies',
   'annotations',
]

/**
 * Sort modes to show in the species list: always name + recent; count-based sorts only when
 * the portal root taxon has a positive aggregate for that model (same counts as the home hero strip).
 */
export function visibleSpeciesSortModes(
   rootTaxon: Record<string, unknown> | null | undefined,
): SpeciesSortMode[] {
   const rows = taxonNodeToPortalStats(rootTaxon)
   const byKey = Object.fromEntries(rows.map((r) => [r.key, r.count])) as Record<DataModels, number>
   const out: SpeciesSortMode[] = ['alpha', 'recent']
   if ((byKey.biosamples ?? 0) > 0) out.push('samples')
   if ((byKey.reads ?? 0) > 0) out.push('reads')
   if ((byKey.assemblies ?? 0) > 0) out.push('assemblies')
   if ((byKey.annotations ?? 0) > 0) out.push('annotations')
   return out
}

export function speciesSortToApi(mode: SpeciesSortMode): {
   sort_column: string
   sort_order: 'asc' | 'desc'
} {
   switch (mode) {
      case 'alpha':
         return { sort_column: 'scientific_name', sort_order: 'asc' }
      case 'recent':
         return { sort_column: 'id', sort_order: 'desc' }
      case 'samples':
         return { sort_column: 'biosamples_count', sort_order: 'desc' }
      case 'reads':
         return { sort_column: 'reads_count', sort_order: 'desc' }
      case 'assemblies':
         return { sort_column: 'assemblies_count', sort_order: 'desc' }
      case 'annotations':
         return { sort_column: 'genome_annotations_count', sort_order: 'desc' }
   }
}
