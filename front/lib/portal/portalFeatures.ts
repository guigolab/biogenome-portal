import type { AppConfig } from './types'

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

/** CMS login link in main nav — `general.cms` in portal.json. */
export function showCmsLoginNav(config: AppConfig | null): boolean {
   if (!config) return false
   const g = config.general as { cms?: boolean }
   return g.cms === true
}
