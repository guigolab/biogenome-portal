import { computed, ref, type Ref } from 'vue'
import type { OrganismFormStepDef, OrganismFormStepId } from '../data/types'
import type { OrganismForm, CommonName, Publication } from '../data/types'

export type StepCompletionState = {
   complete: boolean
   /** Indicates the step has data but might be incomplete (e.g. partial row). */
   partial: boolean
}

/** Runtime-resolved step with computed completion state. */
export type RuntimeStep = OrganismFormStepDef & {
   /** Index in the filtered (visible) step list. */
   index: number
   completion: StepCompletionState
   /** Whether this step is blocked by a prior incomplete required step. */
   blocked: boolean
}

type StepperDeps = {
   steps: OrganismFormStepDef[]
   isEditMode: Ref<boolean>
   hasGoat: Ref<boolean>
   form: Ref<OrganismForm>
   publications: Ref<Publication[]>
   vernacularNames: Ref<CommonName[]>
   metadataList: Ref<{ key: string; value: string }[]>
   images: Ref<{ value: string }[]>
}

function computeCompletion(
   id: OrganismFormStepId,
   form: OrganismForm,
   publications: Publication[],
   vernacularNames: CommonName[],
   metadataList: { key: string; value: string }[],
   images: { value: string }[],
): StepCompletionState {
   switch (id) {
      case 'selectOrganism':
         return { complete: Boolean(form.taxid), partial: false }

      case 'goatStatus':
         return {
            complete: Boolean(form.goat_status || form.target_list_status),
            partial: false,
         }

      case 'sequencingAndSubproject':
         return {
            complete: Boolean(form.sequencing_type?.length || (form.sub_project && form.sub_project.trim())),
            partial: Boolean(
               (form.sequencing_type?.length || 0) > 0 !== Boolean(form.sub_project && form.sub_project.trim()),
            ),
         }

      case 'piOrEntity':
         return {
            complete: Boolean(form.sub_project && form.sub_project.trim()),
            partial: false,
         }

      case 'images': {
         const hasPrimary = Boolean(form.image && form.image.trim())
         const hasAdditional = images.some((i) => i.value.trim())
         return { complete: hasPrimary || hasAdditional, partial: false }
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
}: StepperDeps) {
   const activeIndex = ref(0)

   /** Filter steps by visibility rules. */
   const visibleSteps = computed<OrganismFormStepDef[]>(() => {
      return steps.filter((step) => {
         if (!step.enabled) return false
         // selectOrganism is only shown in create mode
         if (step.id === 'selectOrganism') return !isEditMode.value
         // goatStatus is only shown when goat is enabled in appConfig
         if (step.id === 'goatStatus') return hasGoat.value
         return true
      })
   })

   /** Runtime steps with completion and blocked state. */
   const runtimeSteps = computed<RuntimeStep[]>(() => {
      const fv = form.value
      const pubs = publications.value
      const names = vernacularNames.value
      const meta = metadataList.value
      const imgs = images.value

      let blockedFromHere = false
      return visibleSteps.value.map((step, index) => {
         const completion = computeCompletion(step.id, fv, pubs, names, meta, imgs)
         const blocked = blockedFromHere
         // If this step is required and incomplete (and not review step), block all subsequent
         if (step.required && !completion.complete && step.id !== 'reviewSubmit') {
            blockedFromHere = true
         }
         return { ...step, index, completion, blocked }
      })
   })

   const activeStep = computed(() => runtimeSteps.value[activeIndex.value] ?? runtimeSteps.value[0])

   function canNavigateTo(index: number): boolean {
      if (index < 0 || index >= runtimeSteps.value.length) return false
      // Can always go back
      if (index <= activeIndex.value) return true
      // Can always go forward to any non-blocked step
      return !runtimeSteps.value[index].blocked
   }

   function goToStep(index: number) {
      if (!canNavigateTo(index)) return
      activeIndex.value = index
   }

   function goNext() {
      const next = activeIndex.value + 1
      if (next < runtimeSteps.value.length && canNavigateTo(next)) {
         activeIndex.value = next
      }
   }

   function goPrev() {
      if (activeIndex.value > 0) {
         activeIndex.value -= 1
      }
   }

   function resetStepper() {
      activeIndex.value = 0
   }

   /** Whether all mandatory steps before review are complete. */
   const canSubmit = computed(() => {
      return runtimeSteps.value
         .filter((s) => s.required && s.id !== 'reviewSubmit')
         .every((s) => s.completion.complete)
   })

   /** Number of completed steps (excluding reviewSubmit). */
   const completedCount = computed(() => {
      return runtimeSteps.value.filter((s) => s.id !== 'reviewSubmit' && s.completion.complete).length
   })

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
      completedCount,
   }
}
