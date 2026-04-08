'use client'

import { useCallback, useMemo, useState } from 'react'
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
import { downloadOrganismsTsv } from '@/lib/api/organisms'
import {
   ORGANISM_DEFAULT_EXPORT_FIELDS,
   ORGANISM_EXPORT_FIELD_GROUPS,
   ORGANISM_EXPORT_KEYS_ORDERED,
} from '@/lib/organismExportFields'
import { cn } from '@/lib/utils'
import { ChevronDown, Download, Loader2 } from 'lucide-react'

const ORDERED_KNOWN_KEYS = ORGANISM_EXPORT_KEYS_ORDERED

function buildFieldsList(selected: Set<string>): string[] {
   const ordered = ORDERED_KNOWN_KEYS.filter((k) => selected.has(k))
   const rest = [...selected].filter((k) => !ORDERED_KNOWN_KEYS.includes(k)).sort()
   return [...ordered, ...rest]
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

export type SpeciesExportSheetProps = {
   open: boolean
   onOpenChange: (open: boolean) => void
   /** Query params for GET /organisms (filters + sort); omit ``limit`` / ``offset``. */
   exportParams: Record<string, string | number>
   /** Total matching organisms (for summary text). */
   totalCount: number
}

export function SpeciesExportSheet({
   open,
   onOpenChange,
   exportParams,
   totalCount,
}: SpeciesExportSheetProps) {
   const { t } = useLocale()
   const [selected, setSelected] = useState<Set<string>>(
      () => new Set(ORGANISM_DEFAULT_EXPORT_FIELDS.map((f) => f.key)),
   )
   const [customFieldInput, setCustomFieldInput] = useState('')
   const [addFieldOpen, setAddFieldOpen] = useState(false)
   const [exporting, setExporting] = useState(false)
   const [exportError, setExportError] = useState<string | null>(null)

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
      () => [...selected].filter((k) => !ORDERED_KNOWN_KEYS.includes(k)),
      [selected],
   )

   const onDownload = useCallback(async () => {
      const fields = buildFieldsList(selected)
      if (fields.length === 0) return
      setExporting(true)
      setExportError(null)
      try {
         const blob = await downloadOrganismsTsv(exportParams, fields)
         const stamp = new Date().toISOString().slice(0, 10)
         triggerBlobDownload(blob, `organisms-export-${stamp}.tsv`)
         onOpenChange(false)
      } catch (e: unknown) {
         setExportError(e instanceof Error ? e.message : String(e))
      } finally {
         setExporting(false)
      }
   }, [exportParams, onOpenChange, selected])

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent
            side="right"
            className={cn('flex w-full flex-col gap-0 border-l p-0 sm:max-w-md')}
         >
            <SheetHeader className="border-b border-border p-4 text-left">
               <SheetTitle>{t('speciesExport.title')}</SheetTitle>
               <SheetDescription>
                  {t('speciesExport.description')}
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
                        <span>{t('speciesExport.addField')}</span>
                        <ChevronDown
                           className={cn('h-4 w-4 transition-transform', addFieldOpen && 'rotate-180')}
                        />
                     </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-2">
                     <p className="text-xs text-muted-foreground">
                        {t('speciesExport.mongoFieldHint')}
                     </p>
                     <div className="flex gap-2">
                        <Input
                           value={customFieldInput}
                           onChange={(e) => setCustomFieldInput(e.target.value)}
                           placeholder="field_or.nested.path"
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
                     {t('speciesExport.columns')}
                  </p>
                  <div className="space-y-2">
                     {ORGANISM_DEFAULT_EXPORT_FIELDS.map(({ key, label }) => (
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
                              <span className="font-medium">{label}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{key}</span>
                           </span>
                        </label>
                     ))}
                  </div>

                  {ORGANISM_EXPORT_FIELD_GROUPS.map((group) => (
                     <div key={group.id} className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                        {group.fields.map(({ key, label }) => (
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
                                 <span className="font-medium">{label}</span>
                                 <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                    {key}
                                 </span>
                              </span>
                           </label>
                        ))}
                     </div>
                  ))}

                  {customKeys.length > 0 ? (
                     <div className="border-t border-border pt-3 space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('speciesExport.custom')}</Label>
                        {customKeys.map((key) => (
                           <label
                              key={key}
                              className="flex cursor-pointer items-center gap-2 text-sm leading-snug"
                           >
                              <Checkbox
                                 checked={selected.has(key)}
                                 onCheckedChange={(v) => toggle(key, v === true)}
                              />
                              <span className="font-mono text-xs break-all">{key}</span>
                           </label>
                        ))}
                     </div>
                  ) : null}
               </div>

               <p className="text-sm text-muted-foreground">
                  {t('speciesExport.exportScope')}{' '}
                  <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span> organism
                  {totalCount === 1 ? '' : 's'} {t('speciesExport.withCurrentFilters')}
               </p>

               {exportError ? (
                  <p className="text-sm text-destructive" role="alert">
                     {exportError}
                  </p>
               ) : null}
            </div>

            <SheetFooter className="border-t border-border p-4 sm:flex-col sm:space-x-0">
               <Button
                  type="button"
                  className="w-full"
                  disabled={exporting || selected.size === 0}
                  onClick={() => void onDownload()}
               >
                  {exporting ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('speciesExport.preparingDownload')}
                     </>
                  ) : (
                     <>
                        <Download className="mr-2 h-4 w-4" />
                        {t('speciesExport.downloadTsv')}
                     </>
                  )}
               </Button>
            </SheetFooter>
         </SheetContent>
      </Sheet>
   )
}
