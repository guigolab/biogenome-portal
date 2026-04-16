'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetFooter,
   SheetHeader,
   SheetTitle,
} from '@/components/ui/sheet'
import { useLocale } from '@/contexts/locale-context'
import { downloadCatalogExport, type CatalogExportFormat } from '@/lib/api/catalog'
import { catalogExportFieldDisplayLabel } from '@/lib/catalog-explorer/catalogColumnLabels'
import { buildCatalogQueryParams, type FilterValuesState } from '@/lib/catalogQueryParams'
import type { CatalogCardFieldDef, ConfigFilter, DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { ChevronDown, Download, Loader2 } from 'lucide-react'

export type CatalogExportSheetProps = {
   open: boolean
   onOpenChange: (open: boolean) => void
   model: DataModels
   /** Localized catalog model title (from portal.json). */
   modelLabel: string
   /** Default export column paths in display/API order (portal `exportFields` or code defaults). */
   fieldKeys: string[]
   /** Card field defs (portal merge); optional `label` overrides column titles. */
   cardFields: CatalogCardFieldDef[] | undefined
   taxonLineage: string | null
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   speciesTaxid: string | null
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

function buildFieldsList(fieldKeysOrder: string[], selected: Set<string>): string[] {
   const ordered = fieldKeysOrder.filter((k) => selected.has(k))
   const rest = [...selected].filter((k) => !fieldKeysOrder.includes(k)).sort()
   return [...ordered, ...rest]
}

export function CatalogExportSheet({
   open,
   onOpenChange,
   model,
   modelLabel,
   fieldKeys,
   cardFields,
   taxonLineage,
   filterDefs,
   filterValues,
   speciesTaxid,
   totalCount,
}: CatalogExportSheetProps) {
   const { locale, t } = useLocale()
   const [selected, setSelected] = useState<Set<string>>(() => new Set(fieldKeys))
   const [customFieldInput, setCustomFieldInput] = useState('')
   const [addFieldOpen, setAddFieldOpen] = useState(false)
   const [exportingFormat, setExportingFormat] = useState<CatalogExportFormat | null>(null)
   const [exportError, setExportError] = useState<string | null>(null)
   const exporting = exportingFormat !== null

   const cardFieldByKey = useMemo(() => {
      if (!cardFields?.length) return undefined
      return new Map(cardFields.map((f) => [f.key, f]))
   }, [cardFields])

   useEffect(() => {
      setSelected(new Set(fieldKeys))
   }, [fieldKeys])

   const baseParams = useMemo(
      () =>
         buildCatalogQueryParams({
            taxonLineage,
            speciesTaxid,
            filterDefs,
            filterValues,
         }),
      [taxonLineage, speciesTaxid, filterDefs, filterValues],
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

   const addCustomField = useCallback(() => {
      const raw = customFieldInput.trim()
      if (!raw) return
      const key = raw.replace(/\s+/g, '_')
      setSelected((prev) => new Set(prev).add(key))
      setCustomFieldInput('')
   }, [customFieldInput])

   const customKeys = useMemo(
      () => [...selected].filter((k) => !fieldKeys.includes(k)),
      [selected, fieldKeys],
   )

   const labelFor = useCallback(
      (key: string) => catalogExportFieldDisplayLabel(model, key, cardFieldByKey, locale),
      [model, cardFieldByKey, locale],
   )

   const onDownload = useCallback(
      async (format: CatalogExportFormat) => {
         const fields = buildFieldsList(fieldKeys, selected)
         if (fields.length === 0) return
         setExportingFormat(format)
         setExportError(null)
         try {
            const blob = await downloadCatalogExport(model, format, baseParams, fields)
            const ext = format === 'tsv' ? 'tsv' : 'jsonl'
            const stamp = new Date().toISOString().slice(0, 10)
            triggerBlobDownload(blob, `${model}-export-${stamp}.${ext}`)
            onOpenChange(false)
         } catch (e: unknown) {
            setExportError(e instanceof Error ? e.message : String(e))
         } finally {
            setExportingFormat(null)
         }
      },
      [baseParams, fieldKeys, model, onOpenChange, selected],
   )

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent
            side="right"
            className={cn('flex w-full flex-col gap-0 border-l p-0 sm:max-w-md')}
         >
            <SheetHeader className="border-b border-border p-4 text-left">
               <SheetTitle>{t('catalog.exportSheetTitle')}</SheetTitle>
               <SheetDescription>
                  {modelLabel}
                  {' · '}
                  {t('catalog.exportSheetDescription')}
               </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
               <Collapsible open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                  <CollapsibleTrigger asChild>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between font-normal"
                     >
                        <span>{t('catalog.exportAddField')}</span>
                        <ChevronDown
                           className={cn('h-4 w-4 transition-transform', addFieldOpen && 'rotate-180')}
                        />
                     </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-2">
                     <p className="text-xs text-muted-foreground">{t('catalog.exportFieldHint')}</p>
                     <div className="flex gap-2">
                        <Input
                           value={customFieldInput}
                           onChange={(e) => setCustomFieldInput(e.target.value)}
                           placeholder="metadata.field_name"
                           className="h-9"
                           onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                 e.preventDefault()
                                 addCustomField()
                              }
                           }}
                        />
                        <Button type="button" size="sm" className="shrink-0" onClick={addCustomField}>
                           {t('common.add')}
                        </Button>
                     </div>
                  </CollapsibleContent>
               </Collapsible>

               <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                     {t('catalog.exportColumns')}
                  </p>
                  <div className="space-y-2">
                     {fieldKeys.map((key) => (
                        <label
                           key={key}
                           className="flex cursor-pointer items-start gap-2 text-sm leading-snug"
                        >
                           <Checkbox
                              className="mt-0.5"
                              checked={selected.has(key)}
                              onCheckedChange={(v) => toggle(key, v === true)}
                           />
                           <span>
                              <span className="font-medium">{labelFor(key)}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground break-all">
                                 {key}
                              </span>
                           </span>
                        </label>
                     ))}
                  </div>

                  {customKeys.length > 0 ? (
                     <div className="border-t border-border pt-3 space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('catalog.exportCustom')}</Label>
                        {customKeys.map((key) => (
                           <label
                              key={key}
                              className="flex cursor-pointer items-start gap-2 text-sm leading-snug"
                           >
                              <Checkbox
                                 className="mt-0.5"
                                 checked={selected.has(key)}
                                 onCheckedChange={(v) => toggle(key, v === true)}
                              />
                              <span>
                                 <span className="font-medium">{labelFor(key)}</span>
                                 <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground break-all">
                                    {key}
                                 </span>
                              </span>
                           </label>
                        ))}
                     </div>
                  ) : null}
               </div>

               <p className="text-sm text-muted-foreground">
                  {t('catalog.exportScope')}{' '}
                  <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>{' '}
                  {totalCount === 1 ? t('catalog.exportRecordSingular') : t('catalog.exportRecordPlural')}{' '}
                  {t('catalog.exportWithCurrentFilters')}
               </p>

               {exportError ? (
                  <p className="text-sm text-destructive" role="alert">
                     {exportError}
                  </p>
               ) : null}
            </div>

            <SheetFooter className="border-t border-border p-4 sm:flex-col sm:space-x-0 space-y-2">
               <Button
                  type="button"
                  className="w-full"
                  variant="default"
                  disabled={exporting || selected.size === 0}
                  onClick={() => void onDownload('tsv')}
               >
                  {exportingFormat === 'tsv' ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('catalog.exportPreparing')}
                     </>
                  ) : (
                     <>
                        <Download className="mr-2 h-4 w-4" />
                        {t('catalog.exportDownloadTsv')}
                     </>
                  )}
               </Button>
               <Button
                  type="button"
                  className="w-full"
                  variant="secondary"
                  disabled={exporting || selected.size === 0}
                  onClick={() => void onDownload('jsonl')}
               >
                  {exportingFormat === 'jsonl' ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('catalog.exportPreparing')}
                     </>
                  ) : (
                     <>
                        <Download className="mr-2 h-4 w-4" />
                        {t('catalog.exportDownloadJsonl')}
                     </>
                  )}
               </Button>
            </SheetFooter>
         </SheetContent>
      </Sheet>
   )
}
