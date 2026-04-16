import { IUCN_STATS_NO_ENTRY } from '@/lib/iucnCategory'

/** Stats bucket keys that represent “no value” for sub_project / sequencing_type filters. */
export function isSpeciesMetadataEmptyBucketKey(key: string): boolean {
   const k = key.trim()
   if (k === '') return true
   if (k.toLowerCase() === 'no_value') return true
   if (k === 'None') return true
   if (k === IUCN_STATS_NO_ENTRY) return true
   return false
}

/**
 * Value to send on GET /organisms for a metadata stats bucket (empty buckets → server ``No Entry``).
 */
export function speciesMetadataBucketToQueryValue(raw: string): string {
   if (isSpeciesMetadataEmptyBucketKey(raw)) return IUCN_STATS_NO_ENTRY
   return raw
}

/** True when field stats has more than a single “no value” bucket (same idea as IUCN visibility). */
export function organismFieldStatsHasFilterableValues(
   stats: Record<string, number> | null | undefined,
): boolean {
   if (!stats) return false
   const keys = Object.keys(stats).filter((k) => k !== 'message')
   if (keys.length === 0) return false
   if (keys.length === 1 && keys[0] === IUCN_STATS_NO_ENTRY) return false
   return true
}

/** Sorted by count descending for filter lists. */
export function sortStatEntriesByCountDesc(entries: [string, number][]): [string, number][] {
   return [...entries].sort((a, b) => b[1] - a[1])
}
