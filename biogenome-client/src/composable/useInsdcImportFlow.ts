import { computed, ref } from 'vue'
import { AxiosError } from 'axios'
import AuthService from '../services/AuthService'

export type InsdcModel = 'biosamples' | 'assemblies' | 'reads'
export type ImportPhase = 'idle' | 'submitting' | 'success' | 'error'

export interface InsdcModelMeta {
   key: InsdcModel
   label: string
   icon: string
   description: string
   accessionHint: string
   accessionRegex: RegExp
   sideEffects: string
   createLabel: string
}

export const MODEL_META: Record<InsdcModel, InsdcModelMeta> = {
   biosamples: {
      key: 'biosamples',
      label: 'Biosample',
      icon: 'fa-vial',
      description: 'Import a BioSample record from EBI, NCBI, or DDBJ.',
      accessionHint: 'e.g. SAMN12345678, SAME12345678, SAMD12345678',
      accessionRegex: /^SAM[END][A-Z]?\d+$/i,
      sideEffects: '',
      createLabel: 'Import Biosample',
   },
   assemblies: {
      key: 'assemblies',
      label: 'Assembly',
      icon: 'fa-dna',
      description: 'Import a genome assembly from INSDC.',
      accessionHint: 'e.g. GCA_000001405.15 or GCF_000001405.40',
      accessionRegex: /^GC[AF]_\d+\.\d+$/i,
      sideEffects: 'The related biosample will also be imported if not already present.',
      createLabel: 'Import Assembly',
   },
   reads: {
      key: 'reads',
      label: 'Read run',
      icon: 'fa-folder-open',
      description: 'Import a sequencing read run from SRA, ENA, or DRA.',
      accessionHint: 'e.g. SRR12345678, ERR12345678, DRR12345678',
      accessionRegex: /^[SED]RR\d+$/i,
      sideEffects: 'The related biosample will also be imported if not already present.',
      createLabel: 'Import Read run',
   },
}

export function useInsdcImportFlow(initialModel?: InsdcModel) {
   const step = ref<1 | 2 | 3 | 4>(1)
   const model = ref<InsdcModel>(initialModel ?? 'biosamples')
   const accession = ref('')
   const phase = ref<ImportPhase>('idle')
   const resultMessage = ref('')
   const resultDetails = ref('')

   const activeMeta = computed(() => MODEL_META[model.value])

   const normalizedAccession = computed(() => accession.value.trim().toUpperCase())

   const accessionValid = computed(() => {
      const v = normalizedAccession.value
      return v.length >= 4 && activeMeta.value.accessionRegex.test(v)
   })

   const isStepValid = computed(() => {
      if (step.value === 1) return true
      if (step.value === 2) return accessionValid.value
      if (step.value === 3) return true
      return true
   })

   function setModel(m: InsdcModel) {
      model.value = m
      accession.value = ''
   }

   function next() {
      if (step.value < 3) step.value = (step.value + 1) as 1 | 2 | 3 | 4
   }

   function back() {
      if (step.value > 1) step.value = (step.value - 1) as 1 | 2 | 3 | 4
   }

   function reset() {
      step.value = 1
      accession.value = ''
      phase.value = 'idle'
      resultMessage.value = ''
      resultDetails.value = ''
   }

   function resetToStep1() {
      reset()
   }

   function newImport() {
      accession.value = ''
      phase.value = 'idle'
      resultMessage.value = ''
      resultDetails.value = ''
      step.value = 2
   }

   async function submit() {
      if (!accessionValid.value) return
      phase.value = 'submitting'
      step.value = 4
      try {
         const acc = normalizedAccession.value
         if (model.value === 'biosamples') await AuthService.importBioSample(acc)
         else if (model.value === 'assemblies') await AuthService.importAssembly(acc)
         else await AuthService.importRead(acc)

         phase.value = 'success'
         resultMessage.value = `${activeMeta.value.label} ${acc} imported successfully.`
         if (activeMeta.value.sideEffects) {
            resultDetails.value = activeMeta.value.sideEffects
         }
      } catch (err) {
         phase.value = 'error'
         const ax = err as AxiosError
         const raw = ax.response?.data
         resultMessage.value =
            (typeof raw === 'string' ? raw : (raw as any)?.message) ||
            ax.message ||
            'Import failed. Please check the accession and try again.'
         resultDetails.value = ''
      }
   }

   return {
      step,
      model,
      accession,
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
      resetToStep1,
      newImport,
      submit,
   }
}
