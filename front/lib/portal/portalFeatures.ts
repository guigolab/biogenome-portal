import type { AppConfig } from './types'

export function showProgress(config: AppConfig | null): boolean {
   if (!config) return false
   const g = config.general as { goat?: boolean; insdcStatus?: boolean }
   return g.goat === true || g.insdcStatus === true
}

export function showMap(config: AppConfig | null): boolean {
   if (!config) return false
   const g = config.general as { map?: boolean }
   return g.map !== false
}
