import { computed, ref, type Ref } from 'vue'
import { useSampleStore } from '../stores/sample-store'

export type EnaStepKind = 'sampleInfo' | 'checklistGroup' | 'reviewSubmit'

export type EnaStepDef = {
   id: string
   kind: EnaStepKind
   title: string
   description: string
   required: boolean
   groupIndex: number | undefined
   mandatoryFieldKeys: string[]
}

export type EnaRuntimeStep = EnaStepDef & {
   index: number
   complete: boolean
   blocked: boolean
}

function getGroupFields(group: Record<string, any>): any[] {
   if (!group.field) return []
   return Array.isArray(group.field) ? group.field : [group.field]
}

function normalizeGroups(checklist: Record<string, any>): EnaStepDef[] {
   const groups = checklist?.descriptor?.field_group
   if (!groups) return []
   return (groups as any[]).map((group, i) => {
      const fields = getGroupFields(group)
      const mandatoryFieldKeys = fields
         .filter((f) => f?.mandatory?.text === 'mandatory')
         .map((f) => String(f.name.text))
      return {
         id: `group-${i}`,
         kind: 'checklistGroup' as EnaStepKind,
         title: String(group.name.text),
         description: group.description?.text ? String(group.description.text) : '',
         required: mandatoryFieldKeys.length > 0,
         groupIndex: i,
         mandatoryFieldKeys,
      }
   })
}

const SAMPLE_INFO_STEP: EnaStepDef = {
   id: 'sampleInfo',
   kind: 'sampleInfo',
   title: 'Sample Information',
   description: 'Select the organism and set a unique identifier for this biosample.',
   required: true,
   groupIndex: undefined,
   mandatoryFieldKeys: [],
}

const REVIEW_STEP: EnaStepDef = {
   id: 'reviewSubmit',
   kind: 'reviewSubmit',
   title: 'Review & Submit',
   description: 'Review all sample data and validate geographic coordinates before publishing.',
   required: true,
   groupIndex: undefined,
   mandatoryFieldKeys: [],
}

export function useEnaUploadStepper(checklist: Ref<Record<string, any> | null>) {
   const sampleStore = useSampleStore()
   const activeIndex = ref(0)

   const steps = computed<EnaStepDef[]>(() => {
      if (!checklist.value) return [SAMPLE_INFO_STEP, REVIEW_STEP]
      return [SAMPLE_INFO_STEP, ...normalizeGroups(checklist.value), REVIEW_STEP]
   })

   function isStepComplete(step: EnaStepDef): boolean {
      if (step.kind === 'sampleInfo') {
         return Boolean(sampleStore.scientificName && sampleStore.sampleIdentifier)
      }
      if (step.kind === 'reviewSubmit') return false
      // Optional groups with no mandatory fields are always complete
      if (step.mandatoryFieldKeys.length === 0) return true
      return step.mandatoryFieldKeys.every((key) => {
         const v = sampleStore.characterics[key]
         return Boolean(v && String(v).trim())
      })
   }

   const runtimeSteps = computed<EnaRuntimeStep[]>(() => {
      let blockedFromHere = false
      return steps.value.map((step, index) => {
         const complete = isStepComplete(step)
         const blocked = blockedFromHere
         if (step.required && !complete && step.kind !== 'reviewSubmit') {
            blockedFromHere = true
         }
         return { ...step, index, complete, blocked }
      })
   })

   const activeStep = computed<EnaRuntimeStep>(
      () => runtimeSteps.value[activeIndex.value] ?? runtimeSteps.value[0]!,
   )

   function canNavigateTo(index: number): boolean {
      if (index < 0 || index >= runtimeSteps.value.length) return false
      if (index <= activeIndex.value) return true
      return !runtimeSteps.value[index].blocked
   }

   function goToStep(index: number) {
      if (canNavigateTo(index)) activeIndex.value = index
   }

   function goNext() {
      const next = activeIndex.value + 1
      if (canNavigateTo(next)) activeIndex.value = next
   }

   function goPrev() {
      if (activeIndex.value > 0) activeIndex.value--
   }

   function resetStepper() {
      activeIndex.value = 0
   }

   /** True when the next step cannot be navigated to (next is blocked). */
   const isNextBlocked = computed(() => {
      const next = activeIndex.value + 1
      return !canNavigateTo(next)
   })

   /** True when all required non-review steps are complete. */
   const canSubmit = computed(() =>
      runtimeSteps.value
         .filter((s) => s.required && s.kind !== 'reviewSubmit')
         .every((s) => s.complete),
   )

   return {
      runtimeSteps,
      activeIndex,
      activeStep,
      canNavigateTo,
      goToStep,
      goNext,
      goPrev,
      resetStepper,
      isNextBlocked,
      canSubmit,
   }
}
