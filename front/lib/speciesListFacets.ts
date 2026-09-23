import type { SpeciesListFacetDef } from '@/lib/portal/types'
import { speciesMetadataBucketToQueryValue } from '@/lib/speciesFieldStats'

const FACET_SECTION_PREFIX = 'facet:'

/** Mongo /stats and list filter path for a species-list metadata facet. */
export function speciesListFacetStatsField(key: string): string {
   return `metadata.${key}`
}

/** Accordion section id for a declared species-list facet. */
export function speciesListFacetSectionId(key: string): string {
   return `${FACET_SECTION_PREFIX}${key}`
}

/** Parse a facet accordion section id; returns the metadata key or null. */
export function parseSpeciesListFacetSectionId(sectionId: string): string | null {
   if (!sectionId.startsWith(FACET_SECTION_PREFIX)) return null
   const key = sectionId.slice(FACET_SECTION_PREFIX.length)
   return key || null
}

/** Built-in message-key stems for known facet keys (under `speciesList.*`). */
export type SpeciesListFacetMsgStem = {
   sectionTitle: string
   searchPlaceholder: string
   clearSelection: string
   filterAria: string
   removeFilter: string
}

const KNOWN_FACET_MSG: Record<string, SpeciesListFacetMsgStem> = {
   sequencing_type: {
      sectionTitle: 'sequencingTypeSectionTitle',
      searchPlaceholder: 'sequencingTypeListSearchPlaceholder',
      clearSelection: 'sequencingTypeClearSelection',
      filterAria: 'filterBySequencingType',
      removeFilter: 'removeSequencingTypeFilter',
   },
   pi_institutes: {
      sectionTitle: 'instituteSectionTitle',
      searchPlaceholder: 'instituteListSearchPlaceholder',
      clearSelection: 'instituteClearSelection',
      filterAria: 'filterByInstitute',
      removeFilter: 'removeInstituteFilter',
   },
   pi_programs: {
      sectionTitle: 'programSectionTitle',
      searchPlaceholder: 'programListSearchPlaceholder',
      clearSelection: 'programClearSelection',
      filterAria: 'filterByProgram',
      removeFilter: 'removeProgramFilter',
   },
}

function humanizeFacetKey(key: string): string {
   return key
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
}

export type FacetTranslate = (key: string) => string

/** Section title: portal label override (locale then en), known i18n, else humanized key. */
export function resolveSpeciesListFacetLabel(
   facet: SpeciesListFacetDef,
   locale: string,
   t: FacetTranslate,
): string {
   const fromPortal = facet.label?.[locale] || facet.label?.en
   if (fromPortal?.trim()) return fromPortal.trim()
   const stem = KNOWN_FACET_MSG[facet.key]
   if (stem) return t(`speciesList.${stem.sectionTitle}`)
   return humanizeFacetKey(facet.key)
}

export function resolveSpeciesListFacetSearchPlaceholder(
   facet: SpeciesListFacetDef,
   t: FacetTranslate,
): string {
   const stem = KNOWN_FACET_MSG[facet.key]
   if (stem) return t(`speciesList.${stem.searchPlaceholder}`)
   return `Search ${humanizeFacetKey(facet.key).toLowerCase()}...`
}

export function resolveSpeciesListFacetClearLabel(
   facet: SpeciesListFacetDef,
   t: FacetTranslate,
): string {
   const stem = KNOWN_FACET_MSG[facet.key]
   if (stem) return t(`speciesList.${stem.clearSelection}`)
   return `Clear ${humanizeFacetKey(facet.key).toLowerCase()}`
}

export function resolveSpeciesListFacetAriaLabel(
   facet: SpeciesListFacetDef,
   locale: string,
   t: FacetTranslate,
): string {
   const stem = KNOWN_FACET_MSG[facet.key]
   if (stem) return t(`speciesList.${stem.filterAria}`)
   return `Filter by ${resolveSpeciesListFacetLabel(facet, locale, t)}`
}

export function resolveSpeciesListFacetRemoveLabel(
   facet: SpeciesListFacetDef,
   t: FacetTranslate,
): string {
   const stem = KNOWN_FACET_MSG[facet.key]
   if (stem) return t(`speciesList.${stem.removeFilter}`)
   return `Remove ${humanizeFacetKey(facet.key).toLowerCase()} filter`
}

/** Comma-joined OR-within-facet query value. */
export function speciesListFacetInParam(values: string[]): string | undefined {
   const cleaned = [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort()
   return cleaned.length > 0 ? cleaned.join(',') : undefined
}

/**
 * Append active species-list facet filters to a query object.
 * Multi-select facets use `metadata.<key>__in`; single-select uses exact `metadata.<key>`.
 * When `excludeStatsField` matches a facet's stats path, that facet is omitted (stats self-exclude).
 */
export function appendSpeciesListFacetDimensions(
   q: Record<string, string | number>,
   facets: SpeciesListFacetDef[],
   selections: Record<string, string[]>,
   excludeStatsField?: string,
): void {
   for (const facet of facets) {
      const statsField = speciesListFacetStatsField(facet.key)
      if (excludeStatsField && statsField === excludeStatsField) continue
      const selected = selections[facet.key] ?? []
      if (facet.multiSelect) {
         const joined = speciesListFacetInParam(selected)
         if (joined) q[`${statsField}__in`] = joined
      } else {
         const value = selected[0]
         if (value == null || value === '' || value === 'all') continue
         q[statsField] = speciesMetadataBucketToQueryValue(value)
      }
   }
}
