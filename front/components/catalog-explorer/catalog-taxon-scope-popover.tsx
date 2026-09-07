'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'

import { CompactTaxonomicTree } from '@/components/compact-taxonomy-tree'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLocale } from '@/contexts/locale-context'
import { taxonRecordFromApi, type TaxonRecord } from '@/lib/api/taxon'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import { cn } from '@/lib/utils'
import { ChevronDown, ExternalLink, Loader2, Network, X } from 'lucide-react'

function taxonDisplayName(row: Record<string, unknown>): string {
   const n = row.name ?? row.scientific_name
   return typeof n === 'string' && n.trim() ? n.trim() : String(row.taxid ?? '')
}

function taxonHasChildren(row: Record<string, unknown> | null): boolean {
   if (!row) return false
   const raw = row.children
   return Array.isArray(raw) && raw.length > 0
}

export type CatalogTaxonScopePopoverProps = {
   speciesTaxid: string | null
   scopedTaxonDoc: Record<string, unknown> | null
   scopedTaxonLoading: boolean
   scopedTaxonError: string | null
   onSelectTaxon: (taxid: string, node: Record<string, unknown>) => void
   onClearTaxon: () => void
}

export function CatalogTaxonScopePopover({
   speciesTaxid,
   scopedTaxonDoc,
   scopedTaxonLoading,
   scopedTaxonError,
   onSelectTaxon,
   onClearTaxon,
}: CatalogTaxonScopePopoverProps) {
   const { t } = useLocale()
   const [open, setOpen] = useState(false)

   const hasSelection = Boolean(speciesTaxid?.trim())

   const selectedLabel = useMemo(() => {
      if (!speciesTaxid?.trim()) return ''
      return taxonDisplayName(scopedTaxonDoc ?? { taxid: speciesTaxid })
   }, [speciesTaxid, scopedTaxonDoc])

   const selectedDetailsHref = useMemo(() => {
      const tid = speciesTaxid?.trim()
      if (!tid) return '#'
      if (taxonHasChildren(scopedTaxonDoc)) {
         return taxonomyTaxonHref(tid)
      }
      return `/species/${encodeURIComponent(tid)}`
   }, [speciesTaxid, scopedTaxonDoc])

   const treeSelectedTaxons = useMemo((): TaxonRecord[] => {
      if (!speciesTaxid?.trim()) return []
      if (scopedTaxonDoc) return [taxonRecordFromApi(scopedTaxonDoc)]
      return [
         {
            taxid: speciesTaxid.trim(),
            scientific_name: selectedLabel || speciesTaxid.trim(),
            name: selectedLabel || speciesTaxid.trim(),
            organisms_count: 0,
            assemblies_count: 0,
            annotations_count: 0,
         },
      ]
   }, [speciesTaxid, scopedTaxonDoc, selectedLabel])

   const handleTreeTaxonToggle = useCallback(
      (taxon: TaxonRecord) => {
         if (speciesTaxid === taxon.taxid) {
            onClearTaxon()
            return
         }
         onSelectTaxon(taxon.taxid, taxon as unknown as Record<string, unknown>)
         setOpen(false)
      },
      [speciesTaxid, onClearTaxon, onSelectTaxon],
   )

   return (
      <div className="min-w-0 shrink-0">
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  type="button"
                  variant="outline"
                  className={cn(
                     'h-10 max-w-full gap-2 px-3',
                     hasSelection &&
                        'border-primary bg-primary/10 text-foreground ring-1 ring-primary/25 dark:bg-primary/15',
                  )}
                  aria-label={t('catalog.taxonScopeButtonAria')}
                  aria-expanded={open}
               >
                  <Network className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {scopedTaxonLoading ? (
                     <span className="inline-flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        {t('catalog.taxonScopeLoading')}
                     </span>
                  ) : hasSelection ? (
                     <span className="min-w-0 truncate">
                        <span className="font-medium">{selectedLabel}</span>
                        <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                           ({speciesTaxid!.trim()})
                        </span>
                     </span>
                  ) : (
                     <span className="truncate text-muted-foreground">
                        {t('catalog.taxonScopeButtonAll')}
                     </span>
                  )}
                  <ChevronDown
                     className={cn(
                        'ml-auto h-4 w-4 shrink-0 opacity-60 transition-transform',
                        open && 'rotate-180',
                     )}
                     aria-hidden
                  />
               </Button>
            </PopoverTrigger>

            <PopoverContent
               align="start"
               className="w-[min(100vw-2rem,22rem)] p-0"
               sideOffset={6}
            >
               <div className="space-y-2 border-b border-border px-3 py-2.5">
                  {hasSelection ? (
                     <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-semibold leading-tight">
                              {scopedTaxonLoading ? (
                                 <span className="inline-flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                    {t('catalog.taxonScopeLoading')}
                                 </span>
                              ) : (
                                 <>
                                    <span>{selectedLabel}</span>
                                    <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                                       ({speciesTaxid!.trim()})
                                    </span>
                                 </>
                              )}
                           </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                           <Button type="button" variant="secondary" size="icon" className="h-8 w-8" asChild>
                              <Link
                                 href={selectedDetailsHref}
                                 title={t('catalog.taxonScopeViewInTaxonomy')}
                              >
                                 <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                 <span className="sr-only">{t('catalog.taxonScopeViewInTaxonomy')}</span>
                              </Link>
                           </Button>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={onClearTaxon}
                              title={t('catalog.taxonScopeClear')}
                           >
                              <X className="h-3.5 w-3.5" aria-hidden />
                              <span className="sr-only">{t('catalog.taxonScopeClear')}</span>
                           </Button>
                        </div>
                     </div>
                  ) : (
                     <p className="text-xs text-muted-foreground">{t('catalog.taxonScopeBrowseHint')}</p>
                  )}
               </div>

               <div className="flex h-[min(60vh,22rem)] min-h-0 flex-col overflow-hidden p-2">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
                     <CompactTaxonomicTree
                        variant="root"
                        selectedTaxons={treeSelectedTaxons}
                        onTaxonToggle={handleTreeTaxonToggle}
                        selectionMode="single"
                        fillContainer
                     />
                  </div>
               </div>
            </PopoverContent>
         </Popover>

         {scopedTaxonError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
               {scopedTaxonError}
            </p>
         ) : null}
      </div>
   )
}
