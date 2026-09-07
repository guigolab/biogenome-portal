'use client'

import { CatalogDateHistogramSlider } from '@/components/catalog-explorer/catalog-date-histogram-slider'
import { CatalogExperimentFilterList } from '@/components/catalog-explorer/catalog-experiment-filter-list'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
   CatalogFilterAccordionProvider,
   catalogFilterSectionId,
   useCatalogFilterAccordion,
} from '@/components/catalog-explorer/catalog-filter-accordion-context'
import { CatalogFilterCollapsible } from '@/components/catalog-explorer/catalog-filter-collapsible'
import { ReferenceGenomeStarMark } from '@/components/catalog-explorer/reference-genome-star-mark'
import { filterSidebarScrollColumnClassName } from '@/components/filters/filter-sidebar-template'
import { useLocale } from '@/contexts/locale-context'
import { buildFacetStatsQuery, type FilterValuesState } from '@/lib/catalogQueryParams'
import type { SelectOptionWithCount } from '@/lib/catalog-explorer'
import {
   resolveCatalogFilterLabel,
   resolveFilterCheckboxLabel,
   resolveThresholdPairRowLabel,
} from '@/lib/catalog-models/catalogModelLabels'
import type { ConfigFilter, DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'

function fieldId(def: ConfigFilter): string {
   return `cf-${def.key.replace(/[^\w-]+/g, '-')}`
}

/** Returns true when a field has an active (non-empty) value. */
function isFieldActive(
   def: ConfigFilter,
   filterValues: Record<string, FilterValuesState | undefined>,
): boolean {
   if (def.type === 'thresholdPair' && def.thresholdPair?.length) {
      return def.thresholdPair.some((p) => filterValues[p.key]?.checkbox === true)
   }
   const st = filterValues[def.key]
   if (!st) return false
   if (def.type === 'input') return Boolean(st.text?.trim())
   if (def.type === 'select') return Boolean(st.select?.trim() && st.select !== 'all')
   if (def.type === 'checkbox') return st.checkbox === true || st.checkbox === false
   if (def.type === 'date' || def.type === 'histogramDate') {
      return Boolean(st.date?.from?.trim() || st.date?.to?.trim())
   }
   if (def.type === 'experimentList') {
      return Boolean(st.select?.trim() && st.select !== 'all')
   }
   if (def.type === 'thresholdToggle' || def.type === 'referenceGenome') {
      return st.checkbox === true
   }
   return false
}

function CatalogSidebarSelectList({
   id,
   flabel,
   opts,
   value,
   allLabel,
   onPick,
}: {
   id: string
   flabel: string
   opts: SelectOptionWithCount[]
   value: string | undefined
   allLabel: string
   onPick: (next: string | undefined) => void
}) {
   const current = value ?? 'all'
   return (
      <div
         className="max-h-[min(50vh,20rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-labelledby={id}
         id={`${id}-listbox`}
      >
         <span id={id} className="sr-only">
            {flabel}
         </span>
         <button
            type="button"
            role="option"
            aria-selected={current === 'all'}
            className={cn(
               'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
               current === 'all' && 'bg-muted',
            )}
            onClick={() => onPick(undefined)}
         >
            <Check className={cn('h-4 w-4 shrink-0', current === 'all' ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1 font-medium">{allLabel}</span>
         </button>
         {opts.map(([o, count]) => {
            const sel = value === o
            return (
               <button
                  key={o}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={cn(
                     'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                     sel && 'bg-muted',
                  )}
                  onClick={() => onPick(o)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{o}</span>
                  {count > 0 ? (
                     <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {count.toLocaleString()}
                     </span>
                  ) : null}
               </button>
            )
         })}
      </div>
   )
}

function CatalogSidebarCheckboxList({
   id,
   flabel,
   value,
   onPick,
   t,
}: {
   id: string
   flabel: string
   value: boolean | undefined
   onPick: (next: boolean | undefined) => void
   t: (key: string) => string
}) {
   const tri = value === true ? 'true' : value === false ? 'false' : 'all'
   const row = (key: 'all' | 'true' | 'false', label: string) => {
      const sel = tri === key
      return (
         <button
            key={key}
            type="button"
            role="option"
            aria-selected={sel}
            className={cn(
               'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
               sel && 'bg-muted',
            )}
            onClick={() => {
               if (key === 'all') onPick(undefined)
               else if (key === 'true') onPick(true)
               else onPick(false)
            }}
         >
            <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
         </button>
      )
   }
   return (
      <div className="space-y-0.5 py-1" role="listbox" aria-labelledby={id}>
         <span id={id} className="sr-only">
            {flabel}
         </span>
         {row('all', t('common.all'))}
         {row('true', t('catalog.filterChipYes'))}
         {row('false', t('catalog.filterChipNo'))}
      </div>
   )
}

type ControlProps = {
   def: ConfigFilter
   st: FilterValuesState
   flabel: string
   t: (key: string) => string
   onChange: (key: string, next: FilterValuesState | undefined) => void
   selectOptions: Record<string, SelectOptionWithCount[]>
   /** True while lazy stats for this select field are loading. */
   selectFieldLoading?: boolean
   catalogKey: DataModels
   filterDefs: ConfigFilter[] | undefined
   allFilterValues: Record<string, FilterValuesState | undefined>
   statsQuery: Record<string, string | number | boolean>
   /** Sidebar accordion: facet APIs only when this section is expanded. */
   deferFacetFetch?: boolean
}

function CatalogFilterControl({
   def,
   st,
   flabel,
   t,
   onChange,
   selectOptions,
   selectFieldLoading,
   catalogKey,
   filterDefs,
   allFilterValues,
   statsQuery,
   deferFacetFetch = false,
}: ControlProps) {
   const { locale } = useLocale()
   const id = fieldId(def)

   if (def.type === 'input') {
      return (
         <div className="space-y-1.5">
            <Label htmlFor={id} className="sr-only">
               {flabel}
            </Label>
            <Input
               id={id}
               className="h-9"
               value={st.text ?? ''}
               onChange={(e) => onChange(def.key, { ...st, text: e.target.value })}
            />
         </div>
      )
   }

   if (def.type === 'select') {
      const opts = selectOptions[def.key] ?? []
      if (selectFieldLoading) {
         return (
            <div
               className="flex min-h-[8rem] items-center justify-center py-6 text-muted-foreground"
               aria-busy="true"
               aria-live="polite"
            >
               <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </div>
         )
      }
      return (
         <CatalogSidebarSelectList
            id={id}
            flabel={flabel}
            opts={opts}
            value={st.select}
            allLabel={t('common.all')}
            onPick={(next) => onChange(def.key, { ...st, select: next })}
         />
      )
   }

   if (def.type === 'checkbox') {
      return (
         <CatalogSidebarCheckboxList
            id={id}
            flabel={flabel}
            value={st.checkbox}
            t={t}
            onPick={(next) => onChange(def.key, { ...st, checkbox: next })}
         />
      )
   }

   if (def.type === 'date') {
      return (
         <div className="space-y-2">
            <Label className="sr-only">{flabel}</Label>
            <div className="flex flex-col flex-nowrap gap-2">
               <Input
                  type="date"
                  className="h-9 max-w-full"
                  aria-label={`${flabel} — ${t('catalog.dateFrom')}`}
                  value={st.date?.from ?? ''}
                  onChange={(e) =>
                     onChange(def.key, {
                        ...st,
                        date: { ...st.date, from: e.target.value || undefined },
                     })
                  }
               />
               <Input
                  type="date"
                  className="h-9 max-w-full"
                  aria-label={`${flabel} — ${t('catalog.dateTo')}`}
                  value={st.date?.to ?? ''}
                  onChange={(e) =>
                     onChange(def.key, {
                        ...st,
                        date: { ...st.date, to: e.target.value || undefined },
                     })
                  }
               />
            </div>
         </div>
      )
   }

   if (def.type === 'histogramDate') {
      return (
         <CatalogDateHistogramSlider
            catalogModel={catalogKey}
            field={def.key}
            statsQuery={statsQuery}
            filterDefs={filterDefs}
            flabel={flabel}
            sidebarField
            deferFacetFetch={deferFacetFetch}
            st={st}
            onChange={(next) => onChange(def.key, next)}
         />
      )
   }

   if (def.type === 'experimentList') {
      const facetQuery = buildFacetStatsQuery(statsQuery, filterDefs, def.key)
      return (
         <CatalogExperimentFilterList
            statsQuery={facetQuery}
            deferFacetFetch={deferFacetFetch}
            selectedAccession={st.select}
            onSelect={(acc) => onChange(def.key, { ...st, select: acc })}
            title={flabel}
         />
      )
   }

   if (def.type === 'thresholdPair' && def.thresholdPair?.length) {
      return (
         <div className="space-y-3.5">
            {def.thresholdPair.map((p) => {
               const rowLabel = resolveThresholdPairRowLabel(p, locale, t)
               const pairSt = allFilterValues[p.key] ?? {}
               const pid = fieldId({ ...def, key: p.key } as ConfigFilter)
               return (
                  <div key={p.key} className="flex min-h-[2.5rem] items-start gap-2 py-0.5">
                     <Checkbox
                        id={pid}
                        checked={pairSt.checkbox === true}
                        onCheckedChange={(c) =>
                           onChange(p.key, { ...pairSt, checkbox: c === true ? true : undefined })
                        }
                        className="mt-0.5"
                     />
                     <Label
                        htmlFor={pid}
                        className="cursor-pointer text-sm font-normal leading-snug text-foreground"
                     >
                        {rowLabel}
                     </Label>
                  </div>
               )
            })}
         </div>
      )
   }

   if (def.type === 'thresholdToggle' || def.type === 'referenceGenome') {
      const checkboxLine =
         def.type === 'referenceGenome'
            ? resolveFilterCheckboxLabel(def, flabel, locale, t)
            : flabel
      return (
         <div className="flex min-h-[2.5rem] items-start gap-2 py-0.5">
            <Checkbox
               id={id}
               checked={st.checkbox === true}
               onCheckedChange={(c) =>
                  onChange(def.key, { ...st, checkbox: c === true ? true : undefined })
               }
               className="mt-0.5"
            />
            <Label
               htmlFor={id}
               className="cursor-pointer text-sm font-normal leading-snug text-foreground"
            >
               {checkboxLine}
            </Label>
         </div>
      )
   }

   return null
}

/** Sidebar: only one collapsible open; mount filter controls when open so facet `/stats` calls run on expand. */
function CatalogSidebarModelFilterRows({
   defs,
   catalogKey,
   filterValues,
   onChange,
   locale,
   t,
   selectOptions,
   selectOptionsLoading,
   ensureSelectOptionsLoaded,
   statsQuery,
   filterDefs,
}: {
   defs: ConfigFilter[]
   catalogKey: DataModels
   filterValues: Record<string, FilterValuesState | undefined>
   onChange: (key: string, next: FilterValuesState | undefined) => void
   locale: string
   t: (key: string) => string
   selectOptions: Record<string, SelectOptionWithCount[]>
   selectOptionsLoading?: Record<string, boolean>
   ensureSelectOptionsLoaded?: (fieldKey: string) => void
   statsQuery: Record<string, string | number | boolean>
   filterDefs: ConfigFilter[] | undefined
}) {
   const { openSection } = useCatalogFilterAccordion()

   return (
      <>
         {defs.map((def) => {
            const st = filterValues[def.key] ?? {}
            const flabel = resolveCatalogFilterLabel(def, locale, t)
            const sectionId = catalogFilterSectionId(def.key)
            const isOpen = openSection === sectionId
            const active = isFieldActive(def, filterValues)
            const title =
               def.type === 'referenceGenome' ? (
                  <span className="flex min-w-0 items-center gap-2">
                     <ReferenceGenomeStarMark size="sm" title={flabel} aria-label={flabel} />
                     <span className="min-w-0 truncate">{flabel}</span>
                  </span>
               ) : (
                  flabel
               )
            return (
               <CatalogFilterCollapsible
                  key={def.key}
                  sectionId={sectionId}
                  title={title}
                  isActive={active}
                  clearLabel={t('catalog.clearThisFilter')}
                  onReset={
                     def.type === 'thresholdPair' && def.thresholdPair?.length
                        ? () => {
                             for (const p of def.thresholdPair!) {
                                onChange(p.key, undefined)
                             }
                          }
                        : () => onChange(def.key, undefined)
                  }
                  onPanelOpen={
                     def.type === 'select' && ensureSelectOptionsLoaded
                        ? () => ensureSelectOptionsLoaded(def.key)
                        : undefined
                  }
               >
                  {isOpen ? (
                     <CatalogFilterControl
                        def={def}
                        st={st}
                        flabel={flabel}
                        t={t}
                        onChange={onChange}
                        selectOptions={selectOptions}
                        selectFieldLoading={
                           def.type === 'select' ? Boolean(selectOptionsLoading?.[def.key]) : false
                        }
                        catalogKey={catalogKey}
                        filterDefs={filterDefs}
                        allFilterValues={filterValues}
                        statsQuery={statsQuery}
                        deferFacetFetch
                     />
                  ) : null}
               </CatalogFilterCollapsible>
            )
         })}
      </>
   )
}

export type CatalogFiltersProps = {
   catalogKey: DataModels
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   onChange: (key: string, next: FilterValuesState | undefined) => void
   statsQuery: Record<string, string | number | boolean>
   selectOptions: Record<string, SelectOptionWithCount[]>
   /** Lazy-load select facet counts (sidebar: first expand). */
   ensureSelectOptionsLoaded?: (fieldKey: string) => void
   /** Per-field loading for select stats. */
   selectOptionsLoading?: Record<string, boolean>
}

export function CatalogFilters({
   catalogKey,
   filterDefs,
   filterValues,
   onChange,
   statsQuery,
   selectOptions,
   ensureSelectOptionsLoaded,
   selectOptionsLoading,
}: CatalogFiltersProps) {
   const { locale, t } = useLocale()
   const defs = filterDefs ?? []

   return (
      <CatalogFilterAccordionProvider>
         <div className={filterSidebarScrollColumnClassName}>
            {defs.length > 0 ? (
               <CatalogSidebarModelFilterRows
                  defs={defs}
                  catalogKey={catalogKey}
                  filterValues={filterValues}
                  onChange={onChange}
                  locale={locale}
                  t={t}
                  selectOptions={selectOptions}
                  selectOptionsLoading={selectOptionsLoading}
                  ensureSelectOptionsLoaded={ensureSelectOptionsLoaded}
                  statsQuery={statsQuery}
                  filterDefs={filterDefs}
               />
            ) : null}
         </div>
      </CatalogFilterAccordionProvider>
   )
}
