import { getName } from 'i18n-iso-countries'

import countryNamesByCode from '@/lib/data/countryNamesByCode.json'

const PORTAL_COUNTRY_NAMES = countryNamesByCode as Record<string, string>

const ISO639_FOR_COUNTRY_NAMES = new Set(['en', 'de', 'es', 'fr', 'it'])

function iso639ForCountryNames(locale: string): string {
   const base = locale.split(/[-_]/)[0]?.toLowerCase() ?? 'en'
   if (base === 'cat') return 'en'
   return ISO639_FOR_COUNTRY_NAMES.has(base) ? base : 'en'
}

/** English display name: portal GeoJSON map first, then i18n-iso-countries, then the code. */
export function countryLabelEn(alpha2: string): string {
   const c = alpha2.trim().toUpperCase()
   if (!c) return alpha2
   const mapped = PORTAL_COUNTRY_NAMES[c]
   if (mapped) return mapped
   return getName(c, 'en') ?? c
}

/**
 * Display name: portal map (English names from `server/countries.json`) when present;
 * otherwise i18n-iso-countries in the active locale, then English, then the code.
 */
export function countryLabelForLocale(alpha2: string, locale: string): string {
   const c = alpha2.trim().toUpperCase()
   if (!c) return alpha2
   const mapped = PORTAL_COUNTRY_NAMES[c]
   if (mapped) return mapped
   const lang = iso639ForCountryNames(locale)
   return getName(c, lang) ?? getName(c, 'en') ?? c
}
