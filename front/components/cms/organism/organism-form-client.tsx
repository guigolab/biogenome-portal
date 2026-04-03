'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePortalConfig } from '@/contexts/portal-context'
import { defaultPortalConfig, resolveOrganismFormSteps } from '@/lib/portal'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsCreateOrganism, cmsGetItem, cmsGetItems, cmsUpdateOrganism } from '@/lib/cms/services/auth'
import { searchExternalTaxons, type TaxonHit } from '@/lib/taxon-search'
import { useOrganismFormStepper } from '@/hooks/use-organism-form-stepper'
import { cn } from '@/lib/utils'
import {
   useOrganismFormStore,
   type OrganismCommonName,
   type OrganismFormState,
   type OrganismImageRow,
   type OrganismPublication,
} from '@/stores/organism-form-store'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

const SEQUENCING_OPTIONS = [
   { name: 'ONT (Long Reads)', category: 'Long read' },
   { name: 'PACBIO (Long Reads)', category: 'Long read' },
   { name: 'Illumina (Short Reads)', category: 'Short read' },
   { name: 'RNAseq (Transcriptomics)', category: 'Transcriptomics' },
   { name: 'Isoseq (Transcriptomics)', category: 'Transcriptomics' },
   { name: 'HIC (Scaffolding)', category: 'Scaffolding' },
   { name: 'OmniC (Scaffolding)', category: 'Scaffolding' },
   { name: 'Other', category: 'Other' },
] as const

const GOAT_STEPS = [
   'Sample Collected',
   'Sample Acquired',
   'Data Generation',
   'In Assembly',
   'INSDC Submitted',
   'Publication Available',
] as const

const SELECTABLE_GOAT = new Set(['Sample Collected', 'Sample Acquired', 'Data Generation', 'In Assembly'])
const TERMINAL_GOAT = new Set(['INSDC Submitted', 'Publication Available'])

const TARGET_LIST: { key: 'long_list' | 'family_representative' | 'other_priority'; label: string }[] = [
   { key: 'long_list', label: 'Long list' },
   { key: 'family_representative', label: 'Family representative' },
   { key: 'other_priority', label: 'Other priority' },
]

function buildPayload() {
   const { organismForm, metadataList, images, publications, vernacularNames } = useOrganismFormStore.getState()
   const metadata = Object.fromEntries(metadataList.map(({ key, value }) => [key, value]))
   const imgs = images.filter(({ url, author, source_record_url, license }) =>
      Boolean(url?.trim() && author?.trim() && source_record_url?.trim() && license?.trim()),
   )
   return {
      ...organismForm,
      image: '',
      image_urls: [],
      metadata,
      images: imgs,
      publications: publications.filter((p) => p.id),
      common_names: vernacularNames.filter((n) => n.value),
   } as Record<string, unknown>
}

export function OrganismFormClient({ taxid: editTaxid }: { taxid?: string }) {
   const router = useRouter()
   const { config } = usePortalConfig()
   const steps = config?.organismFormSteps ?? resolveOrganismFormSteps(defaultPortalConfig)
   const general = config?.general as Record<string, unknown> | undefined
   const hasGoat = Boolean(general?.goat)

   const userRole = useCmsAuthStore((s) => s.userRole)
   const userSpecies = useCmsAuthStore((s) => s.userSpecies)
   const isAdmin = userRole === 'Admin'

   const organismForm = useOrganismFormStore((s) => s.organismForm)
   const setOrganismForm = useOrganismFormStore((s) => s.setOrganismForm)
   const metadataList = useOrganismFormStore((s) => s.metadataList)
   const setMetadataList = useOrganismFormStore((s) => s.setMetadataList)
   const publications = useOrganismFormStore((s) => s.publications)
   const setPublications = useOrganismFormStore((s) => s.setPublications)
   const vernacularNames = useOrganismFormStore((s) => s.vernacularNames)
   const setVernacularNames = useOrganismFormStore((s) => s.setVernacularNames)
   const images = useOrganismFormStore((s) => s.images)
   const setImages = useOrganismFormStore((s) => s.setImages)
   const replaceOrganismForm = useOrganismFormStore((s) => s.replaceOrganismForm)
   const resetStore = useOrganismFormStore((s) => s.reset)

   const isEditMode = Boolean(editTaxid)

   const {
      runtimeSteps,
      activeIndex,
      activeStep,
      goToStep,
      goNext,
      goPrev,
      resetStepper,
      canSubmit,
   } = useOrganismFormStepper({
      steps,
      isEditMode,
      hasGoat,
      form: organismForm,
      publications,
      vernacularNames,
      metadataList,
      images,
   })

   const [busy, setBusy] = useState(isEditMode)
   const [fetchError, setFetchError] = useState<string | null>(null)
   const [submitting, setSubmitting] = useState(false)
   const [searchQ, setSearchQ] = useState('')
   const [searchHits, setSearchHits] = useState<TaxonHit[]>([])
   const [searchLoading, setSearchLoading] = useState(false)
   const [existsWarning, setExistsWarning] = useState<string | null>(null)
   const [showChangeModal, setShowChangeModal] = useState(false)
   const [showResetModal, setShowResetModal] = useState(false)

   const loadOrganism = useCallback(async () => {
      if (!editTaxid) return
      setBusy(true)
      setFetchError(null)
      try {
         const data = await cmsGetItem('organisms', editTaxid)
         const formEntries = Object.entries(data).filter(([k]) => k !== 'id' && k !== 'created')
         const base = Object.fromEntries(formEntries) as Record<string, unknown>
         replaceOrganismForm({
            taxid: (base.taxid as string) ?? editTaxid,
            scientific_name: (base.scientific_name as string) ?? null,
            common_names: (base.common_names as OrganismCommonName[]) ?? [],
            image: '',
            images: [],
            image_urls: [],
            metadata: {},
            publications: [],
            sub_project: (base.sub_project as string) ?? null,
            goat_status: (base.goat_status as string) ?? '',
            target_list_status: (base.target_list_status as OrganismFormState['target_list_status']) ?? null,
            sequencing_type: Array.isArray(base.sequencing_type) ? (base.sequencing_type as string[]) : [],
         })
         if (Array.isArray(base.publications)) setPublications(base.publications as OrganismPublication[])
         if (Array.isArray(base.images)) setImages(base.images as OrganismImageRow[])
         if (Array.isArray(base.common_names)) setVernacularNames(base.common_names as OrganismCommonName[])
         const md = base.metadata
         if (md && typeof md === 'object' && !Array.isArray(md)) {
            setMetadataList(Object.entries(md as Record<string, string>).map(([key, value]) => ({ key, value })))
         }
         resetStepper()
      } catch (e) {
         const msg = extractApiMessage(e, 'We could not load this organism.')
         setFetchError(msg)
      } finally {
         setBusy(false)
      }
   }, [editTaxid, replaceOrganismForm, setImages, setMetadataList, setPublications, setVernacularNames, resetStepper])

   useEffect(() => {
      if (editTaxid) void loadOrganism()
      else {
         resetStore()
         resetStepper()
      }
   }, [editTaxid, loadOrganism, resetStore, resetStepper])

   useEffect(() => {
      const q = searchQ.trim()
      if (q.length < 2) {
         setSearchHits([])
         return
      }
      let cancelled = false
      const t = setTimeout(() => {
         setSearchLoading(true)
         void searchExternalTaxons(q).then((hits) => {
            if (!cancelled) setSearchHits(hits)
            if (!cancelled) setSearchLoading(false)
         })
      }, 350)
      return () => {
         cancelled = true
         clearTimeout(t)
      }
   }, [searchQ])

   async function selectTaxon(hit: TaxonHit) {
      setExistsWarning(null)
      setOrganismForm({ taxid: hit.taxId, scientific_name: hit.scientificName })
      try {
         const { data } = await cmsGetItems('organisms', { filter: hit.taxId, limit: 5 })
         if (data?.some((o) => String(o.taxid) === hit.taxId)) {
            setExistsWarning(`Taxon ${hit.taxId} already exists in this portal.`)
         }
      } catch {
         /* ignore */
      }
   }

   async function handleSubmit() {
      setSubmitting(true)
      try {
         const payload = buildPayload()
         if (editTaxid) {
            await cmsUpdateOrganism(editTaxid, payload)
            toast.success(`${organismForm.scientific_name ?? 'Organism'} updated.`)
         } else {
            await cmsCreateOrganism(payload)
            toast.success(`${organismForm.scientific_name ?? 'Organism'} created.`)
         }
         resetStore()
         resetStepper()
         router.push('/admin')
      } catch (e) {
         toast.error(extractApiMessage(e, 'Save failed'))
      } finally {
         setSubmitting(false)
      }
   }

   const goatLocked =
      organismForm.goat_status === 'INSDC Submitted' || organismForm.goat_status === 'Publication Available'

   const visibleGoat = GOAT_STEPS.filter((v) => {
      if (SELECTABLE_GOAT.has(v)) return true
      if (TERMINAL_GOAT.has(v as (typeof GOAT_STEPS)[number]) && organismForm.goat_status === v) return true
      return false
   })

   const title = isEditMode ? 'Edit species' : 'Create species'
   const description = isEditMode
      ? 'Update metadata, GoaT status, and related information.'
      : 'Register a new species from public taxonomy and complete the required steps.'

   if (busy) {
      return (
         <div className="flex flex-col gap-4 py-12">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">Loading organism…</p>
         </div>
      )
   }

   if (isEditMode && fetchError) {
      return (
         <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
            <h2 className="font-semibold">Unable to load this organism</h2>
            <p className="text-sm text-muted-foreground">{fetchError}</p>
            <div className="flex gap-2">
               <Button variant="secondary" asChild>
                  <Link href="/admin">Back to dashboard</Link>
               </Button>
               <Button onClick={() => void loadOrganism()}>Try again</Button>
            </div>
         </div>
      )
   }

   const sid = activeStep?.id

   return (
      <div className="space-y-6">
         <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="gap-1" asChild>
               <Link href="/admin">Dashboard</Link>
            </Button>
            <span>/</span>
            <span className="text-foreground">{title}</span>
         </div>
         <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-muted-foreground">{description}</p>
         </div>

         {(isEditMode || (organismForm.taxid && sid !== 'selectOrganism')) && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected organism</p>
                  <p className="text-lg font-semibold italic">{organismForm.scientific_name ?? '—'}</p>
                  <p className="font-mono text-sm text-muted-foreground">Taxid {organismForm.taxid}</p>
               </div>
               <div className="flex flex-wrap gap-2">
                  {!isEditMode ? (
                     <Button variant="outline" size="sm" onClick={() => setShowChangeModal(true)}>
                        Change organism
                     </Button>
                  ) : null}
                  <Button variant="destructive" size="sm" onClick={() => setShowResetModal(true)} disabled={submitting}>
                     Reset
                  </Button>
               </div>
            </div>
         )}

         <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <nav className="flex flex-col gap-1" aria-label="Form steps">
               {runtimeSteps.map((step, idx) => (
                  <button
                     key={step.id}
                     type="button"
                     disabled={step.blocked}
                     onClick={() => goToStep(idx)}
                     className={cn(
                        'flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        activeIndex === idx && 'border-primary bg-primary/5',
                        step.blocked && 'cursor-not-allowed opacity-50',
                     )}
                  >
                     <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                        {step.completion.complete ? <Check className="h-3 w-3 text-chart-2" /> : idx + 1}
                     </span>
                     <span>
                        <span className="font-medium">{step.title.en}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">
                           {step.required && step.id !== 'reviewSubmit' ? '(required)' : '(optional)'}
                        </span>
                     </span>
                  </button>
               ))}
            </nav>

            <div className="min-w-0 space-y-4">
               <div>
                  <h2 className="text-lg font-semibold">{activeStep?.title.en}</h2>
                  <p className="text-sm text-muted-foreground">{activeStep?.description.en}</p>
               </div>

               {sid === 'selectOrganism' && (
                  <div className="space-y-4">
                     <p className="text-sm text-muted-foreground">
                        Search NCBI / ENA taxonomy. Prefer numeric taxids when possible.
                     </p>
                     {!isAdmin && userSpecies.length === 0 ? (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                           No species assigned to your account. Ask an admin to assign species first.
                        </div>
                     ) : null}
                     <Input placeholder="e.g. Homo sapiens or 9606" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                     {searchLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
                     {existsWarning ? <p className="text-sm text-destructive">{existsWarning}</p> : null}
                     <ScrollArea className="h-56 rounded-md border">
                        <ul className="divide-y p-1">
                           {searchHits.map((h) => (
                              <li key={h.taxId}>
                                 <button
                                    type="button"
                                    className="flex w-full flex-col px-2 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => void selectTaxon(h)}
                                 >
                                    <span className="italic">{h.scientificName}</span>
                                    <span className="font-mono text-xs text-muted-foreground">{h.taxId}</span>
                                 </button>
                              </li>
                           ))}
                        </ul>
                     </ScrollArea>
                  </div>
               )}

               {sid === 'goatStatus' && (
                  <div className="space-y-6">
                     {goatLocked ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Lock className="h-4 w-4" /> Terminal GoaT status — cannot change.
                        </p>
                     ) : null}
                     <div className="grid gap-2 sm:grid-cols-2">
                        {visibleGoat.map((v) => (
                           <button
                              key={v}
                              type="button"
                              disabled={goatLocked}
                              onClick={() =>
                                 setOrganismForm({
                                    goat_status: organismForm.goat_status === v ? '' : v,
                                 })
                              }
                              className={cn(
                                 'rounded-lg border px-3 py-2 text-left text-sm',
                                 organismForm.goat_status === v && 'border-primary bg-primary/10',
                              )}
                           >
                              {v}
                           </button>
                        ))}
                     </div>
                     <div>
                        <Label className="mb-2 block">Target list</Label>
                        <RadioGroup
                           value={organismForm.target_list_status ?? '__none__'}
                           onValueChange={(val) =>
                              setOrganismForm({
                                 target_list_status:
                                    val === '__none__' ? null : (val as OrganismFormState['target_list_status']),
                              })
                           }
                        >
                           <div className="flex items-center gap-2 py-1">
                              <RadioGroupItem value="__none__" id="tls-none" />
                              <Label htmlFor="tls-none">None</Label>
                           </div>
                           {TARGET_LIST.map((t) => (
                              <div key={t.key} className="flex items-center gap-2 py-1">
                                 <RadioGroupItem value={t.key} id={t.key} />
                                 <Label htmlFor={t.key}>{t.label}</Label>
                              </div>
                           ))}
                        </RadioGroup>
                     </div>
                  </div>
               )}

               {sid === 'sequencingAndSubproject' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                     {SEQUENCING_OPTIONS.map((tech) => {
                        const sel = organismForm.sequencing_type?.includes(tech.name)
                        return (
                           <button
                              key={tech.name}
                              type="button"
                              onClick={() => {
                                 const cur = organismForm.sequencing_type ?? []
                                 setOrganismForm({
                                    sequencing_type: sel ? cur.filter((x) => x !== tech.name) : [...cur, tech.name],
                                 })
                              }}
                              className={cn(
                                 'rounded-lg border px-3 py-2 text-left text-sm',
                                 sel && 'border-primary bg-primary/10',
                              )}
                           >
                              <span className="font-medium">{tech.name}</span>
                              <span className="block text-xs text-muted-foreground">{tech.category}</span>
                           </button>
                        )
                     })}
                  </div>
               )}

               {sid === 'piOrEntity' && (
                  <div>
                     <Label htmlFor="subproj">Sub-project / entity</Label>
                     <Input
                        id="subproj"
                        value={organismForm.sub_project ?? ''}
                        onChange={(e) => setOrganismForm({ sub_project: e.target.value || null })}
                     />
                  </div>
               )}

               {sid === 'images' && (
                  <div className="space-y-3">
                     {images.map((img, i) => (
                        <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                           <Input
                              placeholder="Image URL"
                              value={img.url}
                              onChange={(e) =>
                                 setImages(images.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)))
                              }
                           />
                           <Input
                              placeholder="Author"
                              value={img.author}
                              onChange={(e) =>
                                 setImages(images.map((r, j) => (j === i ? { ...r, author: e.target.value } : r)))
                              }
                           />
                           <Input
                              placeholder="Source record URL"
                              value={img.source_record_url}
                              onChange={(e) =>
                                 setImages(images.map((r, j) => (j === i ? { ...r, source_record_url: e.target.value } : r)))
                              }
                           />
                           <Input
                              placeholder="License"
                              value={img.license}
                              onChange={(e) =>
                                 setImages(images.map((r, j) => (j === i ? { ...r, license: e.target.value } : r)))
                              }
                           />
                        </div>
                     ))}
                     <Button type="button" variant="outline" size="sm" onClick={() => setImages([...images, emptyImage()])}>
                        Add image
                     </Button>
                  </div>
               )}

               {sid === 'publications' && (
                  <div className="space-y-3">
                     {publications.map((pub, i) => (
                        <div key={i} className="flex flex-wrap gap-2">
                           <Select
                              value={pub.source}
                              onValueChange={(v) =>
                                 setPublications(
                                    publications.map((p, j) => (j === i ? { ...p, source: v as OrganismPublication['source'] } : p)),
                                 )
                              }
                           >
                              <SelectTrigger className="w-[160px]">
                                 <SelectValue placeholder="Source" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="DOI">DOI</SelectItem>
                                 <SelectItem value="PubMed ID">PubMed ID</SelectItem>
                                 <SelectItem value="PubMed CentralID">PubMed Central ID</SelectItem>
                              </SelectContent>
                           </Select>
                           <Input
                              className="min-w-[200px] flex-1"
                              placeholder="Identifier"
                              value={pub.id}
                              onChange={(e) =>
                                 setPublications(publications.map((p, j) => (j === i ? { ...p, id: e.target.value } : p)))
                              }
                           />
                        </div>
                     ))}
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPublications([...publications, { source: 'DOI', id: '' }])}
                     >
                        Add publication
                     </Button>
                  </div>
               )}

               {sid === 'vernacularNames' && (
                  <div className="space-y-3">
                     {vernacularNames.map((n, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-3">
                           <Input
                              placeholder="Name"
                              value={n.value}
                              onChange={(e) =>
                                 setVernacularNames(vernacularNames.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                              }
                           />
                           <Input
                              placeholder="Language"
                              value={n.lang}
                              onChange={(e) =>
                                 setVernacularNames(vernacularNames.map((x, j) => (j === i ? { ...x, lang: e.target.value } : x)))
                              }
                           />
                           <Input
                              placeholder="Locality"
                              value={n.locality}
                              onChange={(e) =>
                                 setVernacularNames(
                                    vernacularNames.map((x, j) => (j === i ? { ...x, locality: e.target.value } : x)),
                                 )
                              }
                           />
                        </div>
                     ))}
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setVernacularNames([...vernacularNames, { value: '', lang: '', locality: '' }])}
                     >
                        Add name
                     </Button>
                  </div>
               )}

               {sid === 'extraMetadata' && (
                  <div className="space-y-3">
                     {metadataList.map((m, i) => (
                        <div key={i} className="flex gap-2">
                           <Input
                              placeholder="Key"
                              value={m.key}
                              onChange={(e) =>
                                 setMetadataList(metadataList.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))
                              }
                           />
                           <Input
                              placeholder="Value"
                              value={m.value}
                              onChange={(e) =>
                                 setMetadataList(metadataList.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                              }
                           />
                        </div>
                     ))}
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMetadataList([...metadataList, { key: '', value: '' }])}
                     >
                        Add field
                     </Button>
                  </div>
               )}

               {sid === 'reviewSubmit' && (
                  <div className="space-y-4">
                     <p className="text-sm text-muted-foreground">
                        {canSubmit
                           ? 'All required steps are complete. Submit to save this record.'
                           : 'Complete required steps before submitting.'}
                     </p>
                     <Button disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditMode ? 'Save changes' : 'Create organism'}
                     </Button>
                  </div>
               )}

               {sid !== 'reviewSubmit' ? (
                  <footer className="flex justify-between border-t border-border pt-4">
                     <Button type="button" variant="ghost" disabled={activeIndex <= 0} onClick={goPrev} className="gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        Back
                     </Button>
                     <Button
                        type="button"
                        disabled={activeIndex >= runtimeSteps.length - 1}
                        onClick={goNext}
                        className="gap-1"
                     >
                        Next
                        <ChevronRight className="h-4 w-4" />
                     </Button>
                  </footer>
               ) : null}
            </div>
         </div>

         <AlertDialog open={showChangeModal} onOpenChange={setShowChangeModal}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Change organism?</AlertDialogTitle>
                  <AlertDialogDescription>This clears the current draft.</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     onClick={() => {
                        resetStore()
                        resetStepper()
                        setSearchQ('')
                        setSearchHits([])
                        setExistsWarning(null)
                        setShowChangeModal(false)
                     }}
                  >
                     Continue
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={showResetModal} onOpenChange={setShowResetModal}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Reset form?</AlertDialogTitle>
                  <AlertDialogDescription>All unsaved edits will be lost.</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     onClick={() => {
                        if (isEditMode && editTaxid) void loadOrganism()
                        else {
                           resetStore()
                           resetStepper()
                        }
                        setShowResetModal(false)
                     }}
                  >
                     Reset
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   )
}

function emptyImage(): OrganismImageRow {
   return { url: '', author: '', source_record_url: '', license: '' }
}
