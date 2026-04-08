'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetFooter,
   SheetHeader,
   SheetTitle,
} from '@/components/ui/sheet'
import { downloadCatalogExport, type CatalogExportFormat } from '@/lib/api/catalog'
import type { ConfigFilter, DataModels } from '@/lib/portal/types'
import { buildCatalogQueryParams, type FilterValuesState } from '@/lib/catalogQueryParams'
import { cn } from '@/lib/utils'
import { Download, Loader2 } from 'lucide-react'

export type CatalogExportSheetProps = {
   open: boolean
   onOpenChange: (open: boolean) => void
   model: DataModels
   /** Column keys from portal (dot paths). */
   fieldKeys: string[]
   taxonLineage: string | null
   filterText: string
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   sortColumn: string
   sortOrder: 'asc' | 'desc'
   totalCount: number
}

function triggerBlobDownload(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = filename
   a.rel = 'noopener'
   document.body.appendChild(a)
   a.click()
   a.remove()
   URL.revokeObjectURL(url)
}

export function CatalogExportSheet({
   open,
   onOpenChange,
   model,
   fieldKeys,
   taxonLineage,
   filterText,
   filterDefs,
   filterValues,
   sortColumn,
   sortOrder,
   totalCount,
}: CatalogExportSheetProps) {
   const [selected, setSelected] = useState<Set<string>>(() => new Set(fieldKeys))
   const [exporting, setExporting] = useState(false)
   const [exportError, setExportError] = useState<string | null>(null)

   useEffect(() => {
      setSelected(new Set(fieldKeys))
   }, [fieldKeys])

   const baseParams = useMemo(
      () =>
         buildCatalogQueryParams({
            taxonLineage,
            filter: filterText || undefined,
            sortColumn,
            sortOrder,
            filterDefs,
            filterValues,
         }),
      [taxonLineage, filterText, sortColumn, sortOrder, filterDefs, filterValues],
   )

   const toggle = useCallback((key: string, checked: boolean) => {
      setSelected((prev) => {
         const next = new Set(prev)
         if (checked) next.add(key)
         else {
            if (next.size <= 1) return prev
            next.delete(key)
         }
         return next
      })
   }, [])

   const onDownload = useCallback(
      async (format: CatalogExportFormat) => {
         const fields = [...selected].filter(Boolean)
         if (fields.length === 0) return
         setExporting(true)
         setExportError(null)
         try {
            const blob = await downloadCatalogExport(model, format, baseParams, fields)
            const ext = format === 'tsv' ? 'tsv' : 'jsonl'
            triggerBlobDownload(blob, `${model}-export.${ext}`)
            onOpenChange(false)
         } catch (e: unknown) {
            setExportError(e instanceof Error ? e.message : String(e))
         } finally {
            setExporting(false)
         }
      },
      [baseParams, model, onOpenChange, selected],
   )

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent className="flex w-[min(100vw-2rem,24rem)] flex-col sm:max-w-md">
            <SheetHeader>
               <SheetTitle>Export catalog</SheetTitle>
               <SheetDescription>
                  {model} ·{' '}
                  {totalCount.toLocaleString()} matching records · choose columns and format.
               </SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
               {fieldKeys.map((k) => (
                  <label
                     key={k}
                     className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm',
                        selected.has(k) ? 'bg-muted/40' : '',
                     )}
                  >
                     <Checkbox
                        checked={selected.has(k)}
                        onCheckedChange={(c) => toggle(k, c === true)}
                        className="mt-0.5"
                     />
                     <span className="font-mono text-xs break-all">{k}</span>
                  </label>
               ))}
            </div>
            {exportError ? (
               <p className="text-sm text-destructive" role="alert">
                  {exportError}
               </p>
            ) : null}
            <SheetFooter className="flex-col gap-2 sm:flex-col">
               <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">Formats</Label>
                  <div className="flex flex-wrap gap-2">
                     <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={exporting || selected.size === 0}
                        onClick={() => void onDownload('tsv')}
                     >
                        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        TSV
                     </Button>
                     <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={exporting || selected.size === 0}
                        onClick={() => void onDownload('jsonl')}
                     >
                        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        JSONL
                     </Button>
                  </div>
               </div>
            </SheetFooter>
         </SheetContent>
      </Sheet>
   )
}
