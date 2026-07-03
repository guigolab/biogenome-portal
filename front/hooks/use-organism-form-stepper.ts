'use client'

import { useCallback, useMemo, useState } from 'react'

import type { OrganismFormStepDef, OrganismFormStepId } from '@/lib/portal/types'
import {
   allPublicationsValidated,
   isCompleteImageRow,
   isGenomePublicationValidated,
   isPartialImageRow,
   type PublicationValidationStatus,
} from '@/lib/cms/organism-form-payload'
import type {
   OrganismCommonName,
   OrganismFormState,
   OrganismImageRow,
   OrganismPublication,
} from '@/stores/organism-form-store'

export type StepCompletionState = { complete: boolean; partial: boolean }

export type RuntimeStep = OrganismFormStepDef & {
   index: number
   completion: StepCompletionState
   blocked: boolean
}

function computeCompletion(
   id: OrganismFormStepId,
   form: OrganismFormState,
   publications: OrganismPublication[],
   vernacularNames: OrganismCommonName[],
   metadataList: { key: string; value: string }[],
   images: OrganismImageRow[],
   opts?: {
      isEditMode: boolean
      /** Selected taxid already exists in portal (create flow) */
      createOrganismTaxonConflict: boolean
      /** Existence check still in flight after picking a taxon (create flow) */
      taxonExistenceCheckPending?: boolean
      /** Existence check failed (non-404); taxon availability unknown */
      taxonExistenceCheckFailed?: boolean
      /** Single genome-assembly publication (locked until an assembly is linked) */
      genomePublication?: OrganismPublication | null
      /** Per-row validation status, keyed by index into `publications` */
      publicationValidation?: Record<number, PublicationValidationStatus>
      /** Validation status of `genomePublication` */
      genomePublicationValidation?: PublicationValidationStatus
   },
): StepCompletionState {
   switch (id) {
      case 'selectOrganism':
         if (
            !opts?.isEditMode &&
            (opts?.createOrganismTaxonConflict ||
               opts?.taxonExistenceCheckPending ||
               opts?.taxonExistenceCheckFailed)
         ) {
            return { complete: false, partial: false }
         }
         return { complete: Boolean(form.taxid), partial: false }
      case 'goatStatus':
         return { complete: Boolean(form.goat_status || form.target_list_status), partial: false }
      case 'sequencingAndSubproject':
         return {
            complete: Boolean(form.sequencing_type?.length || (form.sub_project && form.sub_project.trim())),
            partial: Boolean(
               (form.sequencing_type?.length || 0) > 0 !== Boolean(form.sub_project && form.sub_project.trim()),
            ),
         }
      case 'piOrEntity':
         return { complete: Boolean(form.sub_project && form.sub_project.trim()), partial: false }
      case 'images': {
         const complete = images.some(isCompleteImageRow)
         const partial = !complete && images.some(isPartialImageRow)
         return { complete, partial }
      }
      case 'publications': {
         const valid = publications.filter((p) => p.id.trim())
         const genomePublication = opts?.genomePublication ?? null
         const allRowsValidated = allPublicationsValidated(publications, opts?.publicationValidation ?? {})
         const genomeValidated = isGenomePublicationValidated(
            genomePublication,
            opts?.genomePublicationValidation ?? 'idle',
         )
         const hasContent = valid.length > 0 || Boolean(genomePublication?.id?.trim())
         return {
            complete: hasContent && allRowsValidated && genomeValidated,
            partial:
               publications.some((p) => !p.id.trim() && p.source) ||
               (hasContent && (!allRowsValidated || !genomeValidated)),
         }
      }
      case 'vernacularNames': {
         const valid = vernacularNames.filter((n) => n.value.trim())
         return {
            complete: valid.length > 0,
            partial: vernacularNames.some((n) => !n.value.trim() && (n.lang || n.locality)),
         }
      }
      case 'extraMetadata': {
         const valid = metadataList.filter((m) => m.key.trim())
         return { complete: valid.length > 0, partial: metadataList.some((m) => !m.key.trim() && m.value) }
      }
      case 'reviewSubmit':
         return { complete: false, partial: false }
      default:
         return { complete: false, partial: false }
   }
}

export function useOrganismFormStepper({
   steps,
   isEditMode,
   hasGoat,
   form,
   publications,
   vernacularNames,
   metadataList,
   images,
   genomePublication = null,
   publicationValidation = {},
   genomePublicationValidation = 'idle',
   createOrganismTaxonConflict = false,
   taxonExistenceCheckPending = false,
   taxonExistenceCheckFailed = false,
}: {
   steps: OrganismFormStepDef[]
   isEditMode: boolean
   hasGoat: boolean
   form: OrganismFormState
   publications: OrganismPublication[]
   vernacularNames: OrganismCommonName[]
   metadataList: { key: string; value: string }[]
   images: OrganismImageRow[]
   /** Single genome-assembly publication (locked until an assembly is linked) */
   genomePublication?: OrganismPublication | null
   /** Per-row validation status, keyed by index into `publications` */
   publicationValidation?: Record<number, PublicationValidationStatus>
   /** Validation status of `genomePublication` */
   genomePublicationValidation?: PublicationValidationStatus
   /** Create flow only: true when the selected taxid already exists in the portal */
   createOrganismTaxonConflict?: boolean
   /** Create flow: true while POST existence check is in flight after selecting a taxon */
   taxonExistenceCheckPending?: boolean
   /** Create flow: true when the existence check errored (non-404) */
   taxonExistenceCheckFailed?: boolean
}) {
   const [activeIndex, setActiveIndex] = useState(0)

   const visibleSteps = useMemo(() => {
      return steps.filter((step) => {
         if (!step.enabled) return false
         if (step.id === 'selectOrganism') return !isEditMode
         if (step.id === 'goatStatus') return hasGoat
         return true
      })
   }, [steps, isEditMode, hasGoat])

   const completionOpts = useMemo(
      () => ({
         isEditMode,
         createOrganismTaxonConflict,
         taxonExistenceCheckPending,
         taxonExistenceCheckFailed,
         genomePublication,
         publicationValidation,
         genomePublicationValidation,
      }),
      [
         isEditMode,
         createOrganismTaxonConflict,
         taxonExistenceCheckPending,
         taxonExistenceCheckFailed,
         genomePublication,
         publicationValidation,
         genomePublicationValidation,
      ],
   )

   const runtimeSteps = useMemo((): RuntimeStep[] => {
      let blockedFromHere = false
      return visibleSteps.map((step, index) => {
         let completion = computeCompletion(
            step.id,
            form,
            publications,
            vernacularNames,
            metadataList,
            images,
            completionOpts,
         )
         if (step.id === 'goatStatus' && step.required) {
            completion = {
               complete: Boolean(form.goat_status?.trim()) && Boolean(form.target_list_status),
               partial: false,
            }
         }
         if (step.id === 'images' && step.required) {
            const complete = images.some(isCompleteImageRow)
            completion = {
               complete,
               partial: !complete && images.some(isPartialImageRow),
            }
         }
         const blocked = blockedFromHere
         if (step.required && !completion.complete && step.id !== 'reviewSubmit') {
            blockedFromHere = true
         }
         return { ...step, index, completion, blocked }
      })
   }, [visibleSteps, form, publications, vernacularNames, metadataList, images, completionOpts])

   const activeStep = runtimeSteps[activeIndex] ?? runtimeSteps[0]

   const canNavigateTo = useCallback(
      (index: number) => {
         if (index < 0 || index >= runtimeSteps.length) return false
         if (index <= activeIndex) return true
         return !runtimeSteps[index].blocked
      },
      [activeIndex, runtimeSteps],
   )

   const goToStep = useCallback(
      (index: number) => {
         if (canNavigateTo(index)) setActiveIndex(index)
      },
      [canNavigateTo],
   )

   const goNext = useCallback(() => {
      const next = activeIndex + 1
      if (next < runtimeSteps.length && canNavigateTo(next)) setActiveIndex(next)
   }, [activeIndex, runtimeSteps.length, canNavigateTo])

   const goPrev = useCallback(() => {
      if (activeIndex > 0) setActiveIndex((i) => i - 1)
   }, [activeIndex])

   const resetStepper = useCallback(() => setActiveIndex(0), [])

   /** Blocks submit even when the (optional) publications step isn't "required": any filled-in
    *  publication or genome_publication must be validated OK, not just non-empty. */
   const publicationsBlockSubmit = useMemo(() => {
      const allRowsValidated = allPublicationsValidated(publications, publicationValidation)
      const genomeValidated = isGenomePublicationValidated(genomePublication, genomePublicationValidation)
      return !allRowsValidated || !genomeValidated
   }, [publications, publicationValidation, genomePublication, genomePublicationValidation])

   const canSubmit = useMemo(() => {
      const requiredStepsComplete = runtimeSteps
         .filter((s) => s.required && s.id !== 'reviewSubmit')
         .every((s) => s.completion.complete)
      return requiredStepsComplete && !publicationsBlockSubmit
   }, [runtimeSteps, publicationsBlockSubmit])

   return {
      visibleSteps,
      runtimeSteps,
      activeIndex,
      activeStep,
      canNavigateTo,
      goToStep,
      goNext,
      goPrev,
      resetStepper,
      canSubmit,
      publicationsBlockSubmit,
   }
}
