'use client'

import { lazy, Suspense, useEffect } from 'react'

import { CatalogDateHistogramSlider } from '@/components/catalog-explorer/catalog-date-histogram-slider'
import { CatalogExperimentFilterList } from '@/components/catalog-explorer/catalog-experiment-filter-list'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import {
   CatalogFilterAccordionProvider,
   catalogFilterSectionId,
   useCatalogFilterAccordion,
} from '@/components/catalog-explorer/catalog-filter-accordion-context'
import { CatalogFilterCollapsible } from '@/components/catalog-explorer/catalog-filter-collapsible'
import { ReferenceGenomeStarMark } from '@/components/catalog-explorer/reference-genome-star-mark'
import {
   FilterSidebarSearchCard,
   filterSidebarScrollColumnClassName,
} from '@/components/filters/filter-sidebar-template'
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
import { Check, Loader2, Search } from 'lucide-react'

const CatalogSpeciesFilterSection = lazy(async () => {
   const m = await import('@/components/catalog-explorer/catalog-species-filter-section')
   return { default: m.CatalogSpeciesFilterSection }
})

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
   /** Sidebar: title on trigger; use sr-only / aria for inputs. */
   sidebarField: boolean
   catalogKey: DataModels
   filterDefs: ConfigFilter[] | undefined
   allFilterValues: Record<string, FilterValuesState | undefined>
   statsQuery: Record<string, string | number | boolean>
   /** Sidebar accordion: facet APIs only when this section is expanded (see parent conditional render). */
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
   sidebarField,
   catalogKey,
   filterDefs,
   allFilterValues,
   statsQuery,
   deferFacetFetch = false,
}: ControlProps) {
   const { locale } = useLocale()
   const id = fieldId(def)
   const labelClass = sidebarField ? 'sr-only' : 'text-xs text-muted-foreground'

   if (def.type === 'input') {
      return (
         <div className="space-y-1.5">
            <Label htmlFor={id} className={labelClass}>
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
      if (sidebarField) {
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
      if (selectFieldLoading && opts.length === 0) {
         return (
            <div className="space-y-1.5">
               <Label className={labelClass}>{flabel}</Label>
               <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
               </div>
            </div>
         )
      }
      return (
         <div className="space-y-1.5">
            <Label className={labelClass}>{flabel}</Label>
            <Select
               value={st.select ?? 'all'}
               onValueChange={(v) => onChange(def.key, { ...st, select: v === 'all' ? undefined : v })}
            >
               <SelectTrigger id={id} className="h-9 w-full">
                  <SelectValue placeholder={t('common.all')} />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {opts.map(([o]) => (
                     <SelectItem key={o} value={o}>
                        {o}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>
      )
   }

   if (def.type === 'checkbox') {
      if (sidebarField) {
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
      const tri = st.checkbox === true ? 'true' : st.checkbox === false ? 'false' : 'all'
      return (
         <div className="space-y-1.5">
            <Label className={labelClass}>{flabel}</Label>
            <Select
               value={tri}
               onValueChange={(v) => {
                  if (v === 'all') onChange(def.key, { ...st, checkbox: undefined })
                  else if (v === 'true') onChange(def.key, { ...st, checkbox: true })
                  else onChange(def.key, { ...st, checkbox: false })
               }}
            >
               <SelectTrigger id={id} className="h-9 w-full">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="true">{t('catalog.filterChipYes')}</SelectItem>
                  <SelectItem value="false">{t('catalog.filterChipNo')}</SelectItem>
               </SelectContent>
            </Select>
         </div>
      )
   }

   if (def.type === 'date') {
      return (
         <div className={sidebarField ? 'space-y-2' : 'space-y-1.5'}>
            <Label className={labelClass}>{flabel}</Label>
            <div className={cn('flex flex-wrap gap-2', sidebarField && 'flex-col flex-nowrap')}>
               <Input
                  type="date"
                  className={cn('h-9 max-w-[11rem]', sidebarField && 'max-w-full')}
                  aria-label={`${flabel} — ${t('catalog.dateFrom')}`}
                  value={st.date?.from ?? ''}
                  onChange={(e) =>
                     onChange(def.key, {
                        ...st,
                        date: { ...st.date, from: e.target.value || undefined },
                     })
                  }
               />
               {!sidebarField ? <span className="self-center text-muted-foreground text-sm">–</span> : null}
               <Input
                  type="date"
                  className={cn('h-9 max-w-[11rem]', sidebarField && 'max-w-full')}
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
            sidebarField={sidebarField}
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
         <div className={cn('space-y-3', sidebarField && 'space-y-3.5')}>
            {def.thresholdPair.map((p) => {
               const rowLabel = resolveThresholdPairRowLabel(p, locale, t)
               const pairSt = allFilterValues[p.key] ?? {}
               const pid = fieldId({ ...def, key: p.key } as ConfigFilter)
               return (
                  <div
                     key={p.key}
                     className={cn(
                        'flex items-start gap-2',
                        sidebarField ? 'min-h-[2.5rem] py-0.5' : 'space-y-1.5',
                     )}
                  >
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
                        className={cn(
                           'cursor-pointer font-normal leading-snug',
                           sidebarField ? 'text-sm text-foreground' : labelClass,
                        )}
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
      const checkboxLine = def.type === 'referenceGenome'
         ? resolveFilterCheckboxLabel(def, flabel, locale, t)
         : flabel
      return (
         <div
            className={cn(
               'flex items-start gap-2',
               sidebarField ? 'min-h-[2.5rem] py-0.5' : 'space-y-1.5',
            )}
         >
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
               className={cn(
                  'cursor-pointer font-normal leading-snug',
                  sidebarField ? 'text-sm text-foreground' : labelClass,
               )}
            >
               {checkboxLine}
            </Label>
         </div>
      )
   }

   return null
}

/** Sidebar: only one collapsible open; mount filter controls when open so facet `/stats` calls run on expand, not on every filter edit. */
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
                     <ReferenceGenomeStarMark
                        size="sm"
                        title={flabel}
                        aria-label={flabel}
                     />
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
                           def.type === 'select'
                              ? Boolean(selectOptionsLoading?.[def.key])
                              : false
                        }
                        sidebarField
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
   searchValue: string
   onSearchChange: (v: string) => void
   searchPlaceholder: string
   speciesTaxid: string | null
   onSpeciesTaxidChange: (taxid: string | null) => void
   statsQuery: Record<string, string | number | boolean>
   selectOptions: Record<string, SelectOptionWithCount[]>
   /** Lazy-load select facet counts (sidebar: first expand). */
   ensureSelectOptionsLoaded?: (fieldKey: string) => void
   /** Per-field loading for select stats. */
   selectOptionsLoading?: Record<string, boolean>
   /** Narrow sidebar: one collapsible per filter (species sidebar pattern). */
   variant?: 'default' | 'sidebar'
   /** When true, omit the record search field (rendered elsewhere). */
   hideSearch?: boolean
   /** When true, omit the per-catalog species picker (taxon scope lives in the catalog header). */
   hideSpeciesFilter?: boolean
}

export function CatalogFilters({
   catalogKey,
   filterDefs,
   filterValues,
   onChange,
   searchValue,
   onSearchChange,
   searchPlaceholder,
   speciesTaxid,
   onSpeciesTaxidChange,
   statsQuery,
   selectOptions,
   ensureSelectOptionsLoaded,
   selectOptionsLoading,
   variant = 'default',
   hideSearch = false,
   hideSpeciesFilter = false,
}: CatalogFiltersProps) {
   const { locale, t } = useLocale()
   const defs = filterDefs ?? []
   /** Catalog explorer sidebar: start collapsed; other layouts keep species section open when present. */
   const defaultOpen = hideSpeciesFilter ? undefined : catalogFilterSectionId('species')

   const speciesFallback = (
      <div className="flex min-h-[4rem] items-center justify-center rounded-xl border border-border bg-card py-6 text-muted-foreground">
         <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
   )

   /** Default grid: all select controls visible — load facet counts when the hook/callback is ready. */
   useEffect(() => {
      if (variant !== 'default' || !ensureSelectOptionsLoaded) return
      for (const def of filterDefs ?? []) {
         if (def.type === 'select') ensureSelectOptionsLoaded(def.key)
      }
   }, [variant, filterDefs, ensureSelectOptionsLoaded])

   if (variant === 'sidebar') {
      const hasModelFilters = defs.length > 0
      return (
         <CatalogFilterAccordionProvider defaultOpenSectionId={defaultOpen}>
            <div className={filterSidebarScrollColumnClassName}>
               {!hideSearch ? (
                  <FilterSidebarSearchCard
                     inputId="catalog-results-search"
                     label={searchPlaceholder}
                     placeholder={searchPlaceholder}
                     value={searchValue}
                     onChange={onSearchChange}
                  />
               ) : null}
               {!hideSpeciesFilter ? (
                  <Suspense fallback={speciesFallback}>
                     <CatalogSpeciesFilterSection
                        catalogKey={catalogKey}
                        selectedTaxid={speciesTaxid}
                        onSelectTaxid={onSpeciesTaxidChange}
                     />
                  </Suspense>
               ) : null}
               {hasModelFilters ? (
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

   return (
      <div className="space-y-4">
         {!hideSearch ? (
            <div className="relative">
               <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                  className="h-9 pl-9"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
               />
            </div>
         ) : null}
         <CatalogFilterAccordionProvider defaultOpenSectionId={defaultOpen}>
            <div className="space-y-4">
               {!hideSpeciesFilter ? (
                  <Suspense fallback={speciesFallback}>
                     <CatalogSpeciesFilterSection
                        catalogKey={catalogKey}
                        selectedTaxid={speciesTaxid}
                        onSelectTaxid={onSpeciesTaxidChange}
                     />
                  </Suspense>
               ) : null}
               {filterDefs && filterDefs.length > 0 ? (
                  <div className={cn('grid gap-4', 'sm:grid-cols-2 lg:grid-cols-3')}>
                     {filterDefs.map((def) => {
                        const st = filterValues[def.key] ?? {}
                        const flabel = resolveCatalogFilterLabel(def, locale, t)
                        return (
                           <div key={def.key}>
                              <CatalogFilterControl
                                 def={def}
                                 st={st}
                                 flabel={flabel}
                                 t={t}
                                 onChange={onChange}
                                 selectOptions={selectOptions}
                                 selectFieldLoading={
                                    def.type === 'select'
                                       ? Boolean(selectOptionsLoading?.[def.key])
                                       : false
                                 }
                                 sidebarField={false}
                                 catalogKey={catalogKey}
                                 filterDefs={filterDefs}
                                 allFilterValues={filterValues}
                                 statsQuery={statsQuery}
                                 deferFacetFetch={false}
                              />
                           </div>
                        )
                     })}
                  </div>
               ) : null}
            </div>
         </CatalogFilterAccordionProvider>
      </div>
   )
}
