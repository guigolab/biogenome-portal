'use client'

import type { MutableRefObject } from 'react'
import { useEffect } from 'react'

import { fetchFieldStats } from '@/lib/api/stats'
import type { CmsOrganismFieldWire } from '@/lib/portal/types'
import {
   customFieldStatsPath,
   parseCustomFieldSectionId,
} from '@/lib/speciesCustomFieldFilters'
import type { OrganismStatsQueryContext } from '@/lib/speciesListOrganismStatsQuery'
import {
   buildOrganismStatsQuery,
   organismStatsCacheKey,
} from '@/lib/speciesListOrganismStatsQuery'
import { useOrganismCountriesDisplayStore } from '@/stores/organism-countries-display-store'
import {
   COUNTRIES_SECTION_ID,
   GOAT_STATUS_SECTION_ID,
   IUCN_SECTION_ID,
   SUB_PROJECT_SECTION_ID,
   TAXONOMY_SECTION_ID,
   useSpeciesListFilterAccordion,
} from '@/components/species-list/species-list-filter-accordion-context'

const IUCN_STATS_FIELD = 'iucn_redlist.category'
const SUB_PROJECT_STATS_FIELD = 'sub_project'
const COUNTRIES_STATS_FIELD = 'countries'
const GOAT_STATS_FIELD = 'goat_status'

type CacheRef = MutableRefObject<Map<string, Record<string, number>>>

function runCachedFetch(
   cache: CacheRef,
   model: string,
   field: string,
   q: Record<string, string>,
   apply: (raw: Record<string, number>) => void,
): void {
   const key = organismStatsCacheKey(model, field, q)
   const hit = cache.current.get(key)
   if (hit) {
      apply(hit)
      return
   }
   void fetchFieldStats(model, field, q)
      .then((raw) => {
         cache.current.set(key, raw)
         apply(raw)
      })
      .catch(() => {
         cache.current.set(key, {})
         apply({})
      })
}

function fetchCountryFacetIntoStore(
   cache: CacheRef,
   statsQueryBase: OrganismStatsQueryContext,
   cancelled: () => boolean,
): void {
   const q = buildOrganismStatsQuery(statsQueryBase, 'countries')
   const key = organismStatsCacheKey('organisms', COUNTRIES_STATS_FIELD, q)
   const setStore = useOrganismCountriesDisplayStore.getState().setCountryDisplayStats
   const hit = cache.current.get(key)
   if (hit) {
      if (!cancelled()) setStore(hit, { loading: false })
      return
   }
   const prev = useOrganismCountriesDisplayStore.getState().countryFrequencyStats
   if (!cancelled()) setStore(prev, { loading: true })
   void fetchFieldStats('organisms', COUNTRIES_STATS_FIELD, q)
      .then((raw) => {
         if (cancelled()) return
         cache.current.set(key, raw)
         setStore(raw, { loading: false })
      })
      .catch(() => {
         if (cancelled()) return
         cache.current.set(key, {})
         setStore({}, { loading: false })
      })
}

/**
 * Catalog-sidebar pattern: refresh organism facet `/stats` only for the accordion section that is
 * open. Country stats are fetched lazily — only when the countries panel is opened — matching the
 * behaviour of all other filter sections. When `showCountries` is false no country fetches run.
 */
export function SpeciesListFacetStatsSync({
   statsQueryBase,
   goatEnabled,
   showCountries,
   organismStatsCacheRef,
   setIucnThreatStats,
   setSubProjectStats,
   setGoatStats,
   customFields,
   setCustomFieldStats,
}: {
   statsQueryBase: OrganismStatsQueryContext
   goatEnabled: boolean
   showCountries: boolean
   organismStatsCacheRef: CacheRef
   setIucnThreatStats: (v: Record<string, number>) => void
   setSubProjectStats: (v: Record<string, number>) => void
   setGoatStats: (v: Record<string, number>) => void
   customFields: CmsOrganismFieldWire[]
   setCustomFieldStats: (key: string, stats: Record<string, number>) => void
}) {
   const { openSection } = useSpeciesListFilterAccordion()

   /** Immediate: facet counts for the open collapsible (same as catalog sidebar `isOpen ? control`). */
   useEffect(() => {
      if (!openSection || openSection === TAXONOMY_SECTION_ID) return

      if (showCountries && openSection === COUNTRIES_SECTION_ID) {
         let cancelled = false
         fetchCountryFacetIntoStore(organismStatsCacheRef, statsQueryBase, () => cancelled)
         return () => {
            cancelled = true
         }
      }

      if (openSection === IUCN_SECTION_ID) {
         const q = buildOrganismStatsQuery(statsQueryBase, 'iucn')
         runCachedFetch(organismStatsCacheRef, 'organisms', IUCN_STATS_FIELD, q, setIucnThreatStats)
         return
      }
      if (openSection === SUB_PROJECT_SECTION_ID) {
         const q = buildOrganismStatsQuery(statsQueryBase, 'sub_project')
         runCachedFetch(
            organismStatsCacheRef,
            'organisms',
            SUB_PROJECT_STATS_FIELD,
            q,
            setSubProjectStats,
         )
         return
      }
      const customFieldKey = parseCustomFieldSectionId(openSection)
      if (customFieldKey && customFields.some((field) => field.key === customFieldKey)) {
         const statsField = customFieldStatsPath(customFieldKey)
         const q = buildOrganismStatsQuery(statsQueryBase, statsField)
         runCachedFetch(organismStatsCacheRef, 'organisms', statsField, q, (raw) =>
            setCustomFieldStats(customFieldKey, raw),
         )
         return
      }
      if (!goatEnabled) return
      if (openSection === GOAT_STATUS_SECTION_ID) {
         const q = buildOrganismStatsQuery(statsQueryBase, 'goat_status')
         runCachedFetch(organismStatsCacheRef, 'organisms', GOAT_STATS_FIELD, q, setGoatStats)
      }
   }, [
      openSection,
      statsQueryBase,
      showCountries,
      goatEnabled,
      organismStatsCacheRef,
      setIucnThreatStats,
      setSubProjectStats,
      setGoatStats,
      customFields,
      setCustomFieldStats,
   ])

   return null
}
