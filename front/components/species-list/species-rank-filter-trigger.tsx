'use client'

import { Button } from '@/components/ui/button'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { RankGroupDef } from '@/lib/taxonRankFilter'
import { RANK_GROUP_TOGGLE_STYLES } from '@/lib/taxonRankFilter'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import type { RankTaxonCache } from './types'

export type SpeciesRankFilterTriggerProps = {
   group: RankGroupDef
   rankCount: number
   rankStatsLoading: boolean
   rankSelected: boolean
   /** Resolved display name when this rank has a selected taxon */
   selectedTaxonName: string | null
   cache: RankTaxonCache
   selectedTaxonTaxid: string | null
   selectedTaxonRankId: string | null
   onSelectTaxon: (taxid: string, rankId: string) => void
   onClearLineage: () => void
   onMenuOpenChange: (open: boolean) => void
   onContentScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

export function SpeciesRankFilterTrigger({
   group: g,
   rankCount,
   rankStatsLoading,
   rankSelected,
   selectedTaxonName,
   cache,
   selectedTaxonTaxid,
   selectedTaxonRankId,
   onSelectTaxon,
   onClearLineage,
   onMenuOpenChange,
   onContentScroll,
}: SpeciesRankFilterTriggerProps) {
   const styles = RANK_GROUP_TOGGLE_STYLES[g.id] ?? RANK_GROUP_TOGGLE_STYLES.phylum
   const taxonHasMore = cache.items.length < cache.total

   const triggerLabel = rankSelected && selectedTaxonName
      ? `${g.label} · ${selectedTaxonName}`
      : g.label

   return (
      <div className="inline-flex max-w-full items-center gap-0.5">
         <DropdownMenu onOpenChange={onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={rankStatsLoading}
                  aria-label={
                     rankSelected && selectedTaxonName
                        ? `${g.label} filter: ${selectedTaxonName}. Open to change.`
                        : `${g.label} filter. Open to choose a taxon.`
                  }
                  className={cn(
                     'h-9 max-w-[min(100%,14rem)] rounded-full border px-2.5 py-0 font-normal gap-1',
                     rankSelected
                        ? cn('ring-2 ring-offset-2 ring-offset-background', styles.ring, styles.active)
                        : styles.inactive,
                  )}
               >
                  <span className="min-w-0 truncate text-left text-xs sm:text-sm">{triggerLabel}</span>
                  <span
                     className={cn(
                        'tabular-nums rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-medium shrink-0',
                        styles.badge,
                     )}
                  >
                     {rankCount.toLocaleString()}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
               align="start"
               className="w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain p-1"
               onScroll={onContentScroll}
               onCloseAutoFocus={(e) => e.preventDefault()}
            >
               <DropdownMenuItem className="text-muted-foreground" onSelect={onClearLineage}>
                  Clear this filter
               </DropdownMenuItem>
               {cache.loading && cache.items.length === 0 ? (
                  <div className="flex justify-center py-8 text-muted-foreground pointer-events-none">
                     <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading taxa" />
                  </div>
               ) : null}
               {!cache.loading && cache.initialized && cache.items.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground pointer-events-none">
                     No taxa in this rank
                  </p>
               ) : null}
               {cache.items.map((t) => {
                  const sel = selectedTaxonTaxid === t.taxid && selectedTaxonRankId === g.id
                  return (
                     <DropdownMenuItem
                        key={t.taxid}
                        className="cursor-pointer gap-2"
                        onSelect={() => onSelectTaxon(t.taxid, g.id)}
                     >
                        <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                        <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                        <span
                           className="shrink-0 tabular-nums text-xs text-muted-foreground"
                           title="Organisms in portal"
                        >
                           {t.organismsCount != null && t.organismsCount > 0
                              ? t.organismsCount.toLocaleString()
                              : '—'}
                        </span>
                     </DropdownMenuItem>
                  )
               })}
               {cache.loadingMore ? (
                  <div className="flex justify-center py-2 pointer-events-none">
                     <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
               ) : null}
               {!taxonHasMore && cache.items.length > 0 && !cache.loading && !cache.loadingMore ? (
                  <p className="px-2 py-1.5 text-center text-[11px] text-muted-foreground pointer-events-none">
                     End of list
                  </p>
               ) : null}
            </DropdownMenuContent>
         </DropdownMenu>
         {rankSelected ? (
            <button
               type="button"
               className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors',
                  'hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
               )}
               aria-label={`Clear ${g.label} filter`}
               onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onClearLineage()
               }}
            >
               <X className="h-4 w-4" aria-hidden />
            </button>
         ) : null}
      </div>
   )
}
