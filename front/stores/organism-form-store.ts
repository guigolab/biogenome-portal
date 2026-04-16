'use client'

import { create } from 'zustand'

export type OrganismPublication = { source: 'DOI' | 'PubMed ID' | 'PubMed CentralID' | ''; id: string }

export type OrganismCommonName = { value: string; locality: string; lang: string }

export type OrganismImageRow = {
   url: string
   author: string
   source_record_url: string
   license: string
   license_url?: string
}

export type OrganismFormState = {
   taxid: string | null
   scientific_name: string | null
   common_names: OrganismCommonName[]
   image: string
   images: OrganismImageRow[]
   image_urls: string[]
   metadata: Record<string, string>
   publications: OrganismPublication[]
   sub_project: string | null
   goat_status: string
   target_list_status: 'long_list' | 'family_representative' | 'other_priority' | ''
   sequencing_type: string[]
}

const emptyForm = (): OrganismFormState => ({
   taxid: null,
   scientific_name: null,
   common_names: [],
   image: '',
   images: [],
   image_urls: [],
   metadata: {},
   publications: [],
   sub_project: null,
   goat_status: '',
   target_list_status: 'long_list',
   sequencing_type: [],
})

type OrganismFormStore = {
   organismForm: OrganismFormState
   metadataList: { key: string; value: string }[]
   publications: OrganismPublication[]
   vernacularNames: OrganismCommonName[]
   images: OrganismImageRow[]
   imageUsageComplianceOk: boolean
   setOrganismForm: (p: Partial<OrganismFormState>) => void
   replaceOrganismForm: (f: OrganismFormState) => void
   setMetadataList: (v: { key: string; value: string }[]) => void
   setPublications: (v: OrganismPublication[]) => void
   setVernacularNames: (v: OrganismCommonName[]) => void
   setImages: (v: OrganismImageRow[]) => void
   setImageUsageComplianceOk: (v: boolean) => void
   reset: () => void
}

export const useOrganismFormStore = create<OrganismFormStore>((set) => ({
   organismForm: emptyForm(),
   metadataList: [],
   publications: [],
   vernacularNames: [],
   images: [],
   imageUsageComplianceOk: false,

   setOrganismForm: (p) => set((s) => ({ organismForm: { ...s.organismForm, ...p } })),
   replaceOrganismForm: (f) => set({ organismForm: f }),
   setMetadataList: (metadataList) => set({ metadataList }),
   setPublications: (publications) => set({ publications }),
   setVernacularNames: (vernacularNames) => set({ vernacularNames }),
   setImages: (images) => set({ images }),
   setImageUsageComplianceOk: (imageUsageComplianceOk) => set({ imageUsageComplianceOk }),

   reset: () =>
      set({
         organismForm: emptyForm(),
         metadataList: [],
         publications: [],
         vernacularNames: [],
         images: [],
         imageUsageComplianceOk: false,
      }),
}))
