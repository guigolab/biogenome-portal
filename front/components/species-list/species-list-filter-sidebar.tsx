'use client'

import type { ReactNode } from 'react'
import {
   FilterSectionCollapsible,
   FilterSidebarSearchCard,
   filterSidebarScrollColumnClassName,
} from '@/components/filters/filter-sidebar-template'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { showCmsLoginNav } from '@/lib/portal'
import type { CitizenTaxonomyConfig, CitizenTaxonomyNode, SpeciesListFacetDef } from '@/lib/portal/types'
import type { TaxonRecord } from '@/lib/api/taxon'
import { sortStatEntriesByCountDesc } from '@/lib/speciesFieldStats'
import type { RankGroupDef } from '@/lib/taxonRankFilter'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { SpeciesCountryListFilter } from '@/components/species-list/species-country-list-filter'
import { SpeciesDataFilterList } from '@/components/species-list/species-data-filter-list'
import { SpeciesStringMultiselectFilter } from '@/components/species-list/species-string-multiselect-filter'
import { GoatStatusFilterList } from '@/components/species-list/goat-target-filter-lists'
import { TaxonomyFilterSection } from '@/components/species-list/taxonomy-filter-section'
import type { RankTaxonCache } from '@/components/species-list/types'
import type { GoatTrackerStage } from '@/lib/goatPipelineTracker'
import type { SpeciesDataFilterCode } from '@/lib/speciesDataFilter'
import {
   resolveSpeciesListFacetAriaLabel,
   resolveSpeciesListFacetClearLabel,
   resolveSpeciesListFacetLabel,
   resolveSpeciesListFacetSearchPlaceholder,
   speciesListFacetSectionId,
} from '@/lib/speciesListFacets'
import {
   COUNTRIES_SECTION_ID,
   DATA_SECTION_ID,
   GOAT_STATUS_SECTION_ID,
   IUCN_SECTION_ID,
   SpeciesListFilterAccordionProvider,
   SUB_PROJECT_SECTION_ID,
   TAXONOMY_SECTION_ID,
   useSpeciesListFilterAccordion,
} from './species-list-filter-accordion-context'

function SpeciesFilterCollapsible({
   sectionId,
   title,
   children,
   onPanelOpen,
}: {
   sectionId: string
   title: string
   children: ReactNode
   /** @deprecated Facet stats load from `SpeciesListFacetStatsSync` when this section is open. */
   onPanelOpen?: () => void
}) {
   const { openSection, setOpenSection } = useSpeciesListFilterAccordion()
   const isOpen = openSection === sectionId

   return (
      <FilterSectionCollapsible
         open={isOpen}
         onOpenChange={(next) => {
            setOpenSection(next ? sectionId : undefined)
            if (next && onPanelOpen) onPanelOpen()
         }}
         title={title}
      >
         {children}
      </FilterSectionCollapsible>
   )
}

function IucnFilterList({
   iucnThreatFilter,
   onIucnChange,
   iucnOptions,
   labelIucn,
}: {
   iucnThreatFilter: string
   onIucnChange: (value: string) => void
   iucnOptions: [string, number][]
   labelIucn: (code: string) => string
}) {
   const { t } = useLocale()
   const visibleOptions = iucnOptions.filter(
      ([code, count]) => count > 0 || iucnThreatFilter === code,
   )
   return (
      <div
         className="max-h-[min(50vh,20rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-label={t('speciesList.filterByIucnCategory')}
      >
         <button
            type="button"
            role="option"
            aria-selected={iucnThreatFilter === 'all'}
            className={cn(
               'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
               iucnThreatFilter === 'all' && 'bg-muted',
            )}
            onClick={() => onIucnChange('all')}
         >
            <Check className={cn('h-4 w-4 shrink-0', iucnThreatFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1 font-medium">{t('speciesList.allIucnCategories')}</span>
         </button>
         {visibleOptions.map(([code, count]) => {
            const sel = iucnThreatFilter === code
            return (
               <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={cn(
                     'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                     sel && 'bg-muted',
                  )}
                  onClick={() => onIucnChange(code)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{labelIucn(code)}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                     {count.toLocaleString()}
                  </span>
               </button>
            )
         })}
      </div>
   )
}

function StringBucketFilterList({
   value,
   onChange,
   options,
   allLabel,
   ariaLabel,
   formatOptionLabel,
}: {
   value: string
   onChange: (next: string) => void
   options: [string, number][]
   allLabel: string
   ariaLabel: string
   formatOptionLabel?: (code: string) => string
}) {
   const visibleOptions = options.filter(([code, count]) => count > 0 || value === code)
   return (
      <div
         className="max-h-[min(50vh,20rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-label={ariaLabel}
      >
         <button
            type="button"
            role="option"
            aria-selected={value === 'all'}
            className={cn(
               'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
               value === 'all' && 'bg-muted',
            )}
            onClick={() => onChange('all')}
         >
            <Check className={cn('h-4 w-4 shrink-0', value === 'all' ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1 font-medium">{allLabel}</span>
         </button>
         {visibleOptions.map(([code, count], idx) => {
            const sel = value === code
            const label = formatOptionLabel ? formatOptionLabel(code) : code
            return (
               <button
                  key={`${idx}-${code || '__empty__'}`}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={cn(
                     'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                     sel && 'bg-muted',
                  )}
                  onClick={() => onChange(code)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                     {count.toLocaleString()}
                  </span>
               </button>
            )
         })}
      </div>
   )
}

export type SpeciesListFiltersPanelProps = {
   className?: string
   searchInput: string
   onSearchChange: (value: string) => void
   visibleRankGroups: RankGroupDef[]
   rankStats: Record<string, number> | null
   explorerRankId: string
   onExplorerRankIdChange: (rankId: string) => void
   taxonCacheForExplorerRank: RankTaxonCache
   onLoadMoreExplorerRank: () => void
   treeSelectedTaxons: TaxonRecord[]
   onTreeTaxonToggle: (taxon: TaxonRecord) => void
   onClearTaxonomyLineage: () => void
   lineageActive: boolean
   citizenTaxonomy: CitizenTaxonomyConfig | null
   selectedCitizenNodeId: string | null
   onCitizenNodeSelect: (node: CitizenTaxonomyNode) => void
   onTaxonomyBrowseModeChange?: (mode: 'citizen' | 'full') => void
   iucnFilterVisible: boolean
   iucnThreatFilter: string
   onIucnChange: (value: string) => void
   iucnOptions: [string, number][]
   labelIucn: (code: string) => string
   subProjectFilterVisible: boolean
   subProjectFilter: string
   subProjectOptions: [string, number][]
   onSubProjectChange: (value: string) => void
   onSubProjectPanelOpen?: () => void
   formatMetadataBucketLabel: (code: string) => string
   countryFilterSectionVisible: boolean
   countryStats: Record<string, number> | null
   selectedCountryCodes: string[]
   onToggleCountryCode: (alpha2: string) => void
   onClearCountrySelection: () => void
   /** Portal-declared metadata facets (public species list). */
   speciesListFacets?: SpeciesListFacetDef[]
   facetSelections?: Record<string, string[]>
   facetStats?: Record<string, Record<string, number> | null>
   onToggleFacetValue?: (key: string, value: string) => void
   onClearFacetSelection?: (key: string) => void
   /** When true, show GoaT filter collapses (portal `general.goat`). */
   showGoatFilters?: boolean
   goatTrackerStages?: GoatTrackerStage[]
   goatStatusFilters?: string[]
   onToggleGoatStatus?: (key: string) => void
   goatStats?: Record<string, number> | null
   goatFacetStatsLoading?: boolean
   insdcCountFilters?: SpeciesDataFilterCode[]
   onToggleInsdcCount?: (key: SpeciesDataFilterCode) => void
   insdcCountStats?: Record<string, number> | null
   insdcCountStatsLoading?: boolean
}

export type SpeciesListFilterSidebarProps = SpeciesListFiltersPanelProps & {
   onTaxonomySectionOpen: () => void
   wrapperClassName?: string
}

export function SpeciesListFiltersPanel({
   className,
   searchInput,
   onSearchChange,
   visibleRankGroups,
   rankStats,
   explorerRankId,
   onExplorerRankIdChange,
   taxonCacheForExplorerRank,
   onLoadMoreExplorerRank,
   treeSelectedTaxons,
   onTreeTaxonToggle,
   onClearTaxonomyLineage,
   lineageActive,
   citizenTaxonomy,
   selectedCitizenNodeId,
   onCitizenNodeSelect,
   onTaxonomyBrowseModeChange,
   iucnFilterVisible,
   iucnThreatFilter,
   onIucnChange,
   iucnOptions,
   labelIucn,
   subProjectFilterVisible,
   subProjectFilter,
   subProjectOptions,
   onSubProjectChange,
   formatMetadataBucketLabel,
   countryFilterSectionVisible,
   countryStats,
   selectedCountryCodes,
   onToggleCountryCode,
   onClearCountrySelection,
   speciesListFacets = [],
   facetSelections = {},
   facetStats = {},
   onToggleFacetValue,
   onClearFacetSelection,
   showGoatFilters = false,
   goatTrackerStages = [],
   goatStatusFilters = [],
   onToggleGoatStatus,
   goatStats = null,
   goatFacetStatsLoading: goatFacetStatsLoadingProp,
   insdcCountFilters = [],
   onToggleInsdcCount,
   insdcCountStats = null,
   insdcCountStatsLoading = false,
}: SpeciesListFiltersPanelProps) {
   const { t, locale } = useLocale()
   const { config } = usePortalConfig()
   const cmsEnabledFromConfig = showCmsLoginNav(config)
   const { openSection } = useSpeciesListFilterAccordion()
   const goatFacetStatsLoading =
      goatFacetStatsLoadingProp ??
      (showGoatFilters ? openSection === GOAT_STATUS_SECTION_ID && goatStats == null : false)
   const dataFacetStatsLoading =
      insdcCountStatsLoading || (openSection === DATA_SECTION_ID && insdcCountStats == null)

   return (
      <div className={cn(filterSidebarScrollColumnClassName, className)}>
         <FilterSidebarSearchCard
            inputId="species-filters-search"
            label={t('speciesList.searchByNameTaxonomyId')}
            placeholder={t('speciesList.searchPlaceholder')}
            value={searchInput}
            onChange={onSearchChange}
            ariaLabel={t('speciesList.searchByNameTaxonomyId')}
         />
         <SpeciesFilterCollapsible
            sectionId={TAXONOMY_SECTION_ID}
            title={t('speciesList.taxonomySectionTitle')}
         >
            <TaxonomyFilterSection
               visibleRankGroups={visibleRankGroups}
               rankStats={rankStats}
               explorerRankId={explorerRankId}
               onExplorerRankIdChange={onExplorerRankIdChange}
               taxonCache={taxonCacheForExplorerRank}
               lineageActive={lineageActive}
               treeSelectedTaxons={treeSelectedTaxons}
               onTaxonToggle={onTreeTaxonToggle}
               onClearLineage={onClearTaxonomyLineage}
               onLoadMoreRank={onLoadMoreExplorerRank}
               citizenTaxonomy={citizenTaxonomy}
               selectedCitizenNodeId={selectedCitizenNodeId}
               onCitizenNodeSelect={onCitizenNodeSelect}
               onBrowseModeChange={onTaxonomyBrowseModeChange}
            />
         </SpeciesFilterCollapsible>
         {showGoatFilters && onToggleGoatStatus ? (
            <SpeciesFilterCollapsible sectionId={GOAT_STATUS_SECTION_ID} title={t('statusPage.filterGoatSectionTitle')}>
               <GoatStatusFilterList
                  stages={goatTrackerStages}
                  selectedKeys={goatStatusFilters}
                  onToggleKey={onToggleGoatStatus}
                  loading={goatFacetStatsLoading}
               />
            </SpeciesFilterCollapsible>
         ) : null}
         {onToggleInsdcCount ? (
            <SpeciesFilterCollapsible sectionId={DATA_SECTION_ID} title={t('speciesList.dataSectionTitle')}>
               <SpeciesDataFilterList
                  selectedKeys={insdcCountFilters}
                  onToggleKey={onToggleInsdcCount}
                  counts={insdcCountStats}
                  loading={dataFacetStatsLoading}
               />
            </SpeciesFilterCollapsible>
         ) : null}
         {iucnFilterVisible ? (
            <SpeciesFilterCollapsible sectionId={IUCN_SECTION_ID} title={t('speciesList.iucnSectionTitle')}>
               <IucnFilterList
                  iucnThreatFilter={iucnThreatFilter}
                  onIucnChange={onIucnChange}
                  iucnOptions={iucnOptions}
                  labelIucn={labelIucn}
               />
            </SpeciesFilterCollapsible>
         ) : null}
         {subProjectFilterVisible && cmsEnabledFromConfig ? (
            <SpeciesFilterCollapsible sectionId={SUB_PROJECT_SECTION_ID} title={t('speciesList.subProjectSectionTitle')}>
               <StringBucketFilterList
                  value={subProjectFilter}
                  onChange={onSubProjectChange}
                  options={subProjectOptions}
                  allLabel={t('speciesList.allSubProjects')}
                  ariaLabel={t('speciesList.filterBySubProject')}
                  formatOptionLabel={formatMetadataBucketLabel}
               />
            </SpeciesFilterCollapsible>
         ) : null}
         {onToggleFacetValue && onClearFacetSelection
            ? speciesListFacets.map((facet) => {
                 const sectionId = speciesListFacetSectionId(facet.key)
                 const title = resolveSpeciesListFacetLabel(facet, locale, t)
                 const stats = facetStats[facet.key] ?? null
                 const selected = facetSelections[facet.key] ?? []
                 const loading = openSection === sectionId && stats == null
                 return (
                    <SpeciesFilterCollapsible key={facet.key} sectionId={sectionId} title={title}>
                       {facet.multiSelect ? (
                          <SpeciesStringMultiselectFilter
                             stats={stats}
                             selectedValues={selected}
                             onToggleValue={(value) => onToggleFacetValue(facet.key, value)}
                             onClearSelection={() => onClearFacetSelection(facet.key)}
                             ariaLabel={resolveSpeciesListFacetAriaLabel(facet, locale, t)}
                             searchPlaceholder={resolveSpeciesListFacetSearchPlaceholder(facet, t)}
                             clearLabel={resolveSpeciesListFacetClearLabel(facet, t)}
                             loading={loading}
                          />
                       ) : (
                          <StringBucketFilterList
                             value={selected[0] ?? 'all'}
                             onChange={(value) => onToggleFacetValue(facet.key, value)}
                             options={sortStatEntriesByCountDesc(Object.entries(stats ?? {}))}
                             allLabel={`All ${title}`}
                             ariaLabel={resolveSpeciesListFacetAriaLabel(facet, locale, t)}
                             formatOptionLabel={formatMetadataBucketLabel}
                          />
                       )}
                    </SpeciesFilterCollapsible>
                 )
              })
            : null}
         {countryFilterSectionVisible ? (
            <SpeciesFilterCollapsible sectionId={COUNTRIES_SECTION_ID} title={t('speciesList.countrySectionTitle')}>
               <SpeciesCountryListFilter
                  countryStats={countryStats ?? {}}
                  selectedCodes={selectedCountryCodes}
                  onToggleCode={onToggleCountryCode}
                  onClearSelection={onClearCountrySelection}
               />
            </SpeciesFilterCollapsible>
         ) : null}
      </div>
   )
}

export function SpeciesListFilterSidebar({
   wrapperClassName,
   onTaxonomySectionOpen,
   ...panelProps
}: SpeciesListFilterSidebarProps) {
   return (
      <div className={cn(wrapperClassName)}>
         <SpeciesListFilterAccordionProvider onTaxonomySectionOpen={onTaxonomySectionOpen}>
            <SpeciesListFiltersPanel {...panelProps} />
         </SpeciesListFilterAccordionProvider>
      </div>
   )
}
