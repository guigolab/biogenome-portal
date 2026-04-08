'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { goatStatusTrackerBadgeStyle } from '@/lib/goatPipelineTracker'
import { labelGoatStatus, labelTargetListStatus } from '@/lib/organismStatusLabels'
import { useLocale } from '@/contexts/locale-context'
import { Filter, Loader2 } from 'lucide-react'

function speciesHref(taxid: string): string {
   return `/species/${encodeURIComponent(taxid)}`
}

function normalizeStatusValue(raw: unknown, fallback = 'No Entry'): string {
   if (raw == null || raw === '') return fallback
   return String(raw)
}

function classOrderFamilyFromOrganism(organism: Record<string, unknown>): {
   className: string | null
   order: string | null
   family: string | null
} {
   const raw = organism.lineage_rank_labels
   if (!raw || typeof raw !== 'object') {
      return { className: null, order: null, family: null }
   }
   const labels = raw as Record<string, unknown>
   const pick = (key: string): string | null => {
      const v = labels[key]
      if (typeof v !== 'string') return null
      const t = v.trim()
      return t ? t : null
   }
   return {
      className: pick('class_name'),
      order: pick('order'),
      family: pick('family'),
   }
}

type SpeciesStatusTableProps = {
   rows: Record<string, unknown>[]
   /** Total matching filters (for load more). */
   tableTotal: number
   tableLoading: boolean
   tableLoadingMore: boolean
   tableError: string | null
   onLoadMore: () => void
   hasActiveFilters: boolean
   onClearFilters: () => void
}

export function SpeciesStatusTable({
   rows,
   tableTotal,
   tableLoading,
   tableLoadingMore,
   tableError,
   onLoadMore,
   hasActiveFilters,
   onClearFilters,
}: SpeciesStatusTableProps) {
   const { t } = useLocale()

   function interpolate(template: string, vars: Record<string, string | number>): string {
      let out = template
      for (const [k, v] of Object.entries(vars)) {
         out = out.replaceAll(`{${k}}`, String(v))
      }
      return out
   }

   return (
      <div>
         {tableError ? <p className="text-sm text-destructive mb-4">{tableError}</p> : null}
         {tableLoading && rows.length === 0 ? (
            <div className="flex justify-center py-16 text-muted-foreground">
               <Loader2 className="h-8 w-8 animate-spin" aria-label={t('common.loading')} />
            </div>
         ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
               <Filter className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" aria-hidden />
               <p className="text-base font-medium text-foreground">{t('statusPage.emptyTitle')}</p>
               <p className="mt-2 text-sm text-muted-foreground">{t('statusPage.emptyBody')}</p>
               {hasActiveFilters ? (
                  <Button type="button" variant="outline" size="sm" className="mt-6" onClick={onClearFilters}>
                     {t('statusPage.clearFilters')}
                  </Button>
               ) : null}
            </div>
         ) : (
            <>
               <div className="overflow-x-auto [scrollbar-gutter:stable]">
               <Table>
                  <TableHeader>
                     <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-[26%] max-w-[16rem] min-w-[9rem] text-sm font-medium text-muted-foreground">
                           {t('statusPage.tableColName')}
                        </TableHead>
                        <TableHead className="min-w-[6rem] text-sm font-medium text-muted-foreground">
                           {t('statusPage.tableColClass')}
                        </TableHead>
                        <TableHead className="min-w-[6rem] text-sm font-medium text-muted-foreground">
                           {t('statusPage.tableColOrder')}
                        </TableHead>
                        <TableHead className="min-w-[6rem] text-sm font-medium text-muted-foreground">
                           {t('statusPage.tableColFamily')}
                        </TableHead>
                        <TableHead className="text-sm font-medium text-muted-foreground">
                           {t('statusPage.tableColGoat')}
                        </TableHead>
                        <TableHead className="text-sm font-medium text-muted-foreground">
                           {t('statusPage.tableColTargetList')}
                        </TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {rows.map((row, idx) => {
                        const taxid = row.taxid != null ? String(row.taxid) : ''
                        const sci =
                           typeof row.scientific_name === 'string' ? row.scientific_name : taxid || '—'
                        const { className: classVal, order, family } = classOrderFamilyFromOrganism(row)
                        const goatPrimary = normalizeStatusValue(row.goat_status)
                        const recordedLabel = labelGoatStatus(goatPrimary)
                        const tls = labelTargetListStatus(row.target_list_status)

                        return (
                           <TableRow key={taxid || `row-${idx}`} className="border-border">
                              <TableCell className="align-top py-3 font-normal">
                                 <Link
                                    href={speciesHref(taxid)}
                                    className="text-[15px] font-medium text-primary hover:underline underline-offset-2"
                                 >
                                    {sci}
                                 </Link>
                              </TableCell>
                              <TableCell className="align-top py-3 text-sm text-foreground">
                                 {classVal ?? '—'}
                              </TableCell>
                              <TableCell className="align-top py-3 text-sm text-foreground">
                                 {order ?? '—'}
                              </TableCell>
                              <TableCell className="align-top py-3 text-sm text-foreground">
                                 {family ?? '—'}
                              </TableCell>
                              <TableCell className="align-top py-3">
                                 <span
                                    className="inline-flex max-w-full whitespace-normal rounded-md border px-2 py-0.5 text-xs font-medium leading-snug"
                                    style={goatStatusTrackerBadgeStyle(goatPrimary)}
                                 >
                                    {recordedLabel}
                                 </span>
                              </TableCell>
                              <TableCell className="align-top py-3">
                                 <Badge variant="outline" className="max-w-full whitespace-normal font-normal">
                                    {tls || '—'}
                                 </Badge>
                              </TableCell>
                           </TableRow>
                        )
                     })}
                  </TableBody>
               </Table>
               </div>
               {rows.length < tableTotal ? (
                  <div className="mt-6 flex justify-center">
                     <Button type="button" variant="outline" onClick={() => onLoadMore()} disabled={tableLoadingMore}>
                        {tableLoadingMore ? (
                           <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                              {t('common.loading')}
                           </>
                        ) : (
                           interpolate(t('statusPage.loadMoreLeft'), { left: (tableTotal - rows.length).toLocaleString() })
                        )}
                     </Button>
                  </div>
               ) : null}
            </>
         )}
      </div>
   )
}
