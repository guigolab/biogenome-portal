'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsGetEnaChecklist, cmsGetItems, cmsGetUserSpecies, cmsSubmitBiosample } from '@/lib/cms/services/auth'
import { useEnaUploadStepper } from '@/hooks/use-ena-upload-stepper'
import { cn } from '@/lib/utils'
import { useCmsSampleStore } from '@/stores/cms-sample-store'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

type ChecklistField = {
   name: { text: string }
   label: { text: string }
   mandatory: { text: string }
   description?: { text: string }
   field_type: {
      text_field?: { regex_value?: string }
      text_area_field?: Record<string, unknown>
      text_choice_field?: { text_value: { value: { text: string } }[] | { value: { text: string } } }
   }
   units?: { unit: { text: string } }
}

function flattenFields(checklist: Record<string, unknown> | null): { name: string; unit?: string }[] {
   const desc = checklist?.descriptor as Record<string, unknown> | undefined
   const groups = desc?.field_group
   if (!groups) return []
   const list = Array.isArray(groups) ? groups : [groups]
   return list.flatMap((group) => {
      const g = group as { field: ChecklistField | ChecklistField[] }
      const fields = Array.isArray(g.field) ? g.field : [g.field]
      return fields.map((f) => ({
         name: f.name.text,
         unit: f.units?.unit.text,
      }))
   })
}

function renderField(
   field: ChecklistField,
   value: string | string[] | undefined,
   onChange: (v: string) => void,
) {
   const req = field.mandatory?.text === 'mandatory'
   const label = field.label?.text ?? field.name.text
   const hint = field.description?.text

   if (field.field_type.text_choice_field) {
      const tv = field.field_type.text_choice_field.text_value
      const opts = Array.isArray(tv) ? tv.map((o) => o.value.text) : [tv.value.text]
      return (
         <div key={field.name.text} className="space-y-1">
            <Label>
               {label}
               {req ? <span className="text-destructive"> *</span> : null}
            </Label>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            <Select value={String(value ?? '')} onValueChange={onChange}>
               <SelectTrigger>
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
         </div>
      )
   }

   if (field.field_type.text_area_field) {
      return (
         <div key={field.name.text} className="space-y-1">
            <Label>
               {label}
               {req ? <span className="text-destructive"> *</span> : null}
            </Label>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            <Textarea rows={4} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
         </div>
      )
   }

   return (
      <div key={field.name.text} className="space-y-1">
         <Label>
            {label}
            {req ? <span className="text-destructive"> *</span> : null}
         </Label>
         {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
         <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      </div>
   )
}

function EnaGroupFields({
   checklist,
   groupIndex,
}: {
   checklist: Record<string, unknown>
   groupIndex: number
}) {
   const characterics = useCmsSampleStore((s) => s.characterics)
   const setCharacteristic = useCmsSampleStore((s) => s.setCharacteristic)
   const desc = checklist.descriptor as Record<string, unknown>
   const groups = desc?.field_group
   const list = (Array.isArray(groups) ? groups : [groups]) as { field: ChecklistField | ChecklistField[] }[]
   const group = list[groupIndex]
   if (!group) return null
   const fields = Array.isArray(group.field) ? group.field : [group.field]

   return (
      <div className="space-y-4">
         <h3 className="font-medium">{(group as { name?: { text: string } }).name?.text}</h3>
         {fields.map((f) =>
            renderField(f, characterics[f.name.text] as string | undefined, (v) => setCharacteristic(f.name.text, v)),
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

   const fieldsFlat = useMemo(() => flattenFields(checklist), [checklist])

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
      setOrgSearch('')
   }

   function yesterdayISO() {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString()
   }

   async function submit() {
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
               <ul className="list-inside list-disc">
                  {validationErrors.map((m, i) => (
                     <li key={i}>{m}</li>
                  ))}
               </ul>
            </div>
         ) : null}

         <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            <nav className="flex flex-col gap-1">
               {stepper.runtimeSteps.map((st, idx) => (
                  <button
                     key={st.id}
                     type="button"
                     disabled={st.blocked}
                     onClick={() => stepper.goToStep(idx)}
                     className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm',
                        stepper.activeIndex === idx && 'border-primary bg-primary/5',
                        st.blocked && 'opacity-50',
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
                           <Button type="button" variant="outline" size="sm" onClick={() => {
                              setField('taxid', '')
                              setField('scientificName', '')
                           }}>
                              Change
                           </Button>
                        </div>
                     ) : (
                        <div className="space-y-2">
                           <Label>Organism</Label>
                           <p className="text-xs text-muted-foreground">
                              {isAdmin ? 'Search portal species.' : 'Search your assigned species.'}{' '}
                              <Link href="/admin/create-organism" className="text-primary underline">
                                 Create organism
                              </Link>{' '}
                              if missing.
                           </p>
                           <Input value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} placeholder="Name or taxid…" />
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
                        </div>
                     )}
                     <div>
                        <Label>Sample identifier</Label>
                        <Input value={sampleIdentifier} onChange={(e) => setField('sampleIdentifier', e.target.value)} />
                     </div>
                  </div>
               )}

               {sid?.kind === 'checklistGroup' && sid.groupIndex !== undefined ? (
                  <EnaGroupFields checklist={checklist} groupIndex={sid.groupIndex} />
               ) : null}

               {sid?.kind === 'reviewSubmit' && (
                  <div className="space-y-3 text-sm">
                     <p>
                        <strong>Name:</strong> {sampleIdentifier || '—'}
                     </p>
                     <p>
                        <strong>Organism:</strong> {scientificName} ({taxid})
                     </p>
                     <p className="text-muted-foreground">Review checklist fields in previous steps, then submit.</p>
                     <Button disabled={!stepper.canSubmit || loading} onClick={() => void submit()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit to EBI'}
                     </Button>
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
                        disabled={stepper.activeIndex >= stepper.runtimeSteps.length - 1}
                        onClick={stepper.goNext}
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
