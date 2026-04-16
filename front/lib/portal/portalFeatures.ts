import type { AppConfig } from './types'

/** Canonical GoaT site for the “learn more” link in the species list GoaT drawer. */
export const GOAT_PUBLIC_INFO_URL = 'https://goat.genomehubs.org/'

/** Returns a normalized URL when `portal.json` `general.goatProjectLink` is a valid http(s) URL; otherwise `null`. */
export function parseGoatProjectLink(raw: unknown): string | null {
   if (typeof raw !== 'string') return null
   const t = raw.trim()
   if (!t) return null
   try {
      const u = new URL(t)
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
   } catch {
      return null
   }
}

/** GoaT status page (/status) and nav link — GoaT-only. */
export function showGoatStatusPage(config: AppConfig | null): boolean {
   if (!config) return false
   const g = config.general as { goat?: boolean }
   return g.goat === true
}

export function showMap(config: AppConfig | null): boolean {
   if (!config) return false
   const g = config.general as { map?: boolean }
   return g.map !== false
}

/**
 * Country filter (species list) and country section (species detail) are controlled by the
 * `NEXT_PUBLIC_SHOW_COUNTRIES` build-time env var. Defaults to true when unset so existing
 * images keep their current behaviour.
 */
export function showCountriesUi(): boolean {
   return process.env.NEXT_PUBLIC_SHOW_COUNTRIES !== 'false'
}

/** CMS login link in main nav — `general.cms` in portal.json. */
export function showCmsLoginNav(config: AppConfig | null): boolean {
   if (!config) return false
   const g = config.general as { cms?: boolean }
   return g.cms === true
}
