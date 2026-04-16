import { getAlpha2Code, getName } from 'i18n-iso-countries'

import countryNamesByCode from '@/lib/data/countryNamesByCode.json'

const PORTAL_NAMES = countryNamesByCode as Record<string, string>

/** Lowercased English label → GeoJSON / portal code (may be non–ISO-3166-1 like `UM-DQ`). */
const LOWER_LABEL_TO_CODE = new Map<string, string>()
for (const [code, name] of Object.entries(PORTAL_NAMES)) {
   LOWER_LABEL_TO_CODE.set(name.trim().toLowerCase(), code)
}

/**
 * Map a single raw `Organism.countries` entry to a canonical code for display and filtering.
 * Handles ISO alpha-2, portal GeoJSON ids, and English country names (portal + i18n-iso-countries).
 */
export function normalizeOrganismCountryToken(raw: string): string | null {
   const s = raw.trim()
   if (!s) return null
   const upper = s.toUpperCase()

   if (PORTAL_NAMES[upper]) return upper

   if (upper.length === 2 && getName(upper, 'en')) return upper

   const fromPortalLabel = LOWER_LABEL_TO_CODE.get(s.toLowerCase())
   if (fromPortalLabel) return fromPortalLabel

   const alpha2 = getAlpha2Code(s, 'en')
   if (alpha2) return alpha2

   // Preserve non-standard short ids (e.g. extended codes) when they appear in portal keys case-insensitively
   const portalKey = Object.keys(PORTAL_NAMES).find((k) => k.toUpperCase() === upper)
   if (portalKey) return portalKey

   return upper.length > 0 ? upper : null
}

/** Deduplicated country codes from `organism.countries` for chips and matching filter facets. */
export function normalizeOrganismCountryCodes(organism: Record<string, unknown>): string[] {
   const raw = organism.countries
   if (!Array.isArray(raw)) return []
   const out = new Set<string>()
   for (const x of raw) {
      const code = normalizeOrganismCountryToken(String(x))
      if (code) out.add(code)
   }
   return [...out]
}
