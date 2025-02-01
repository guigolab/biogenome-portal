import { defineStore } from 'pinia'

const initAnnotationForm: Record<string, any> = {
  name: '',
  assembly_accession: '',
  assembly_name: '',
  taxid: '',
  gff_gz_location: '',
  tab_index_location: '',
  gzipAnnotation: undefined,
  tabixAnnotation: undefined,
}

export const useAnnotationStore = defineStore('annotation', {
  state: () => {
    return {
      annotationForm: { ...initAnnotationForm }
    }
  },

  actions: {
    resetForm() {
      this.annotationForm = { ...initAnnotationForm }
    }
  },
})
