import { defineStore } from 'pinia'

const initAnnotationForm = {
  name: '',
  assembly_accession: '',
  assembly_name: '',
  taxid: '',
  gff_gz_location: '',
  tab_index_location: '',
  metadata: {} as Record<string, string>,
}

export const useAnnotationStore = defineStore('annotation', {
  state: () => {
    return {
      annotationForm: { ...initAnnotationForm },
    }
  },
})
