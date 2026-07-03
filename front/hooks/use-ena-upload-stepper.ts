'use client'

import { useCallback, useMemo, useState } from 'react'

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

function getGroupFields(group: Record<string, unknown>): Record<string, unknown>[] {
   const f = group.field
   if (!f) return []
   return Array.isArray(f) ? f : [f]
}

function normalizeGroups(checklist: Record<string, unknown>): EnaStepDef[] {
   const groups = checklist?.descriptor as Record<string, unknown> | undefined
   const fieldGroup = groups?.field_group
   if (!fieldGroup) return []
   const list = Array.isArray(fieldGroup) ? fieldGroup : [fieldGroup]
   return list.map((group, i) => {
      const g = group as Record<string, unknown>
      const fields = getGroupFields(g)
      const mandatoryFieldKeys = fields
         .filter((f) => {
            const m = (f as { mandatory?: { text?: string } }).mandatory
            return m?.text === 'mandatory'
         })
         .map((f) => String((f as { name: { text: string } }).name.text))
      const name = (g.name as { text?: string })?.text ?? `Group ${i + 1}`
      const desc = (g.description as { text?: string } | undefined)?.text ?? ''
      return {
         id: `group-${i}`,
         kind: 'checklistGroup' as const,
         title: String(name),
         description: String(desc),
         required: mandatoryFieldKeys.length > 0,
         groupIndex: i,
         mandatoryFieldKeys,
      }
   })
}

const SAMPLE_INFO_STEP: EnaStepDef = {
   id: 'sampleInfo',
   kind: 'sampleInfo',
   title: 'Sample information',
   description: 'Organism and a unique biosample identifier.',
   required: true,
   groupIndex: undefined,
   mandatoryFieldKeys: [],
}

const REVIEW_STEP: EnaStepDef = {
   id: 'reviewSubmit',
   kind: 'reviewSubmit',
   title: 'Review & submit',
   description: 'Check values and submit to EBI.',
   required: true,
   groupIndex: undefined,
   mandatoryFieldKeys: [],
}

export function useEnaUploadStepper(
   checklist: Record<string, unknown> | null,
   sample: {
      scientificName: string
      sampleIdentifier: string
      taxid: string
      characterics: Record<string, string | string[]>
   },
) {
   const [activeIndex, setActiveIndex] = useState(0)

   const steps = useMemo<EnaStepDef[]>(() => {
      if (!checklist) return [SAMPLE_INFO_STEP, REVIEW_STEP]
      return [SAMPLE_INFO_STEP, ...normalizeGroups(checklist), REVIEW_STEP]
   }, [checklist])

   function isStepComplete(step: EnaStepDef): boolean {
      if (step.kind === 'sampleInfo') {
         return Boolean(
            sample.scientificName?.trim() && sample.sampleIdentifier?.trim() && sample.taxid?.trim(),
         )
      }
      if (step.kind === 'reviewSubmit') return false
      if (step.mandatoryFieldKeys.length === 0) return true
      return step.mandatoryFieldKeys.every((key) => {
         const v = sample.characterics[key]
         return Boolean(v && String(v).trim())
      })
   }

   const runtimeSteps = useMemo((): EnaRuntimeStep[] => {
      let blockedFromHere = false
      return steps.map((step, index) => {
         const complete = isStepComplete(step)
         const blocked = blockedFromHere
         if (step.required && !complete && step.kind !== 'reviewSubmit') {
            blockedFromHere = true
         }
         return { ...step, index, complete, blocked }
      })
   }, [steps, sample.scientificName, sample.sampleIdentifier, sample.taxid, sample.characterics])

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
      return runtimeSteps.filter((s) => s.required && s.kind !== 'reviewSubmit').every((s) => s.complete)
   }, [runtimeSteps])

   const isNextBlocked = useMemo(() => {
      const next = activeIndex + 1
      if (next >= runtimeSteps.length) return true
      return !canNavigateTo(next)
   }, [activeIndex, runtimeSteps, canNavigateTo])

   return {
      steps,
      runtimeSteps,
      activeIndex,
      activeStep,
      canNavigateTo,
      goToStep,
      goNext,
      goPrev,
      resetStepper,
      canSubmit,
      isNextBlocked,
   }
}
