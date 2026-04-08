'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BiosampleCoordinatesPreview } from '@/components/cms/biosample/biosample-coordinates-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   getChoiceOptions,
   type EnaChecklistField,
   validateEnaChecklistGroup,
   validateEntireEnaChecklist,
} from '@/lib/cms/ena-checklist-validate'
import { cmsGetEnaChecklist, cmsGetItems, cmsGetUserSpecies, cmsSubmitBiosample } from '@/lib/cms/services/auth'
import { useEnaUploadStepper } from '@/hooks/use-ena-upload-stepper'
import { cn } from '@/lib/utils'
import { useCmsSampleStore } from '@/stores/cms-sample-store'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

function flattenFields(checklist: Record<string, unknown> | null): { name: string; unit?: string }[] {
   const desc = checklist?.descriptor as Record<string, unknown> | undefined
   const groups = desc?.field_group
   if (!groups) return []
   const list = Array.isArray(groups) ? groups : [groups]
   return list.flatMap((group) => {
      const g = group as { field: EnaChecklistField | EnaChecklistField[] }
      const fields = Array.isArray(g.field) ? g.field : [g.field]
      return fields.map((f) => ({
         name: f.name.text,
         unit: f.units?.unit.text,
      }))
   })
}

function renderField(
   field: EnaChecklistField,
   value: string | string[] | undefined,
   onChange: (v: string) => void,
   error?: string,
) {
   const req = field.mandatory?.text === 'mandatory'
   const label = field.label?.text ?? field.name.text
   const hint = field.description?.text
   const fieldKey = field.name.text

   if (field.field_type.text_choice_field) {
      const opts = getChoiceOptions(field)
      const strVal = value === undefined ? '' : Array.isArray(value) ? value[0] ?? '' : String(value)
      const selectValue = strVal.trim() && opts.includes(strVal) ? strVal : undefined
      return (
         <div key={fieldKey} className="space-y-1">
            <Label>
               {label}
               {req ? <span className="text-destructive"> *</span> : null}
            </Label>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            <Select value={selectValue} onValueChange={onChange}>
               <SelectTrigger className={cn(error && 'border-destructive')}>
                  <SelectValue placeholder="Select…" />
               </SelectTrigger>
               <SelectContent>
                  {opts.map((o) => (
                     <SelectItem key={o} value={o}>
                        {o}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
            {error ? (
               <p className="text-xs text-destructive" role="alert">
                  {error}
               </p>
            ) : null}
         </div>
      )
   }

   if (field.field_type.text_area_field) {
      return (
         <div key={fieldKey} className="space-y-1">
            <Label>
               {label}
               {req ? <span className="text-destructive"> *</span> : null}
            </Label>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            <Textarea
               rows={4}
               className={cn(error && 'border-destructive')}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
            />
            {error ? (
               <p className="text-xs text-destructive" role="alert">
                  {error}
               </p>
            ) : null}
         </div>
      )
   }

   return (
      <div key={fieldKey} className="space-y-1">
         <Label>
            {label}
            {req ? <span className="text-destructive"> *</span> : null}
         </Label>
         {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
         <Input
            className={cn(error && 'border-destructive')}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
         />
         {error ? (
            <p className="text-xs text-destructive" role="alert">
               {error}
            </p>
         ) : null}
      </div>
   )
}

function EnaGroupFields({
   checklist,
   groupIndex,
   fieldErrors,
   onClearFieldError,
}: {
   checklist: Record<string, unknown>
   groupIndex: number
   fieldErrors: Record<string, string>
   onClearFieldError: (key: string) => void
}) {
   const characterics = useCmsSampleStore((s) => s.characterics)
   const setCharacteristic = useCmsSampleStore((s) => s.setCharacteristic)
   const desc = checklist.descriptor as Record<string, unknown>
   const groups = desc?.field_group
   const list = (Array.isArray(groups) ? groups : [groups]) as { field: EnaChecklistField | EnaChecklistField[] }[]
   const group = list[groupIndex]
   if (!group) return null
   const fields = Array.isArray(group.field) ? group.field : [group.field]

   const fieldsKey = fields.map((f) => f.name.text).join('|')

   useEffect(() => {
      const desc = checklist.descriptor as Record<string, unknown>
      const groups = desc?.field_group
      const list = (Array.isArray(groups) ? groups : [groups]) as { field: EnaChecklistField | EnaChecklistField[] }[]
      const g = list[groupIndex]
      if (!g) return
      const groupFields = Array.isArray(g.field) ? g.field : [g.field]
      const ch = useCmsSampleStore.getState().characterics
      for (const f of groupFields) {
         if (f.mandatory?.text !== 'mandatory') continue
         if (!f.field_type.text_choice_field) continue
         const opts = getChoiceOptions(f)
         if (opts.length !== 1) continue
         const key = f.name.text
         const cur = ch[key]
         const empty = cur === undefined || String(cur).trim() === ''
         if (!empty) continue
         setCharacteristic(key, opts[0]!)
      }
   }, [checklist, groupIndex, fieldsKey, setCharacteristic])

   return (
      <div className="space-y-4">
         <h3 className="font-medium">{(group as { name?: { text: string } }).name?.text}</h3>
         {fields.map((f) =>
            renderField(
               f,
               characterics[f.name.text],
               (v) => {
                  onClearFieldError(f.name.text)
                  setCharacteristic(f.name.text, v)
               },
               fieldErrors[f.name.text],
            ),
         )}
      </div>
   )
}

export function EnaPublishClient() {
   const router = useRouter()
   const userName = useCmsAuthStore((s) => s.userName)
   const isAdmin = useCmsAuthStore((s) => s.userRole === 'Admin')

   const scientificName = useCmsSampleStore((s) => s.scientificName)
   const sampleIdentifier = useCmsSampleStore((s) => s.sampleIdentifier)
   const taxid = useCmsSampleStore((s) => s.taxid)
   const characterics = useCmsSampleStore((s) => s.characterics)
   const loading = useCmsSampleStore((s) => s.loading)
   const validationErrors = useCmsSampleStore((s) => s.validationErrors)
   const setField = useCmsSampleStore((s) => s.setField)
   const mapFormToEBIPayload = useCmsSampleStore((s) => s.mapFormToEBIPayload)
   const reset = useCmsSampleStore((s) => s.reset)

   const [checklist, setChecklist] = useState<Record<string, unknown> | null>(null)
   const [checklistLoading, setChecklistLoading] = useState(true)
   const [orgSearch, setOrgSearch] = useState('')
   const [orgHits, setOrgHits] = useState<Record<string, unknown>[]>([])
   const [orgLoading, setOrgLoading] = useState(false)

   const [organismError, setOrganismError] = useState('')
   const [identifierError, setIdentifierError] = useState('')
   const [checklistFieldErrors, setChecklistFieldErrors] = useState<Record<string, string>>({})

   const fieldsFlat = useMemo(() => flattenFields(checklist), [checklist])
   const allChecklistFieldNames = useMemo(() => fieldsFlat.map((f) => f.name), [fieldsFlat])

   const stepper = useEnaUploadStepper(checklist, {
      scientificName,
      sampleIdentifier,
      characterics,
   })

   useEffect(() => {
      let cancelled = false
      ;(async () => {
         setChecklistLoading(true)
         try {
            const data = (await cmsGetEnaChecklist()) as { checklist?: Record<string, unknown> }
            if (cancelled) return
            const ch = data.checklist
            if (ch) {
               setChecklist({ ...ch })
               const id = (ch.identifiers as { primary_id?: { text?: string } } | undefined)?.primary_id?.text
               if (id) setField('checklist', id)
            }
         } catch (e) {
            if (!cancelled) toast.error(extractApiMessage(e, 'Failed to load ENA checklist'))
         } finally {
            if (!cancelled) setChecklistLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [setField])

   const fetchOrgs = useCallback(async () => {
      setOrgLoading(true)
      try {
         if (isAdmin) {
            const { data } = await cmsGetItems('organisms', { filter: orgSearch, limit: 20 })
            setOrgHits(data ?? [])
         } else if (userName) {
            const { data } = await cmsGetUserSpecies(userName, { filter: orgSearch, limit: 20 })
            setOrgHits(data ?? [])
         } else {
            setOrgHits([])
         }
      } catch {
         setOrgHits([])
      } finally {
         setOrgLoading(false)
      }
   }, [isAdmin, userName, orgSearch])

   useEffect(() => {
      const t = setTimeout(() => void fetchOrgs(), 300)
      return () => clearTimeout(t)
   }, [fetchOrgs])

   function selectOrganism(row: Record<string, unknown>) {
      setField('taxid', String(row.taxid ?? ''))
      setField('scientificName', String(row.scientific_name ?? ''))
      setOrganismError('')
      setOrgSearch('')
   }

   function yesterdayISO() {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString()
   }

   const clearFieldError = useCallback((key: string) => {
      setChecklistFieldErrors((prev) => {
         if (!prev[key]) return prev
         const next = { ...prev }
         delete next[key]
         return next
      })
   }, [])

   function validateSampleInfo(): boolean {
      setOrganismError(scientificName.trim() ? '' : 'Please select an organism before continuing.')
      setIdentifierError(sampleIdentifier.trim() ? '' : 'Sample identifier is required.')
      return Boolean(scientificName.trim() && sampleIdentifier.trim())
   }

   function handleNextStep() {
      const sid = stepper.activeStep
      if (!checklist) return
      if (sid?.kind === 'sampleInfo') {
         if (!validateSampleInfo()) return
         useCmsSampleStore.setState({ validationErrors: [] })
         stepper.goNext()
         return
      }
      if (sid?.kind === 'checklistGroup' && sid.groupIndex !== undefined) {
         const desc = checklist.descriptor as Record<string, unknown>
         const groups = desc?.field_group
         const list = (Array.isArray(groups) ? groups : [groups]) as {
            field: EnaChecklistField | EnaChecklistField[]
         }[]
         const group = list[sid.groupIndex]
         if (!group) return
         const errs = validateEnaChecklistGroup(group, characterics)
         const groupFields = Array.isArray(group.field) ? group.field : [group.field]
         setChecklistFieldErrors((prev) => {
            const next = { ...prev }
            for (const f of groupFields) delete next[f.name.text]
            return { ...next, ...errs }
         })
         if (Object.keys(errs).length > 0) return
         useCmsSampleStore.setState({ validationErrors: [] })
         stepper.goNext()
         return
      }
   }

   async function submit() {
      if (!checklist) return
      useCmsSampleStore.setState({ validationErrors: [] })
      if (!validateSampleInfo()) {
         window.scrollTo({ top: 0, behavior: 'smooth' })
         return
      }
      const allFieldErrs = validateEntireEnaChecklist(checklist, characterics)
      if (Object.keys(allFieldErrs).length > 0) {
         const msgs = Object.values(allFieldErrs)
         useCmsSampleStore.setState({ validationErrors: msgs })
         setChecklistFieldErrors(allFieldErrs)
         toast.error('Fix checklist validation errors before submitting.')
         window.scrollTo({ top: 0, behavior: 'smooth' })
         return
      }

      useCmsSampleStore.setState({ validationErrors: [], loading: true })
      try {
         const characteristics = mapFormToEBIPayload(fieldsFlat)
         await cmsSubmitBiosample({
            name: sampleIdentifier,
            taxid,
            release: yesterdayISO(),
            characteristics,
         })
         toast.success('Biosample submitted.')
         reset()
         setChecklistFieldErrors({})
         setOrganismError('')
         setIdentifierError('')
         stepper.resetStepper()
         router.push('/admin')
      } catch (e) {
         const err = e as Error & { body?: unknown }
         const body = err.body
         if (Array.isArray(body)) {
            const msgs = body
               .map((item: { dataPath?: string; errors?: string[] }) =>
                  item.dataPath && item.errors ? `${item.dataPath}: ${item.errors.join('; ')}` : '',
               )
               .filter(Boolean)
            useCmsSampleStore.setState({ validationErrors: msgs })
            toast.error('Validation error')
         } else {
            toast.error(extractApiMessage(e, 'Submit failed'))
         }
      } finally {
         useCmsSampleStore.setState({ loading: false })
      }
   }

   const sid = stepper.activeStep

   if (checklistLoading || !checklist) {
      return (
         <div className="flex flex-col items-center gap-2 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading ENA checklist…</p>
         </div>
      )
   }

   return (
      <div className="space-y-6">
         <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">← Dashboard</Link>
         </Button>
         <div>
            <h1 className="text-2xl font-bold">Submit biosample</h1>
            <p className="text-sm text-muted-foreground">ENA checklist-driven submission (same API as Vue admin).</p>
         </div>

         {validationErrors.length > 0 ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
               <p className="mb-1 font-semibold">Validation errors</p>
               <ul className="list-inside list-disc">
                  {validationErrors.map((m, i) => (
                     <li key={i}>{m}</li>
                  ))}
               </ul>
            </div>
         ) : null}

         <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            <nav className="flex flex-col gap-1" aria-label="Form steps">
               {stepper.runtimeSteps.map((st, idx) => (
                  <button
                     key={st.id}
                     type="button"
                     disabled={!stepper.canNavigateTo(idx)}
                     onClick={() => stepper.goToStep(idx)}
                     className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm',
                        stepper.activeIndex === idx && 'border-primary bg-primary/5',
                        !stepper.canNavigateTo(idx) && 'cursor-not-allowed opacity-50',
                     )}
                  >
                     {st.title}
                  </button>
               ))}
            </nav>

            <div className="min-w-0 space-y-6">
               {sid?.kind === 'sampleInfo' && (
                  <div className="space-y-4">
                     {scientificName && taxid ? (
                        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:justify-between">
                           <div>
                              <p className="text-xs text-muted-foreground">Selected organism</p>
                              <p className="font-medium italic">{scientificName}</p>
                              <p className="font-mono text-xs text-muted-foreground">{taxid}</p>
                           </div>
                           <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                 setField('taxid', '')
                                 setField('scientificName', '')
                                 setOrganismError('')
                              }}
                           >
                              Change
                           </Button>
                        </div>
                     ) : (
                        <div className="space-y-2">
                           <Label>
                              Organism <span className="text-destructive">*</span>
                           </Label>
                           <p className="text-xs text-muted-foreground">
                              {isAdmin ? 'Search portal species.' : 'Search your assigned species.'}{' '}
                              <Link href="/admin/create-organism" className="text-primary underline">
                                 Create organism
                              </Link>{' '}
                              if missing.
                           </p>
                           <Input
                              value={orgSearch}
                              onChange={(e) => {
                                 setOrgSearch(e.target.value)
                                 setOrganismError('')
                              }}
                              placeholder="Name or taxid…"
                              className={cn(organismError && 'border-destructive')}
                           />
                           <ScrollArea className="h-40 rounded-md border">
                              {orgLoading ? (
                                 <p className="p-2 text-sm text-muted-foreground">Loading…</p>
                              ) : (
                                 <ul className="divide-y">
                                    {orgHits.map((o) => (
                                       <li key={String(o.taxid)}>
                                          <button
                                             type="button"
                                             className="flex w-full flex-col px-2 py-2 text-left text-sm hover:bg-muted"
                                             onClick={() => selectOrganism(o)}
                                          >
                                             <span className="italic">{String(o.scientific_name)}</span>
                                             <span className="text-xs text-muted-foreground">{String(o.taxid)}</span>
                                          </button>
                                       </li>
                                    ))}
                                 </ul>
                              )}
                           </ScrollArea>
                           {organismError ? (
                              <p className="text-xs text-destructive" role="alert">
                                 {organismError}
                              </p>
                           ) : null}
                        </div>
                     )}
                     <div className="space-y-2">
                        <Label>
                           Sample identifier <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                           A unique internal label for this biosample (e.g. BGE_12345_A).
                        </p>
                        <Input
                           value={sampleIdentifier}
                           onChange={(e) => {
                              setIdentifierError('')
                              setField('sampleIdentifier', e.target.value)
                           }}
                           placeholder="e.g. BGE_12345_A"
                           className={cn(identifierError && 'border-destructive')}
                        />
                        {identifierError ? (
                           <p className="text-xs text-destructive" role="alert">
                              {identifierError}
                           </p>
                        ) : null}
                     </div>
                  </div>
               )}

               {sid?.kind === 'checklistGroup' && sid.groupIndex !== undefined ? (
                  <EnaGroupFields
                     checklist={checklist}
                     groupIndex={sid.groupIndex}
                     fieldErrors={checklistFieldErrors}
                     onClearFieldError={clearFieldError}
                  />
               ) : null}

               {sid?.kind === 'reviewSubmit' && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_290px] lg:items-start">
                     <div className="space-y-3 text-sm lg:order-none order-2">
                        <p>
                           <strong>Name:</strong> {sampleIdentifier || '—'}
                        </p>
                        <p>
                           <strong>Organism:</strong> {scientificName} ({taxid})
                        </p>
                        <p className="text-muted-foreground">
                           Review checklist fields in previous steps, then submit to EBI BioSamples.
                        </p>
                        <Button disabled={!stepper.canSubmit || loading} onClick={() => void submit()}>
                           {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit to EBI'}
                        </Button>
                     </div>
                     <div className="order-1 lg:order-none lg:sticky lg:top-6">
                        <BiosampleCoordinatesPreview
                           availableFieldNames={allChecklistFieldNames}
                           characterics={characterics}
                        />
                     </div>
                  </div>
               )}

               {sid?.kind !== 'reviewSubmit' ? (
                  <footer className="flex justify-between border-t pt-4">
                     <Button type="button" variant="ghost" disabled={stepper.activeIndex <= 0} onClick={stepper.goPrev} className="gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        Back
                     </Button>
                     <Button
                        type="button"
                        disabled={stepper.activeIndex >= stepper.runtimeSteps.length - 1 || stepper.isNextBlocked}
                        onClick={handleNextStep}
                        className="gap-1"
                     >
                        Next
                        <ChevronRight className="h-4 w-4" />
                     </Button>
                  </footer>
               ) : null}
            </div>
         </div>
      </div>
   )
}
