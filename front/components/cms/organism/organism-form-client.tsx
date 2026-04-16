'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Download, ImageOff, Loader2, Lock, Pencil, TriangleAlert } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePortalConfig } from '@/contexts/portal-context'
import { defaultPortalConfig, resolveOrganismFormSteps } from '@/lib/portal'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsCreateOrganism, cmsGetItem, cmsGetItems, cmsUpdateOrganism } from '@/lib/cms/services/auth'
import {
   mergeImageRows,
   pollUntilReady,
   triggerSuggestImages,
} from '@/lib/cms/organism-image-suggestions'
import {
   IMAGE_LICENSE_OPTIONS,
   normalizeOrganismImageLicenseFromApi,
} from '@/lib/cms/organism-image-license-options'
import { searchExternalTaxons, type TaxonHit } from '@/lib/taxon-search'
import { useOrganismFormStepper, type RuntimeStep } from '@/hooks/use-organism-form-stepper'
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

function normalizeTargetListStatusForForm(raw: unknown): OrganismFormState['target_list_status'] {
   if (typeof raw !== 'string' || !raw.trim()) return 'long_list'
   if (TARGET_LIST.some((t) => t.key === raw)) return raw as OrganismFormState['target_list_status']
   return 'long_list'
}

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
   const imageUsageComplianceOk = useOrganismFormStore((s) => s.imageUsageComplianceOk)
   const setImageUsageComplianceOk = useOrganismFormStore((s) => s.setImageUsageComplianceOk)
   const replaceOrganismForm = useOrganismFormStore((s) => s.replaceOrganismForm)
   const resetStore = useOrganismFormStore((s) => s.reset)

   const isEditMode = Boolean(editTaxid)

   const [existsWarning, setExistsWarning] = useState<string | null>(null)
   const [taxonExistencePending, setTaxonExistencePending] = useState(false)

   const {
      runtimeSteps,
      activeIndex,
      activeStep,
      goToStep,
      goNext,
      goPrev,
      resetStepper,
      canSubmit,
      canNavigateTo,
   } = useOrganismFormStepper({
      steps,
      isEditMode,
      hasGoat,
      form: organismForm,
      publications,
      vernacularNames,
      metadataList,
      images,
      createOrganismTaxonConflict: Boolean(existsWarning),
      taxonExistenceCheckPending: taxonExistencePending,
   })

   const [busy, setBusy] = useState(isEditMode)
   const [fetchError, setFetchError] = useState<string | null>(null)
   const [submitting, setSubmitting] = useState(false)
   const [searchQ, setSearchQ] = useState('')
   const [searchHits, setSearchHits] = useState<TaxonHit[]>([])
   const [searchLoading, setSearchLoading] = useState(false)
   const [showChangeModal, setShowChangeModal] = useState(false)
   const [showResetModal, setShowResetModal] = useState(false)
   const [importingImages, setImportingImages] = useState(false)

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
            target_list_status: normalizeTargetListStatusForForm(base.target_list_status),
            sequencing_type: Array.isArray(base.sequencing_type) ? (base.sequencing_type as string[]) : [],
         })
         if (Array.isArray(base.publications)) setPublications(base.publications as OrganismPublication[])
         if (Array.isArray(base.images)) {
            setImages(
               (base.images as OrganismImageRow[]).map((img) => normalizeOrganismImageLicenseFromApi(img)),
            )
         }
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

   /** If a duplicate taxon is detected after a race (e.g. user advanced before the check finished), return to step 1. */
   useEffect(() => {
      if (!isEditMode && existsWarning && activeIndex > 0) {
         goToStep(0)
      }
   }, [isEditMode, existsWarning, activeIndex, goToStep])

   async function selectTaxon(hit: TaxonHit) {
      setExistsWarning(null)
      setTaxonExistencePending(true)
      setOrganismForm({ taxid: hit.taxId, scientific_name: hit.scientificName })
      try {
         const { data } = await cmsGetItems('organisms', { filter: hit.taxId, limit: 5 })
         if (data?.some((o) => String(o.taxid) === hit.taxId)) {
            setExistsWarning(
               `Taxon ${hit.taxId} already exists in this portal. Select a different species to continue.`,
            )
         }
      } catch {
         /* ignore */
      } finally {
         setTaxonExistencePending(false)
      }
   }

   async function handleImportImages() {
      const name = organismForm.scientific_name?.trim()
      if (!name) return
      setImportingImages(true)
      try {
         const job = await triggerSuggestImages(name)
         const status = await pollUntilReady(job.task_id)
         if (status.successful && status.result?.images?.length) {
            setImages(mergeImageRows(images, status.result.images))
            toast.success(`Imported ${status.result.images.length} image suggestion(s).`)
         } else if (status.successful) {
            toast.info('No licensable images found for this species.')
         } else {
            const msg =
               typeof status.error === 'string'
                  ? status.error
                  : status.error?.message ?? 'Image import failed.'
            toast.error(msg)
         }
      } catch (e) {
         toast.error(extractApiMessage(e, 'Image import failed.'))
      } finally {
         setImportingImages(false)
      }
   }

   async function handleSubmit() {
      const hasImages = images.some((img) => img.url?.trim())
      if (hasImages && !imageUsageComplianceOk) {
         toast.error('Please confirm image usage compliance before submitting.')
         return
      }
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

         {(isEditMode || organismForm.taxid) && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected organism</p>
                  <p className="text-lg font-semibold italic">{organismForm.scientific_name ?? '—'}</p>
                  <p className="font-mono text-sm text-muted-foreground">Taxid {organismForm.taxid}</p>
               </div>
               <div className="flex flex-wrap gap-2">
                  {!isEditMode ? (
                     <>
                        <Button variant="outline" size="sm" onClick={() => setShowChangeModal(true)}>
                           Change organism
                        </Button>
                        <Button
                           variant="destructive"
                           size="sm"
                           onClick={() => setShowResetModal(true)}
                           disabled={submitting}
                        >
                           Reset
                        </Button>
                     </>
                  ) : null}
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
                     {taxonExistencePending ? (
                        <p className="text-xs text-muted-foreground">Checking whether this taxon is already registered…</p>
                     ) : null}
                     {existsWarning ? <p className="text-sm text-destructive">{existsWarning}</p> : null}
                     <ScrollArea className="h-56 rounded-md border">
                        <ul className="divide-y p-1">
                           {searchHits.map((h) => {
                              const isSelected = organismForm.taxid === h.taxId
                              return (
                                 <li key={h.taxId}>
                                    <button
                                       type="button"
                                       className={cn(
                                          'flex w-full flex-col px-2 py-2 text-left text-sm hover:bg-muted',
                                          isSelected && 'border-l-2 border-primary bg-primary/5',
                                       )}
                                       onClick={() => void selectTaxon(h)}
                                    >
                                       <span className="italic">{h.scientificName}</span>
                                       <span className="font-mono text-xs text-muted-foreground">{h.taxId}</span>
                                    </button>
                                 </li>
                              )
                           })}
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
                           value={organismForm.target_list_status ?? 'long_list'}
                           onValueChange={(val) =>
                              setOrganismForm({
                                 target_list_status:
                                    val === '__none__' ? 'long_list' : (val as OrganismFormState['target_list_status']),
                              })
                           }
                        >
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
                     <Label htmlFor="subproj">Sub-project, PI or entity</Label>
                     <Input
                        id="subproj"
                        value={organismForm.sub_project ?? ''}
                        onChange={(e) => setOrganismForm({ sub_project: e.target.value || null })}
                     />
                  </div>
               )}

               {sid === 'images' && (
                  <div className="space-y-4">
                     {/* Guidelines tip */}
                     <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-4 text-sm space-y-3">
                        <p className="font-medium text-blue-700 dark:text-blue-400">Where to deposit your images</p>
                        <p className="text-muted-foreground">
                           For long-term accessibility, upload images to an open data repository before adding them
                           here. Two recommended options:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                           <li>
                              <span className="font-medium text-foreground">Wikimedia Commons — </span>
                              use the{' '}
                              <a
                                 href="https://commons.wikimedia.org/wiki/Special:UploadWizard"
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="underline hover:text-foreground"
                              >
                                 Upload Wizard
                              </a>
                              . After upload, copy the file page URL into <em>Source record URL</em>, select the
                              license shown on the file page, and fill in the photographer name as{' '}
                              <em>Author</em>.
                           </li>
                           <li>
                              <span className="font-medium text-foreground">Zenodo — </span>
                              create a new record at{' '}
                              <a
                                 href="https://zenodo.org/uploads/new"
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="underline hover:text-foreground"
                              >
                                 zenodo.org
                              </a>
                              . Use direct file URL as <em>Image URL</em> and the record page as{' '}
                              <em>Source record URL</em>, and fill the license from the record metadata.
                           </li>
                        </ul>
                     </div>

                     {/* Import from external sources */}
                     <div className="flex items-center gap-3">
                        <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           disabled={importingImages || !organismForm.scientific_name?.trim()}
                           onClick={() => void handleImportImages()}
                           className="gap-2"
                        >
                           {importingImages ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                           ) : (
                              <Download className="h-4 w-4" />
                           )}
                           {importingImages ? 'Searching…' : 'Import from external sources'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                           Searches iNaturalist, Wikimedia Commons, and GBIF for openly licensed images.
                        </span>
                     </div>

                     {/* Image rows */}
                     {images.map((img, i) => (
                        <ImageRow
                           key={i}
                           img={img}
                           index={i}
                           images={images}
                           setImages={setImages}
                        />
                     ))}

                     <Button type="button" variant="outline" size="sm" onClick={() => setImages([...images, emptyImage()])}>
                        Add image
                     </Button>

                     {/* Compliance checkbox */}
                     {images.some((img) => img.url?.trim()) && (
                        <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                           <Checkbox
                              id="image-compliance"
                              checked={imageUsageComplianceOk}
                              onCheckedChange={(v) => setImageUsageComplianceOk(Boolean(v))}
                              className="mt-0.5"
                           />
                           <label htmlFor="image-compliance" className="text-sm leading-snug cursor-pointer">
                              I confirm that all images listed above are published under an open license (CC0, CC BY,
                              CC BY-SA, or Public Domain) that permits unrestricted use and redistribution, and that
                              the author and source information provided are correct to the best of my knowledge.
                           </label>
                        </div>
                     )}
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
                  <div className="space-y-6">
                     <OrganismFormReview
                        runtimeSteps={runtimeSteps}
                        organismForm={organismForm}
                        publications={publications}
                        vernacularNames={vernacularNames}
                        metadataList={metadataList}
                        images={images}
                        onGoToStep={goToStep}
                     />
                     <div className="border-t pt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                           {canSubmit
                              ? 'All required steps are complete. Submit to save this record.'
                              : 'Complete required steps before submitting.'}
                        </p>
                        <Button disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
                           {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditMode ? 'Save changes' : 'Create organism'}
                        </Button>
                     </div>
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
                        disabled={
                           activeIndex >= runtimeSteps.length - 1 || !canNavigateTo(activeIndex + 1)
                        }
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
                        setTaxonExistencePending(false)
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
                           setExistsWarning(null)
                           setTaxonExistencePending(false)
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

function ImageRow({
   img,
   index,
   images,
   setImages,
}: {
   img: OrganismImageRow
   index: number
   images: OrganismImageRow[]
   setImages: (v: OrganismImageRow[]) => void
}) {
   const [previewError, setPreviewError] = useState(false)
   const update = (patch: Partial<OrganismImageRow>) =>
      setImages(images.map((r, j) => (j === index ? { ...r, ...patch } : r)))
   const selectedOption = IMAGE_LICENSE_OPTIONS.find((o) => o.value === img.license)

   return (
      <div className="rounded-md border p-3 space-y-3">
         {/* Preview + URL row */}
         <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 h-32 w-32 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
               {img.url?.trim() && !previewError ? (
                  <img
                     src={img.url}
                     alt="Preview"
                     className="h-full w-full object-cover"
                     loading="lazy"
                     referrerPolicy="no-referrer"
                     onError={() => setPreviewError(true)}
                  />
               ) : (
                  <ImageOff className="h-16 w-16 text-muted-foreground" />
               )}
            </div>
            <div className="flex-1 space-y-2">
               <Input
                  placeholder="Image URL"
                  value={img.url}
                  onChange={(e) => {
                     setPreviewError(false)
                     update({ url: e.target.value })
                  }}
               />
               <Input
                  placeholder="Author"
                  value={img.author}
                  onChange={(e) => update({ author: e.target.value })}
               />
            </div>
         </div>

         {/* Source + License row */}
         <div className="grid gap-2 sm:grid-cols-2">
            <Input
               placeholder="Source record URL"
               value={img.source_record_url}
               onChange={(e) => update({ source_record_url: e.target.value })}
            />
            {/* License options mirror the server allowlist (organism_images_fetch.py) */}
            <Select
               value={img.license}
               onValueChange={(v) => {
                  const opt = IMAGE_LICENSE_OPTIONS.find((o) => o.value === v)
                  update({ license: v, license_url: opt?.license_url ?? '' })
               }}
            >
               <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select license" />
               </SelectTrigger>
               <SelectContent>
                  {IMAGE_LICENSE_OPTIONS.map((opt) => (
                     <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {selectedOption && (
            <p className="text-xs text-muted-foreground">
               License deed:{' '}
               <a
                  href={selectedOption.license_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
               >
                  {selectedOption.license_url}
               </a>
            </p>
         )}

         <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setImages(images.filter((_, j) => j !== index))}
         >
            Remove
         </Button>
      </div>
   )
}

function OrganismFormReview({
   runtimeSteps,
   organismForm,
   publications,
   vernacularNames,
   metadataList,
   images,
   onGoToStep,
}: {
   runtimeSteps: RuntimeStep[]
   organismForm: OrganismFormState
   publications: OrganismPublication[]
   vernacularNames: OrganismCommonName[]
   metadataList: { key: string; value: string }[]
   images: OrganismImageRow[]
   onGoToStep: (index: number) => void
}) {
   const reviewableSections = runtimeSteps.filter((s) => s.id !== 'reviewSubmit')

   function renderContent(step: RuntimeStep) {
      switch (step.id) {
         case 'selectOrganism':
            return (
               <div className="space-y-1">
                  {organismForm.scientific_name && (
                     <p className="italic text-sm">{organismForm.scientific_name}</p>
                  )}
                  {organismForm.taxid && (
                     <p className="font-mono text-xs text-muted-foreground">TaxID {organismForm.taxid}</p>
                  )}
                  {!organismForm.scientific_name && !organismForm.taxid && (
                     <p className="text-xs text-muted-foreground">Not selected</p>
                  )}
               </div>
            )

         case 'goatStatus':
            return (
               <div className="flex flex-wrap gap-2">
                  {organismForm.goat_status ? (
                     <Badge variant="secondary">{organismForm.goat_status}</Badge>
                  ) : (
                     <span className="text-xs text-muted-foreground">No GoaT status</span>
                  )}
                  {organismForm.target_list_status && (
                     <Badge variant="outline">
                        {TARGET_LIST.find((t) => t.key === organismForm.target_list_status)?.label ??
                           organismForm.target_list_status}
                     </Badge>
                  )}
               </div>
            )

         case 'sequencingAndSubproject':
            return (
               <div className="space-y-2">
                  {(organismForm.sequencing_type?.length ?? 0) > 0 ? (
                     <div className="flex flex-wrap gap-1.5">
                        {organismForm.sequencing_type.map((t) => (
                           <Badge key={t} variant="secondary">
                              {t}
                           </Badge>
                        ))}
                     </div>
                  ) : (
                     <p className="text-xs text-muted-foreground">No sequencing technologies</p>
                  )}
                  {organismForm.sub_project?.trim() && (
                     <p className="text-sm">
                        <span className="text-muted-foreground">Sub-project: </span>
                        {organismForm.sub_project}
                     </p>
                  )}
               </div>
            )

         case 'piOrEntity':
            return organismForm.sub_project?.trim() ? (
               <p className="text-sm">{organismForm.sub_project}</p>
            ) : (
               <p className="text-xs text-muted-foreground">Not filled</p>
            )

         case 'images': {
            const validImages = images.filter((i) => i.url?.trim())
            return validImages.length > 0 ? (
               <div className="flex flex-wrap gap-2">
                  {validImages.map((img, i) => (
                     <div key={i} className="h-16 w-16 overflow-hidden rounded border bg-muted flex-shrink-0">
                        <img
                           src={img.url}
                           alt={img.author || 'Image'}
                           className="h-full w-full object-cover"
                           loading="lazy"
                           referrerPolicy="no-referrer"
                        />
                     </div>
                  ))}
               </div>
            ) : (
               <p className="text-xs text-muted-foreground">No images</p>
            )
         }

         case 'publications': {
            const validPubs = publications.filter((p) => p.id.trim())
            return validPubs.length > 0 ? (
               <ul className="space-y-1">
                  {validPubs.map((p, i) => (
                     <li key={i} className="text-sm">
                        <span className="text-muted-foreground">{p.source}: </span>
                        {p.id}
                     </li>
                  ))}
               </ul>
            ) : (
               <p className="text-xs text-muted-foreground">No publications</p>
            )
         }

         case 'vernacularNames': {
            const validNames = vernacularNames.filter((n) => n.value.trim())
            return validNames.length > 0 ? (
               <ul className="space-y-1">
                  {validNames.map((n, i) => (
                     <li key={i} className="text-sm">
                        {n.value}
                        {(n.lang || n.locality) && (
                           <span className="text-muted-foreground ml-1 text-xs">
                              ({[n.lang, n.locality].filter(Boolean).join(', ')})
                           </span>
                        )}
                     </li>
                  ))}
               </ul>
            ) : (
               <p className="text-xs text-muted-foreground">No vernacular names</p>
            )
         }

         case 'extraMetadata': {
            const validMeta = metadataList.filter((m) => m.key.trim())
            return validMeta.length > 0 ? (
               <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {validMeta.map((m, i) => (
                     <>
                        <dt key={`k${i}`} className="text-muted-foreground font-medium truncate">
                           {m.key}
                        </dt>
                        <dd key={`v${i}`} className="truncate">
                           {m.value}
                        </dd>
                     </>
                  ))}
               </dl>
            ) : (
               <p className="text-xs text-muted-foreground">No extra metadata</p>
            )
         }

         default:
            return null
      }
   }

   return (
      <div className="divide-y rounded-lg border">
         {reviewableSections.map((step) => {
            const titleEn = typeof step.title === 'string' ? step.title : step.title['en'] ?? step.id
            const isComplete = step.completion.complete
            const isRequired = step.required

            return (
               <div key={step.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2">
                        {isComplete ? (
                           <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : isRequired ? (
                           <TriangleAlert className="h-4 w-4 text-destructive shrink-0" />
                        ) : (
                           <div className="h-4 w-4 shrink-0" />
                        )}
                        <span className="text-sm font-medium">{titleEn}</span>
                        {isRequired && !isComplete && (
                           <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Required
                           </Badge>
                        )}
                     </div>
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => onGoToStep(step.index)}
                     >
                        <Pencil className="h-3 w-3" />
                        Edit
                     </Button>
                  </div>
                  <div className="pl-6">{renderContent(step)}</div>
               </div>
            )
         })}
      </div>
   )
}
