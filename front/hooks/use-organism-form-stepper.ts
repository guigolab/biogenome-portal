'use client'

import { useCallback, useMemo, useState } from 'react'

import type { OrganismFormStepDef, OrganismFormStepId } from '@/lib/portal/types'
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
): StepCompletionState {
   switch (id) {
      case 'selectOrganism':
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
         const hasAdditional = images.some((i) => i.url?.trim())
         return { complete: hasAdditional, partial: false }
      }
      case 'publications': {
         const valid = publications.filter((p) => p.id.trim())
         return { complete: valid.length > 0, partial: publications.some((p) => !p.id.trim() && p.source) }
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
}: {
   steps: OrganismFormStepDef[]
   isEditMode: boolean
   hasGoat: boolean
   form: OrganismFormState
   publications: OrganismPublication[]
   vernacularNames: OrganismCommonName[]
   metadataList: { key: string; value: string }[]
   images: OrganismImageRow[]
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

   const runtimeSteps = useMemo((): RuntimeStep[] => {
      let blockedFromHere = false
      return visibleSteps.map((step, index) => {
         let completion = computeCompletion(step.id, form, publications, vernacularNames, metadataList, images)
         if (step.id === 'images' && step.required) {
            completion = {
               complete: images.some((img) => Boolean(img.url?.trim())),
               partial: false,
            }
         }
         const blocked = blockedFromHere
         if (step.required && !completion.complete && step.id !== 'reviewSubmit') {
            blockedFromHere = true
         }
         return { ...step, index, completion, blocked }
      })
   }, [visibleSteps, form, publications, vernacularNames, metadataList, images])

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

   const canSubmit = useMemo(() => {
      return runtimeSteps.filter((s) => s.required && s.id !== 'reviewSubmit').every((s) => s.completion.complete)
   }, [runtimeSteps])

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
   }
}
