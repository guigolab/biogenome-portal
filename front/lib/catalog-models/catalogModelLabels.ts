import { pickLocalized } from '@/lib/i18n/pickLocalized'
import type { ConfigFilter } from '@/lib/portal/types'

/**
 * Resolve the display label for a catalog filter definition.
 * Priority: portal-provided `label` Record → message key via `t` → dot-path fallback.
 */
export function resolveCatalogFilterLabel(
   def: ConfigFilter,
   locale: string,
   t: (key: string) => string,
): string {
   if (def.label) {
      const picked = pickLocalized(def.label, locale, '')
      if (picked) return picked
   }
   if (def.labelKey) return t(def.labelKey)
   return def.key.replace(/\./g, ' · ')
}

/**
 * Resolve the display label for a `thresholdPair` row.
 * Priority: portal-provided `label` Record → message key via `t` → dot-path fallback.
 */
export function resolveThresholdPairRowLabel(
   pair: { key: string; label?: Record<string, string>; labelKey?: string },
   locale: string,
   t: (key: string) => string,
): string {
   if (pair.label) {
      const picked = pickLocalized(pair.label, locale, '')
      if (picked) return picked
   }
   if (pair.labelKey) return t(pair.labelKey)
   return pair.key.replace(/\./g, ' · ')
}

/**
 * Resolve the optional checkbox sub-label for a `referenceGenome` / `thresholdToggle` filter.
 * Priority: portal-provided `checkboxLabel` → message key via `t` → falls back to the main filter label.
 */
export function resolveFilterCheckboxLabel(
   def: ConfigFilter,
   filterLabel: string,
   locale: string,
   t: (key: string) => string,
): string {
   if (def.checkboxLabel) {
      const picked = pickLocalized(def.checkboxLabel, locale, '')
      if (picked) return picked
   }
   if (def.checkboxLabelKey) return t(def.checkboxLabelKey)
   return filterLabel
}
