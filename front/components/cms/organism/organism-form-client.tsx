'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Download, ImageOff, Loader2, Lock, Pencil, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePortalConfig } from '@/contexts/portal-context'
import { defaultPortalConfig, resolveOrganismFormSteps } from '@/lib/portal'
import type { CmsOrganismFieldWire, OrganismFormStepId } from '@/lib/portal/types'
import {
   buildCustomFieldsMetadata,
   buildGenomePublicationPayload,
   buildMetadataPayload,
   filterCompleteImages,
   filterValidPublications,
   filterValidVernacularNames,
   getIncompleteImageRowFields,
   splitLoadedMetadata,
   type PublicationValidationStatus,
} from '@/lib/cms/organism-form-payload'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   cmsCreateOrganism,
   cmsGetItem,
   cmsUpdateOrganism,
   cmsValidatePublication,
   type CmsPublicationMetadata,
} from '@/lib/cms/services/auth'
import {
   mergeImageRows,
   pollUntilReady,
   triggerSuggestImages,
} from '@/lib/cms/organism-image-suggestions'
import {
   IMAGE_LICENSE_OPTIONS,
   normalizeOrganismImageLicenseFromApi,
} from '@/lib/cms/organism-image-license-options'
import { patchImageRowForUrlChange } from '@/lib/cms/infer-image-source-record-url'
import { searchExternalTaxons, taxonSpeciesSuitabilityWarning, type TaxonHit } from '@/lib/taxon-search'
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

const TARGET_LIST: { key: 'long_list'; label: string }[] = [
   { key: 'long_list', label: 'Long list' },
]

function normalizeTargetListStatusForForm(_raw: unknown): OrganismFormState['target_list_status'] {
   return 'long_list'
}

function buildPayload(organismCustomFields: CmsOrganismFieldWire[]) {
   const { organismForm, metadataList, images, publications, genomePublication, vernacularNames, customFieldValues } =
      useOrganismFormStore.getState()
   return {
      ...organismForm,
      target_list_status: 'long_list',
      image: '',
      image_urls: [],
      metadata: {
         ...buildMetadataPayload(metadataList),
         ...buildCustomFieldsMetadata(organismCustomFields, customFieldValues),
      },
      images: filterCompleteImages(images),
      publications: filterValidPublications(publications),
      genome_publication: buildGenomePublicationPayload(genomePublication),
      common_names: filterValidVernacularNames(vernacularNames),
   } as Record<string, unknown>
}

export function OrganismFormClient({ taxid: editTaxid }: { taxid?: string }) {
   const router = useRouter()
   const { config } = usePortalConfig()
   const steps = config?.organismFormSteps ?? resolveOrganismFormSteps(defaultPortalConfig)
   const organismCustomFields = config?.organismCustomFields ?? []
   const general = config?.general as Record<string, unknown> | undefined
   const hasGoat = Boolean(general?.goat)

   const userRole = useCmsAuthStore((s) => s.userRole)
   const userSpecies = useCmsAuthStore((s) => s.userSpecies)
   const isAdmin = userRole === 'Admin'

   const organismForm = useOrganismFormStore((s) => s.organismForm)
   const setOrganismForm = useOrganismFormStore((s) => s.setOrganismForm)
   const metadataList = useOrganismFormStore((s) => s.metadataList)
   const setMetadataList = useOrganismFormStore((s) => s.setMetadataList)
   const customFieldValues = useOrganismFormStore((s) => s.customFieldValues)
   const setCustomFieldValues = useOrganismFormStore((s) => s.setCustomFieldValues)
   const publications = useOrganismFormStore((s) => s.publications)
   const setPublications = useOrganismFormStore((s) => s.setPublications)
   const genomePublication = useOrganismFormStore((s) => s.genomePublication)
   const setGenomePublication = useOrganismFormStore((s) => s.setGenomePublication)
   const vernacularNames = useOrganismFormStore((s) => s.vernacularNames)
   const setVernacularNames = useOrganismFormStore((s) => s.setVernacularNames)
   const images = useOrganismFormStore((s) => s.images)
   const setImages = useOrganismFormStore((s) => s.setImages)
   const replaceOrganismForm = useOrganismFormStore((s) => s.replaceOrganismForm)
   const resetStore = useOrganismFormStore((s) => s.reset)

   const isEditMode = Boolean(editTaxid)

   const canEditExistingOrganism = useMemo(() => {
      const tid = organismForm.taxid?.trim()
      if (!tid) return false
      if (isAdmin) return true
      return userSpecies.includes(tid)
   }, [isAdmin, organismForm.taxid, userSpecies])

   const fieldsForStep = useCallback(
      (stepId: OrganismFormStepId) => organismCustomFields.filter((field) => field.step === stepId),
      [organismCustomFields],
   )

   const [existsWarning, setExistsWarning] = useState<string | null>(null)
   const [existenceCheckError, setExistenceCheckError] = useState<string | null>(null)
   const [taxonExistencePending, setTaxonExistencePending] = useState(false)
   const [taxonSpeciesWarning, setTaxonSpeciesWarning] = useState<string | null>(null)

   const taxonCheckSeqRef = useRef(0)
   const loadOrganismSeqRef = useRef(0)
   const importImagesSeqRef = useRef(0)
   const lastSelectedTaxonRef = useRef<TaxonHit | null>(null)

   const [pubValidationStatus, setPubValidationStatus] = useState<Record<number, PublicationValidationStatus>>({})
   const [pubValidationError, setPubValidationError] = useState<Record<number, string>>({})
   const [pubMetadata, setPubMetadata] = useState<Record<number, CmsPublicationMetadata>>({})
   const [genomePubStatus, setGenomePubStatus] = useState<PublicationValidationStatus>('idle')
   const [genomePubError, setGenomePubError] = useState<string | null>(null)
   const [genomePubMetadata, setGenomePubMetadata] = useState<CmsPublicationMetadata | null>(null)

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
      publicationsBlockSubmit,
   } = useOrganismFormStepper({
      steps,
      isEditMode,
      hasGoat,
      form: organismForm,
      publications,
      vernacularNames,
      metadataList,
      images,
      genomePublication,
      publicationValidation: pubValidationStatus,
      genomePublicationValidation: genomePubStatus,
      createOrganismTaxonConflict: Boolean(existsWarning),
      taxonExistenceCheckPending: taxonExistencePending,
      taxonExistenceCheckFailed: Boolean(existenceCheckError),
      organismCustomFields,
      customFieldValues,
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

   const assembliesLocked = (organismForm.assemblies_count ?? 0) <= 0

   const loadOrganism = useCallback(async () => {
      if (!editTaxid) return
      const seq = ++loadOrganismSeqRef.current
      setBusy(true)
      setFetchError(null)
      try {
         const data = await cmsGetItem('organisms', editTaxid)
         if (seq !== loadOrganismSeqRef.current) return
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
            goat_status: (base.goat_status as string) ?? '',
            target_list_status: normalizeTargetListStatusForForm(base.target_list_status),
            assemblies_count: Number(base.assemblies_count) || 0,
         })
         if (Array.isArray(base.publications)) {
            const loadedPubs = base.publications as OrganismPublication[]
            setPublications(loadedPubs)
            // Already-persisted entries are treated as valid until edited (re-validated on submit either way).
            setPubValidationStatus(
               Object.fromEntries(loadedPubs.map((p, i) => [i, p.id?.trim() ? 'valid' : 'idle'])),
            )
         } else {
            setPubValidationStatus({})
         }
         setPubValidationError({})
         setPubMetadata({})
         const loadedGenomePub = base.genome_publication as OrganismPublication | null | undefined
         if (loadedGenomePub && typeof loadedGenomePub === 'object' && loadedGenomePub.id?.trim()) {
            setGenomePublication(loadedGenomePub)
            setGenomePubStatus('valid')
         } else {
            setGenomePublication(null)
            setGenomePubStatus('idle')
         }
         setGenomePubError(null)
         setGenomePubMetadata(null)
         if (Array.isArray(base.images)) {
            setImages(
               (base.images as OrganismImageRow[]).map((img) => normalizeOrganismImageLicenseFromApi(img)),
            )
         }
         if (Array.isArray(base.common_names)) setVernacularNames(base.common_names as OrganismCommonName[])
         const md = base.metadata
         if (md && typeof md === 'object' && !Array.isArray(md)) {
            const split = splitLoadedMetadata(md as Record<string, unknown>, organismCustomFields)
            setCustomFieldValues(split.customFieldValues)
            setMetadataList(split.metadataList)
         } else {
            setCustomFieldValues({})
            setMetadataList([])
         }
         resetStepper()
      } catch (e) {
         if (seq !== loadOrganismSeqRef.current) return
         const msg = extractApiMessage(e, 'We could not load this organism.')
         setFetchError(msg)
      } finally {
         if (seq === loadOrganismSeqRef.current) setBusy(false)
      }
   }, [
      editTaxid,
      replaceOrganismForm,
      setImages,
      setMetadataList,
      setCustomFieldValues,
      setPublications,
      setGenomePublication,
      setVernacularNames,
      resetStepper,
      organismCustomFields,
   ])

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
      const seq = ++taxonCheckSeqRef.current
      lastSelectedTaxonRef.current = hit
      setExistsWarning(null)
      setExistenceCheckError(null)
      setTaxonSpeciesWarning(taxonSpeciesSuitabilityWarning(hit))
      setTaxonExistencePending(true)
      setOrganismForm({ taxid: hit.taxId, scientific_name: hit.scientificName })
      try {
         // Existence: GET /api/organisms/<taxid> (exact); avoid collection list + filter semantics.
         await cmsGetItem('organisms', hit.taxId)
         if (seq !== taxonCheckSeqRef.current) return
         setExistsWarning(
            `Taxon ${hit.taxId} already exists in this portal. Select a different species to continue.`,
         )
      } catch (e) {
         if (seq !== taxonCheckSeqRef.current) return
         const status = typeof e === 'object' && e !== null && 'status' in e ? (e as { status: number }).status : 0
         if (status === 404) {
            setExistenceCheckError(null)
         } else {
            const msg = extractApiMessage(
               e,
               'Could not verify whether this taxon is already registered. Try selecting it again.',
            )
            setExistenceCheckError(msg)
            toast.error(msg)
         }
      } finally {
         if (seq === taxonCheckSeqRef.current) setTaxonExistencePending(false)
      }
   }

   async function handleImportImages() {
      const name = organismForm.scientific_name?.trim()
      if (!name) return
      const seq = ++importImagesSeqRef.current
      setImportingImages(true)
      try {
         const job = await triggerSuggestImages(name)
         if (seq !== importImagesSeqRef.current) return
         const status = await pollUntilReady(job.task_id)
         if (seq !== importImagesSeqRef.current) return
         if (status.successful && status.result?.images?.length) {
            const currentImages = useOrganismFormStore.getState().images
            setImages(mergeImageRows(currentImages, status.result.images))
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
         if (seq !== importImagesSeqRef.current) return
         toast.error(extractApiMessage(e, 'Image import failed.'))
      } finally {
         if (seq === importImagesSeqRef.current) setImportingImages(false)
      }
   }

   function updatePublicationRow(i: number, patch: Partial<OrganismPublication>) {
      setPublications(publications.map((p, j) => (j === i ? { ...p, ...patch } : p)))
      setPubValidationStatus((s) => ({ ...s, [i]: 'idle' }))
      setPubValidationError((s) => ({ ...s, [i]: '' }))
      setPubMetadata((s) => {
         const next = { ...s }
         delete next[i]
         return next
      })
   }

   function updateGenomePublication(patch: Partial<OrganismPublication>) {
      setGenomePublication({ source: genomePublication?.source ?? 'DOI', id: genomePublication?.id ?? '', ...patch })
      setGenomePubStatus('idle')
      setGenomePubError(null)
      setGenomePubMetadata(null)
   }

   async function validatePublicationRow(i: number) {
      const pub = publications[i]
      if (!pub?.id?.trim()) return
      setPubValidationStatus((s) => ({ ...s, [i]: 'checking' }))
      setPubValidationError((s) => ({ ...s, [i]: '' }))
      setPubMetadata((s) => {
         const next = { ...s }
         delete next[i]
         return next
      })
      try {
         const res = await cmsValidatePublication(pub.source, pub.id.trim(), { field: 'publications' })
         if (res.valid) {
            setPubValidationStatus((s) => ({ ...s, [i]: 'valid' }))
            if (res.data) setPubMetadata((s) => ({ ...s, [i]: res.data as CmsPublicationMetadata }))
         } else {
            setPubValidationStatus((s) => ({ ...s, [i]: 'invalid' }))
            setPubValidationError((s) => ({ ...s, [i]: res.error || 'Publication could not be validated.' }))
         }
      } catch (e) {
         setPubValidationStatus((s) => ({ ...s, [i]: 'invalid' }))
         setPubValidationError((s) => ({ ...s, [i]: extractApiMessage(e, 'Validation failed.') }))
      }
   }

   async function validateGenomePublication() {
      const id = genomePublication?.id?.trim()
      if (!id || !organismForm.taxid) return
      setGenomePubStatus('checking')
      setGenomePubError(null)
      setGenomePubMetadata(null)
      try {
         const res = await cmsValidatePublication(genomePublication?.source ?? 'DOI', id, {
            field: 'genome_publication',
            taxid: organismForm.taxid,
         })
         if (res.valid) {
            setGenomePubStatus('valid')
            setGenomePubMetadata(res.data ?? null)
         } else {
            setGenomePubStatus('invalid')
            setGenomePubError(res.error || 'Publication could not be validated.')
         }
      } catch (e) {
         setGenomePubStatus('invalid')
         setGenomePubError(extractApiMessage(e, 'Validation failed.'))
      }
   }

   async function handleSubmit() {
      setSubmitting(true)
      try {
         const payload = buildPayload(organismCustomFields)
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
         <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">← Dashboard</Link>
         </Button>
         <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
         </div>

         {!isEditMode && existsWarning ? (
            <Alert variant="destructive" className="border-destructive/50">
               <TriangleAlert />
               <AlertTitle>Species already registered</AlertTitle>
               <AlertDescription className="space-y-3">
                  <p>{existsWarning}</p>
                  {canEditExistingOrganism && organismForm.taxid ? (
                     <Button asChild variant="secondary" size="sm" className="w-fit gap-2">
                        <Link href={`/admin/update-organism/${encodeURIComponent(organismForm.taxid)}`}>
                           <Pencil className="h-4 w-4" />
                           Edit this species
                        </Link>
                     </Button>
                  ) : (
                     <p className="text-destructive/90">
                        You don&apos;t have permission to edit this species. Choose a different taxon or contact an
                        administrator.
                     </p>
                  )}
               </AlertDescription>
            </Alert>
         ) : null}

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
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setShowChangeModal(true)}
                           disabled={importingImages || submitting}
                        >
                           Change organism
                        </Button>
                        <Button
                           variant="destructive"
                           size="sm"
                           onClick={() => setShowResetModal(true)}
                           disabled={importingImages || submitting}
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
                     {!isEditMode && existenceCheckError ? (
                        <Alert variant="destructive" className="border-destructive/50">
                           <TriangleAlert className="h-4 w-4" />
                           <AlertTitle>Could not verify taxon availability</AlertTitle>
                           <AlertDescription className="space-y-2">
                              <p>{existenceCheckError}</p>
                              {organismForm.taxid ? (
                                 <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                       const hit =
                                          lastSelectedTaxonRef.current ??
                                          ({
                                             taxId: organismForm.taxid!,
                                             scientificName: organismForm.scientific_name ?? '',
                                          } satisfies TaxonHit)
                                       void selectTaxon(hit)
                                    }}
                                 >
                                    Retry check
                                 </Button>
                              ) : null}
                           </AlertDescription>
                        </Alert>
                     ) : null}
                     {!isEditMode && taxonSpeciesWarning && organismForm.taxid ? (
                        <Alert className="border-amber-500/40 bg-amber-500/10 text-foreground [&>svg]:text-amber-700 dark:[&>svg]:text-amber-400">
                           <TriangleAlert className="h-4 w-4" />
                           <AlertTitle>Not a species-rank binomial</AlertTitle>
                           <AlertDescription>{taxonSpeciesWarning}</AlertDescription>
                        </Alert>
                     ) : null}
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
                                       <span className="font-mono text-xs text-muted-foreground">
                                          {h.taxId}
                                          {h.rank ? ` · ${h.rank}` : ''}
                                       </span>
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
                        <Select
                           value={organismForm.target_list_status || 'long_list'}
                           onValueChange={() =>
                              setOrganismForm({
                                 target_list_status: 'long_list',
                              })
                           }
                        >
                           <SelectTrigger className="w-full sm:w-[16rem]">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              {TARGET_LIST.map((t) => (
                                 <SelectItem key={t.key} value={t.key}>
                                    {t.label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
               )}

               {sid === 'sequencingAndSubproject' && (
                  <div className="space-y-6">
                     {fieldsForStep('sequencingAndSubproject').length > 0 ? (
                        fieldsForStep('sequencingAndSubproject').map((field) => (
                           <CustomPicklistField
                              key={field.key}
                              field={field}
                              selected={customFieldValues[field.key] ?? []}
                              onChange={(values) =>
                                 setCustomFieldValues({ ...customFieldValues, [field.key]: values })
                              }
                           />
                        ))
                     ) : (
                        <p className="text-sm text-muted-foreground">
                           No sequencing fields configured for this portal.
                        </p>
                     )}
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

                     {filterCompleteImages(images).length > 0 && (
                        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-snug text-muted-foreground">
                           Images must be published under an open license (CC0, CC BY, CC BY-SA, or Public Domain)
                           that permits unrestricted use and redistribution. Author and source information must be
                           correct.
                        </p>
                     )}
                  </div>
               )}

               {sid === 'publications' && (
                  <div className="space-y-6">
                     <div className="space-y-3 rounded-lg border p-4">
                        <div>
                           <p className="flex items-center gap-2 font-medium">
                              Genome assembly publication
                              {assembliesLocked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                           </p>
                           <p className="text-sm text-muted-foreground">
                              This must be the publication describing the genome assembly itself — the paper
                              reporting the sequencing and assembly of this species&apos; genome — not a general
                              publication about the species. It drives the GoaT &ldquo;Publication Available&rdquo;
                              status and appears in the GoaT report. Only one genome assembly publication can be
                              set, and only once an assembly is linked to this organism.
                           </p>
                        </div>
                        {assembliesLocked ? (
                           <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Lock className="h-4 w-4" /> Locked — link an assembly to this organism to unlock this
                              field.
                           </p>
                        ) : (
                           <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                 <Select
                                    value={genomePublication?.source ?? ''}
                                    onValueChange={(v) =>
                                       updateGenomePublication({ source: v as OrganismPublication['source'] })
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
                                    value={genomePublication?.id ?? ''}
                                    onChange={(e) => updateGenomePublication({ id: e.target.value })}
                                 />
                                 {genomePublication?.id?.trim() ? (
                                    <>
                                       <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={genomePubStatus === 'checking'}
                                          onClick={() => void validateGenomePublication()}
                                       >
                                          {genomePubStatus === 'checking' ? (
                                             <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                             'Validate'
                                          )}
                                       </Button>
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => {
                                             setGenomePublication(null)
                                             setGenomePubStatus('idle')
                                             setGenomePubError(null)
                                             setGenomePubMetadata(null)
                                          }}
                                       >
                                          Clear
                                       </Button>
                                    </>
                                 ) : null}
                              </div>
                              {genomePubStatus === 'valid' ? (
                                 <p className="flex items-center gap-1.5 text-xs text-chart-2">
                                    <Check className="h-3.5 w-3.5" /> Validated.
                                 </p>
                              ) : null}
                              {genomePubStatus === 'valid' && genomePubMetadata ? (
                                 <PublicationMetadataCard metadata={genomePubMetadata} />
                              ) : null}
                              {genomePubStatus === 'invalid' ? (
                                 <p className="flex items-center gap-1.5 text-xs text-destructive">
                                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {genomePubError}
                                 </p>
                              ) : null}
                              {genomePublication?.id?.trim() && genomePubStatus === 'idle' ? (
                                 <p className="text-xs text-muted-foreground">
                                    Not yet validated — click Validate before submitting.
                                 </p>
                              ) : null}
                           </div>
                        )}
                     </div>

                     <div className="space-y-3">
                        <div>
                           <p className="text-sm font-medium">Other publications</p>
                           <p className="text-sm text-muted-foreground">
                              Optional extra publications about this species (for example taxonomic descriptions
                              or natural history papers). These are stored for reference only and are{' '}
                              <strong>not</strong> reflected in GoaT status or the GoaT report. The main publication
                              used for GoaT is the genome assembly publication above.
                           </p>
                        </div>
                        {publications.map((pub, i) => (
                           <div key={i} className="space-y-1.5 rounded-md border p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                 <Select
                                    value={pub.source}
                                    onValueChange={(v) =>
                                       updatePublicationRow(i, { source: v as OrganismPublication['source'] })
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
                                    onChange={(e) => updatePublicationRow(i, { id: e.target.value })}
                                 />
                                 {pub.id.trim() ? (
                                    <Button
                                       type="button"
                                       variant="outline"
                                       size="sm"
                                       disabled={pubValidationStatus[i] === 'checking'}
                                       onClick={() => void validatePublicationRow(i)}
                                    >
                                       {pubValidationStatus[i] === 'checking' ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                       ) : (
                                          'Validate'
                                       )}
                                    </Button>
                                 ) : null}
                              </div>
                              {pubValidationStatus[i] === 'valid' ? (
                                 <p className="flex items-center gap-1.5 text-xs text-chart-2">
                                    <Check className="h-3.5 w-3.5" /> Validated.
                                 </p>
                              ) : null}
                              {pubValidationStatus[i] === 'valid' && pubMetadata[i] ? (
                                 <PublicationMetadataCard metadata={pubMetadata[i]} />
                              ) : null}
                              {pubValidationStatus[i] === 'invalid' ? (
                                 <p className="flex items-center gap-1.5 text-xs text-destructive">
                                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {pubValidationError[i]}
                                 </p>
                              ) : null}
                              {pub.id.trim() && (!pubValidationStatus[i] || pubValidationStatus[i] === 'idle') ? (
                                 <p className="text-xs text-muted-foreground">
                                    Not yet validated — click Validate before submitting.
                                 </p>
                              ) : null}
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
                        genomePublication={genomePublication}
                        vernacularNames={vernacularNames}
                        metadataList={metadataList}
                        customFieldValues={customFieldValues}
                        organismCustomFields={organismCustomFields}
                        images={images}
                        onGoToStep={goToStep}
                     />
                     <div className="border-t pt-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                           {canSubmit
                              ? 'All required steps are complete. Submit to save this record.'
                              : publicationsBlockSubmit
                                ? 'Validate all entered publications (including the genome assembly publication) before submitting.'
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
                        ++taxonCheckSeqRef.current
                        ++importImagesSeqRef.current
                        lastSelectedTaxonRef.current = null
                        resetStore()
                        resetStepper()
                        setSearchQ('')
                        setSearchHits([])
                        setExistsWarning(null)
                        setExistenceCheckError(null)
                        setTaxonExistencePending(false)
                        setTaxonSpeciesWarning(null)
                        setImportingImages(false)
                        setPubValidationStatus({})
                        setPubValidationError({})
                        setPubMetadata({})
                        setGenomePubStatus('idle')
                        setGenomePubError(null)
                        setGenomePubMetadata(null)
                        setCustomFieldValues({})
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
                        ++taxonCheckSeqRef.current
                        ++importImagesSeqRef.current
                        lastSelectedTaxonRef.current = null
                        if (isEditMode && editTaxid) void loadOrganism()
                        else {
                           resetStore()
                           resetStepper()
                           setExistsWarning(null)
                           setExistenceCheckError(null)
                           setTaxonExistencePending(false)
                           setTaxonSpeciesWarning(null)
                           setPubValidationStatus({})
                           setPubValidationError({})
                           setPubMetadata({})
                           setGenomePubStatus('idle')
                           setGenomePubError(null)
                           setGenomePubMetadata(null)
                           setCustomFieldValues({})
                        }
                        setImportingImages(false)
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

function publicationExternalUrl(metadata: CmsPublicationMetadata): string | null {
   const doi = metadata.doi?.trim()
   if (doi) return `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`
   const pmid = metadata.pmid?.trim()
   if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}`
   const pmcid = metadata.pmcid?.trim()
   if (pmcid) {
      const id = pmcid.toUpperCase().startsWith('PMC') ? pmcid : `PMC${pmcid}`
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/${id}`
   }
   return null
}

function PublicationMetadataCard({ metadata }: { metadata: CmsPublicationMetadata }) {
   const title = metadata.title?.trim()
   const authors = metadata.authors?.trim()
   const journal = metadata.journal?.trim()
   const year = metadata.year?.trim()
   const journalLine = [journal, year].filter(Boolean).join(', ')
   const href = publicationExternalUrl(metadata)

   if (!title && !authors && !journalLine && !href) return null

   return (
      <div className="rounded-md border border-chart-2/30 bg-chart-2/5 p-3 text-sm space-y-1">
         {title ? <p className="font-medium leading-snug">{title}</p> : null}
         {authors ? <p className="text-xs text-muted-foreground line-clamp-2">{authors}</p> : null}
         {journalLine ? <p className="text-xs text-muted-foreground">{journalLine}</p> : null}
         {href ? (
            <a
               href={href}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-block text-xs underline hover:text-foreground"
            >
               View publication
            </a>
         ) : null}
      </div>
   )
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
   const incompleteFields = getIncompleteImageRowFields(img)

   return (
      <div className={cn('rounded-md border p-3 space-y-3', incompleteFields.length > 0 && 'border-amber-500/50')}>
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
                     update(patchImageRowForUrlChange(img, e.target.value))
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

         {incompleteFields.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
               <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
               Missing {incompleteFields.join(', ')} — this image will not be saved until all fields are filled.
            </p>
         ) : null}

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

function CustomPicklistField({
   field,
   selected,
   onChange,
}: {
   field: CmsOrganismFieldWire
   selected: string[]
   onChange: (values: string[]) => void
}) {
   if (field.type === 'single') {
      return (
         <div className="space-y-2">
            <Label>
               {field.label}
               {field.required ? <span className="ml-1 text-destructive">*</span> : null}
            </Label>
            <Select value={selected[0] ?? ''} onValueChange={(value) => onChange(value ? [value] : [])}>
               <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
               </SelectTrigger>
               <SelectContent>
                  {field.values.map((value) => (
                     <SelectItem key={value} value={value}>
                        {value}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>
      )
   }

   return (
      <div className="space-y-2">
         <Label>
            {field.label}
            {field.required ? <span className="ml-1 text-destructive">*</span> : null}
         </Label>
         <ScrollArea className="h-56 rounded-md border">
            <div className="grid gap-2 p-2 sm:grid-cols-2">
               {field.values.map((value) => {
                  const isSelected = selected.includes(value)
                  return (
                     <button
                        key={value}
                        type="button"
                        onClick={() =>
                           onChange(isSelected ? selected.filter((item) => item !== value) : [...selected, value])
                        }
                        className={cn(
                           'rounded-lg border px-3 py-2 text-left text-sm',
                           isSelected && 'border-primary bg-primary/10',
                        )}
                     >
                        {value}
                     </button>
                  )
               })}
            </div>
         </ScrollArea>
      </div>
   )
}

function OrganismFormReview({
   runtimeSteps,
   organismForm,
   publications,
   genomePublication,
   vernacularNames,
   metadataList,
   customFieldValues,
   organismCustomFields,
   images,
   onGoToStep,
}: {
   runtimeSteps: RuntimeStep[]
   organismForm: OrganismFormState
   publications: OrganismPublication[]
   genomePublication: OrganismPublication | null
   vernacularNames: OrganismCommonName[]
   metadataList: { key: string; value: string }[]
   customFieldValues: Record<string, string[]>
   organismCustomFields: CmsOrganismFieldWire[]
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

         case 'sequencingAndSubproject': {
            const stepFields = organismCustomFields.filter((field) => field.step === 'sequencingAndSubproject')
            if (stepFields.length === 0) {
               return <p className="text-xs text-muted-foreground">Not filled</p>
            }
            const hasAnySelection = stepFields.some((field) => (customFieldValues[field.key] ?? []).length > 0)
            if (!hasAnySelection) {
               return <p className="text-xs text-muted-foreground">Not filled</p>
            }
            return (
               <div className="space-y-3">
                  {stepFields.map((field) => {
                     const values = customFieldValues[field.key] ?? []
                     return (
                        <div key={field.key} className="space-y-1">
                           <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                           {values.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                 {values.map((value) => (
                                    <Badge key={value} variant="secondary">
                                       {value}
                                    </Badge>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-xs text-muted-foreground">Not selected</p>
                           )}
                        </div>
                     )
                  })}
               </div>
            )
         }

         case 'images': {
            const validImages = filterCompleteImages(images)
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
            const hasGenomePub = Boolean(genomePublication?.id?.trim())
            return (
               <div className="space-y-2">
                  {hasGenomePub ? (
                     <p className="text-sm">
                        <Badge variant="secondary" className="mr-2">
                           Genome publication
                        </Badge>
                        <span className="text-muted-foreground">{genomePublication?.source}: </span>
                        {genomePublication?.id}
                     </p>
                  ) : null}
                  {validPubs.length > 0 ? (
                     <ul className="space-y-1">
                        {validPubs.map((p, i) => (
                           <li key={i} className="text-sm">
                              <span className="text-muted-foreground">{p.source}: </span>
                              {p.id}
                           </li>
                        ))}
                     </ul>
                  ) : null}
                  {!hasGenomePub && validPubs.length === 0 ? (
                     <p className="text-xs text-muted-foreground">No publications</p>
                  ) : null}
               </div>
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
