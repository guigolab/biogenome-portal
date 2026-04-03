'use client'

import { create } from 'zustand'

export type SampleCharacteristic = { text?: string; ontologyTerms?: string[]; unit?: string }

function convertToSampleCharacteristic(value: string, unit?: string): SampleCharacteristic[] {
   const characteristic: SampleCharacteristic = { text: value }
   if (unit) characteristic.unit = unit
   return [characteristic]
}

function mapValue(v: string[] | string) {
   if (Array.isArray(v)) {
      if (v.length === 1) return v[0]
      return v.join(',')
   }
   return v
}

function getUnit(key: string, fields: { name: string; unit?: string }[]) {
   return fields.find(({ name }) => name === key)?.unit
}

type SampleStore = {
   characterics: Record<string, string | string[]>
   taxid: string
   scientificName: string
   sampleIdentifier: string
   checklist: string
   sampleDerivedFrom: string
   loading: boolean
   validationErrors: string[]
   setField: (
      k: 'taxid' | 'scientificName' | 'sampleIdentifier' | 'checklist' | 'sampleDerivedFrom',
      v: string,
   ) => void
   setCharacteristic: (k: string, v: string | string[]) => void
   reset: () => void
   mapFormToEBIPayload: (checklistFields: { name: string; unit?: string }[]) => Record<string, SampleCharacteristic[]>
}

export const useCmsSampleStore = create<SampleStore>((set, get) => ({
   characterics: {},
   taxid: '',
   scientificName: '',
   sampleIdentifier: '',
   checklist: '',
   sampleDerivedFrom: '',
   loading: false,
   validationErrors: [],

   setField: (k, v) => set({ [k]: v } as Partial<SampleStore>),
   setCharacteristic: (k, v) => set((s) => ({ characterics: { ...s.characterics, [k]: v } })),
   reset: () =>
      set({
         characterics: {},
         taxid: '',
         scientificName: '',
         sampleIdentifier: '',
         checklist: '',
         sampleDerivedFrom: '',
         loading: false,
         validationErrors: [],
      }),

   mapFormToEBIPayload(checklistFields) {
      const s = get()
      const organismChar: SampleCharacteristic = { text: s.scientificName }
      if (s.taxid) organismChar.ontologyTerms = [s.taxid]
      return {
         Organism: [organismChar],
         checklist: convertToSampleCharacteristic(s.checklist),
         ...Object.fromEntries(
            Object.entries(s.characterics)
               .filter(([, v]) => v)
               .map(([k, v]) => [
                  k,
                  convertToSampleCharacteristic(mapValue(v), getUnit(k, checklistFields)),
               ]),
         ),
      }
   },
}))
