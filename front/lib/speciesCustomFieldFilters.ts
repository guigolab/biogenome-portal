import type { CmsOrganismFieldWire } from '@/lib/portal/types'
import { speciesMetadataBucketToQueryValue } from '@/lib/speciesFieldStats'
import type { OrganismStatsQueryContext } from '@/lib/speciesListOrganismStatsQuery'

const CUSTOM_FIELD_SECTION_PREFIX = 'custom_field:'

/** Mongo/stats dot-path for a portal-config custom field stored under organism.metadata. */
export function customFieldStatsPath(key: string): string {
   return `metadata.${key}`
}

/** Accordion section id for a custom field filter panel. */
export function customFieldSectionId(key: string): string {
   return `${CUSTOM_FIELD_SECTION_PREFIX}${key}`
}

/** Parse a custom-field accordion section id; returns the field key or null. */
export function parseCustomFieldSectionId(sectionId: string): string | null {
   if (!sectionId.startsWith(CUSTOM_FIELD_SECTION_PREFIX)) return null
   const key = sectionId.slice(CUSTOM_FIELD_SECTION_PREFIX.length)
   return key || null
}

/** Append active custom metadata filters, omitting the facet currently being aggregated. */
export function appendCustomFieldFilters(
   q: Record<string, string>,
   ctx: Pick<OrganismStatsQueryContext, 'customFields' | 'customFieldFilters'>,
   excludeStatsPath: string,
): void {
   for (const field of ctx.customFields) {
      const path = customFieldStatsPath(field.key)
      if (path === excludeStatsPath) continue
      const filter = ctx.customFieldFilters[field.key] ?? 'all'
      if (filter === 'all') continue
      q[path] = speciesMetadataBucketToQueryValue(filter)
   }
}

/** Append active custom metadata filters to organism list/export query params. */
export function appendCustomFieldListFilters(
   q: Record<string, string | number>,
   customFields: CmsOrganismFieldWire[],
   customFieldFilters: Record<string, string>,
): void {
   for (const field of customFields) {
      const filter = customFieldFilters[field.key] ?? 'all'
      if (filter === 'all') continue
      q[customFieldStatsPath(field.key)] = speciesMetadataBucketToQueryValue(filter)
   }
}
