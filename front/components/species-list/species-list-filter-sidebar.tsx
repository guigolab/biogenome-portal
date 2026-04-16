'use client'

import type { ReactNode } from 'react'
import {
   FilterSectionCollapsible,
   FilterSidebarSearchCard,
   filterSidebarScrollColumnClassName,
} from '@/components/filters/filter-sidebar-template'
import { useLocale } from '@/contexts/locale-context'
import type { TaxonRecord } from '@/lib/api/taxon'
import type { RankGroupDef } from '@/lib/taxonRankFilter'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { SpeciesCountryListFilter } from '@/components/species-list/species-country-list-filter'
import { GoatStatusFilterList, TargetListFilterList } from '@/components/species-list/goat-target-filter-lists'
import { TaxonomyFilterSection } from '@/components/species-list/taxonomy-filter-section'
import type { RankTaxonCache } from '@/components/species-list/types'
import type { GoatTrackerStage } from '@/lib/goatPipelineTracker'
import {
   COUNTRIES_SECTION_ID,
   GOAT_STATUS_SECTION_ID,
   IUCN_SECTION_ID,
   SEQUENCING_TYPE_SECTION_ID,
   SpeciesListFilterAccordionProvider,
   SUB_PROJECT_SECTION_ID,
   TAXONOMY_SECTION_ID,
   TARGET_LIST_SECTION_ID,
   useSpeciesListFilterAccordion,
} from './species-list-filter-accordion-context'

function SpeciesFilterCollapsible({
   sectionId,
   title,
   children,
   onPanelOpen,
   /** When true, keep filter body mounted while collapsed (e.g. taxonomy tree state). */
   keepMountedWhenClosed = false,
}: {
   sectionId: string
   title: string
   children: ReactNode
   /** @deprecated Facet stats load from `SpeciesListFacetStatsSync` when this section is open. */
   onPanelOpen?: () => void
   keepMountedWhenClosed?: boolean
}) {
   const { openSection, setOpenSection } = useSpeciesListFilterAccordion()
   const isOpen = openSection === sectionId
   const showChildren = keepMountedWhenClosed || isOpen

   return (
      <FilterSectionCollapsible
         open={isOpen}
         onOpenChange={(next) => {
            setOpenSection(next ? sectionId : undefined)
            if (next && onPanelOpen) onPanelOpen()
         }}
         title={title}
      >
         {showChildren ? children : null}
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
         {iucnOptions.map(([code, count]) => {
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
         {options.map(([code, count], idx) => {
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
   selectedTaxonTaxid: string | null
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
   sequencingTypeFilterVisible: boolean
   sequencingTypeFilter: string
   sequencingTypeOptions: [string, number][]
   onSequencingTypeChange: (value: string) => void
   onSequencingTypePanelOpen?: () => void
   formatMetadataBucketLabel: (code: string) => string
   countryFilterSectionVisible: boolean
   countryStats: Record<string, number> | null
   selectedCountryCodes: string[]
   onToggleCountryCode: (alpha2: string) => void
   onClearCountrySelection: () => void
   /** When true, show GoaT + target list filter collapses (portal `general.goat`). */
   showGoatFilters?: boolean
   goatTrackerStages?: GoatTrackerStage[]
   goatStatusFilters?: string[]
   onToggleGoatStatus?: (key: string) => void
   targetListFilter?: string
   onTargetListChange?: (value: string) => void
   targetListStats?: Record<string, number> | null
   /** Raw facet map for loading spinners when a GoaT section is open (optional if omitted, loading is false). */
   goatStats?: Record<string, number> | null
   goatFacetStatsLoading?: boolean
}

export type SpeciesListFilterSidebarProps = SpeciesListFiltersPanelProps & {
   onTaxonomySectionOpen: () => void
   /** Outer wrapper (e.g. desktop column). */
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
   selectedTaxonTaxid,
   iucnFilterVisible,
   iucnThreatFilter,
   onIucnChange,
   iucnOptions,
   labelIucn,
   subProjectFilterVisible,
   subProjectFilter,
   subProjectOptions,
   onSubProjectChange,
   sequencingTypeFilterVisible,
   sequencingTypeFilter,
   sequencingTypeOptions,
   onSequencingTypeChange,
   formatMetadataBucketLabel,
   countryFilterSectionVisible,
   countryStats,
   selectedCountryCodes,
   onToggleCountryCode,
   onClearCountrySelection,
   showGoatFilters = false,
   goatTrackerStages = [],
   goatStatusFilters = [],
   onToggleGoatStatus,
   targetListFilter = 'all',
   onTargetListChange,
   targetListStats = null,
   goatStats = null,
   goatFacetStatsLoading: goatFacetStatsLoadingProp,
}: SpeciesListFiltersPanelProps) {
   const { t } = useLocale()
   const { openSection } = useSpeciesListFilterAccordion()
   const goatFacetStatsLoading =
      goatFacetStatsLoadingProp ??
      (showGoatFilters
         ? (openSection === GOAT_STATUS_SECTION_ID && goatStats == null) ||
           (openSection === TARGET_LIST_SECTION_ID && targetListStats == null)
         : false)

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
            keepMountedWhenClosed
         >
            <TaxonomyFilterSection
               visibleRankGroups={visibleRankGroups}
               rankStats={rankStats}
               explorerRankId={explorerRankId}
               onExplorerRankIdChange={onExplorerRankIdChange}
               taxonCache={taxonCacheForExplorerRank}
               selectedTaxonTaxid={selectedTaxonTaxid}
               treeSelectedTaxons={treeSelectedTaxons}
               onTaxonToggle={onTreeTaxonToggle}
               onClearLineage={onClearTaxonomyLineage}
               onLoadMoreRank={onLoadMoreExplorerRank}
            />
         </SpeciesFilterCollapsible>
         {showGoatFilters && onToggleGoatStatus && onTargetListChange ? (
            <SpeciesFilterCollapsible sectionId={GOAT_STATUS_SECTION_ID} title={t('statusPage.filterGoatSectionTitle')}>
               <GoatStatusFilterList
                  stages={goatTrackerStages}
                  selectedKeys={goatStatusFilters}
                  onToggleKey={onToggleGoatStatus}
                  loading={goatFacetStatsLoading}
               />
            </SpeciesFilterCollapsible>
         ) : null}
         {showGoatFilters && onTargetListChange ? (
            <SpeciesFilterCollapsible
               sectionId={TARGET_LIST_SECTION_ID}
               title={t('statusPage.filterTargetListSectionTitle')}
            >
               <TargetListFilterList
                  value={targetListFilter}
                  onChange={onTargetListChange}
                  targetListStats={targetListStats}
                  loading={goatFacetStatsLoading}
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
         {subProjectFilterVisible ? (
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
         {sequencingTypeFilterVisible ? (
            <SpeciesFilterCollapsible
               sectionId={SEQUENCING_TYPE_SECTION_ID}
               title={t('speciesList.sequencingTypeSectionTitle')}
            >
               <StringBucketFilterList
                  value={sequencingTypeFilter}
                  onChange={onSequencingTypeChange}
                  options={sequencingTypeOptions}
                  allLabel={t('speciesList.allSequencingTypes')}
                  ariaLabel={t('speciesList.filterBySequencingType')}
                  formatOptionLabel={formatMetadataBucketLabel}
               />
            </SpeciesFilterCollapsible>
         ) : null}
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
