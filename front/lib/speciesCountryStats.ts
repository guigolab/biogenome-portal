import { IUCN_STATS_NO_ENTRY } from '@/lib/iucnCategory'

/** Stats bucket for missing / empty organism countries (aligned with server/services/stats.py). */
export const COUNTRY_STATS_NO_ENTRY = IUCN_STATS_NO_ENTRY

export function countryStatKeys(stats: Record<string, number> | null | undefined): string[] {
   if (!stats) return []
   return Object.keys(stats).filter((k) => k !== 'message')
}

/** ISO-like codes present in stats, excluding the empty/missing bucket. */
export function countryStatRealCodes(stats: Record<string, number> | null | undefined): string[] {
   return countryStatKeys(stats).filter((k) => k !== COUNTRY_STATS_NO_ENTRY && k.trim() !== '')
}

/** Show country filter section when more than one distinct real country appears in field stats. */
export function countryFilterSectionVisible(stats: Record<string, number> | null | undefined): boolean {
   return countryStatRealCodes(stats).length > 1
}

/** Same threshold as the country filter: multiple real countries in field stats (excluding “No Entry”). */
export function showCountryChipsOnCards(stats: Record<string, number> | null | undefined): boolean {
   return countryFilterSectionVisible(stats)
}
