import type { Dispatch, SetStateAction } from 'react'

import type { ActiveFilterChip } from '@/components/species-list/species-list-active-filters'
import type { FilterValuesState } from '@/lib/catalogQueryParams'
import {
   resolveCatalogFilterLabel,
   resolveThresholdPairRowLabel,
} from '@/lib/catalog-models/catalogModelLabels'
import type { ConfigFilter } from '@/lib/portal/types'

export function buildCatalogActiveFilterChips(options: {
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   locale: string
   t: (key: string) => string
   setFilterValues: Dispatch<SetStateAction<Record<string, FilterValuesState | undefined>>>
}): ActiveFilterChip[] {
   const { filterDefs, filterValues, locale, t, setFilterValues } = options
   const chips: ActiveFilterChip[] = []

   for (const def of filterDefs ?? []) {
      const flabel = resolveCatalogFilterLabel(def, locale, t)
      const removeLabel = `${t('catalog.removeFilter')} ${flabel}`

      if (def.type === 'thresholdPair' && def.thresholdPair?.length) {
         for (const p of def.thresholdPair) {
            const pst = filterValues[p.key]
            if (pst?.checkbox !== true) continue
            const plab = resolveThresholdPairRowLabel(p, locale, t)
            chips.push({
               id: `filter-${p.key}`,
               label: `${plab}: ${t('catalog.filterChipYes')}`,
               removeAriaLabel: `${t('catalog.removeFilter')} ${plab}`,
               clear: () =>
                  setFilterValues((prev) => {
                     const next = { ...prev }
                     delete next[p.key]
                     return next
                  }),
            })
         }
         continue
      }

      const st = filterValues[def.key]
      if (!st) continue

      if (def.type === 'input') {
         const v = st.text?.trim()
         if (!v) continue
         chips.push({
            id: `filter-${def.key}`,
            label: `${flabel}: ${v}`,
            removeAriaLabel: removeLabel,
            clear: () =>
               setFilterValues((prev) => {
                  const next = { ...prev }
                  delete next[def.key]
                  return next
               }),
         })
      } else if (def.type === 'select' || def.type === 'experimentList') {
         const v = st.select?.trim()
         if (!v || v === 'all') continue
         chips.push({
            id: `filter-${def.key}`,
            label: `${flabel}: ${v}`,
            removeAriaLabel: removeLabel,
            clear: () =>
               setFilterValues((prev) => {
                  const next = { ...prev }
                  delete next[def.key]
                  return next
               }),
         })
      } else if (def.type === 'checkbox') {
         if (st.checkbox !== true && st.checkbox !== false) continue
         chips.push({
            id: `filter-${def.key}`,
            label: `${flabel}: ${st.checkbox ? t('catalog.filterChipYes') : t('catalog.filterChipNo')}`,
            removeAriaLabel: removeLabel,
            clear: () =>
               setFilterValues((prev) => {
                  const next = { ...prev }
                  delete next[def.key]
                  return next
               }),
         })
      } else if (def.type === 'date' || def.type === 'histogramDate') {
         const from = st.date?.from?.trim()
         const to = st.date?.to?.trim()
         if (!from && !to) continue
         const range = [from, to].filter(Boolean).join(' – ')
         chips.push({
            id: `filter-${def.key}`,
            label: `${flabel}: ${range}`,
            removeAriaLabel: removeLabel,
            clear: () =>
               setFilterValues((prev) => {
                  const next = { ...prev }
                  delete next[def.key]
                  return next
               }),
         })
      } else if (def.type === 'thresholdToggle') {
         if (st.checkbox !== true) continue
         chips.push({
            id: `filter-${def.key}`,
            label: `${flabel}: ${t('catalog.filterChipYes')}`,
            removeAriaLabel: removeLabel,
            clear: () =>
               setFilterValues((prev) => {
                  const next = { ...prev }
                  delete next[def.key]
                  return next
               }),
         })
      } else if (def.type === 'referenceGenome') {
         if (st.checkbox !== true) continue
         chips.push({
            id: `filter-${def.key}`,
            label: `${flabel}: ${t('catalog.filterChipYes')}`,
            removeAriaLabel: removeLabel,
            clear: () =>
               setFilterValues((prev) => {
                  const next = { ...prev }
                  delete next[def.key]
                  return next
               }),
         })
      }
   }

   return chips
}

export function catalogHasStructuredFilters(
   filterDefs: ConfigFilter[] | undefined,
   filterValues: Record<string, FilterValuesState | undefined>,
): boolean {
   for (const def of filterDefs ?? []) {
      if (
         def.type === 'thresholdPair' &&
         def.thresholdPair?.some((p) => filterValues[p.key]?.checkbox === true)
      ) {
         return true
      }
      const st = filterValues[def.key]
      if (!st) continue
      if (def.type === 'input' && st.text?.trim()) return true
      if (def.type === 'select' || def.type === 'experimentList') {
         const v = st.select?.trim()
         if (v && v !== 'all') return true
      }
      if (def.type === 'checkbox' && (st.checkbox === true || st.checkbox === false)) return true
      if (
         (def.type === 'date' || def.type === 'histogramDate') &&
         (st.date?.from?.trim() || st.date?.to?.trim())
      ) {
         return true
      }
      if (def.type === 'thresholdToggle' && st.checkbox === true) return true
      if (def.type === 'referenceGenome' && st.checkbox === true) return true
   }
   return false
}
