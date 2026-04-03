'use client'

import { useCallback, useMemo, useState } from 'react'

import { INSDC_MODEL_META, type ImportPhase, type InsdcModel } from '@/lib/cms/insdc-model-meta'
import { cmsImportAssembly, cmsImportBioSample, cmsImportRead } from '@/lib/cms/services/auth'

export type { ImportPhase, InsdcModel }

export function useInsdcImportFlow(initialModel?: InsdcModel) {
   const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
   const [model, setModelState] = useState<InsdcModel>(initialModel ?? 'biosamples')
   const [accession, setAccession] = useState('')
   const [phase, setPhase] = useState<ImportPhase>('idle')
   const [resultMessage, setResultMessage] = useState('')
   const [resultDetails, setResultDetails] = useState('')

   const activeMeta = useMemo(() => INSDC_MODEL_META[model], [model])
   const normalizedAccession = useMemo(() => accession.trim().toUpperCase(), [accession])
   const accessionValid = useMemo(() => {
      const v = normalizedAccession
      return v.length >= 4 && activeMeta.accessionRegex.test(v)
   }, [normalizedAccession, activeMeta.accessionRegex])

   const isStepValid = useMemo(() => {
      if (step === 1) return true
      if (step === 2) return accessionValid
      if (step === 3) return true
      return true
   }, [step, accessionValid])

   const setModel = useCallback((m: InsdcModel) => {
      setModelState(m)
      setAccession('')
   }, [])

   const next = useCallback(() => {
      setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3 | 4) : s))
   }, [])

   const back = useCallback(() => {
      setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))
   }, [])

   const reset = useCallback(() => {
      setStep(1)
      setAccession('')
      setPhase('idle')
      setResultMessage('')
      setResultDetails('')
   }, [])

   const newImport = useCallback(() => {
      setAccession('')
      setPhase('idle')
      setResultMessage('')
      setResultDetails('')
      setStep(2)
   }, [])

   const submit = useCallback(async () => {
      if (!accessionValid) return
      setPhase('submitting')
      setStep(4)
      try {
         const acc = normalizedAccession
         if (model === 'biosamples') await cmsImportBioSample(acc)
         else if (model === 'assemblies') await cmsImportAssembly(acc)
         else await cmsImportRead(acc)

         setPhase('success')
         setResultMessage(`${activeMeta.label} ${acc} imported successfully.`)
         setResultDetails(activeMeta.sideEffects ?? '')
      } catch (err) {
         setPhase('error')
         const msg =
            err instanceof Error
               ? err.message
               : typeof err === 'string'
                 ? err
                 : 'Import failed. Please check the accession and try again.'
         setResultMessage(msg)
         setResultDetails('')
      }
   }, [accessionValid, normalizedAccession, model, activeMeta])

   return {
      step,
      setStep,
      model,
      accession,
      setAccession,
      normalizedAccession,
      phase,
      resultMessage,
      resultDetails,
      activeMeta,
      accessionValid,
      isStepValid,
      setModel,
      next,
      back,
      reset,
      newImport,
      submit,
   }
}
