import { create } from 'zustand'

import { countryFilterSectionVisible } from '@/lib/speciesCountryStats'

/**
 * Global state for organism country field stats on the species list (and any feature that opts in).
 * Updated when country frequency stats are fetched for the active list filters.
 */
export type OrganismCountriesDisplayState = {
   /** Latest `/stats/organisms/countries` buckets for the current species-list query scope. */
   countryFrequencyStats: Record<string, number> | null
   /** True while a fetch for the active scope is in flight. */
   countryStatsLoading: boolean
   setCountryDisplayStats: (
      stats: Record<string, number> | null,
      opts: { loading: boolean },
   ) => void
}

export const useOrganismCountriesDisplayStore = create<OrganismCountriesDisplayState>((set) => ({
   countryFrequencyStats: null,
   countryStatsLoading: false,
   setCountryDisplayStats: (stats, opts) =>
      set({
         countryFrequencyStats: stats,
         countryStatsLoading: opts.loading,
      }),
}))

/**
 * Sidebar: show the country collapsible whenever `showCountries` is true.
 * While stats are still null (not yet fetched) we show the section so the user can open it and
 * trigger the lazy fetch — same pattern as IUCN/subproject. Once stats are loaded we hide the
 * section only when fewer than two real countries are present.
 * Do not hide while `countryStatsLoading` — brief nulling during refetches would clear the
 * user's selection via the effect in species-list-page-client.
 */
export function selectCountryFilterSectionVisible(s: OrganismCountriesDisplayState): boolean {
   if (s.countryFrequencyStats == null) return true
   return countryFilterSectionVisible(s.countryFrequencyStats)
}

/** Species cards: same rule as the filter — multi-country mix (excluding “No Entry”). */
export function selectShowCountryChipsOnCards(s: OrganismCountriesDisplayState): boolean {
   return selectCountryFilterSectionVisible(s)
}
