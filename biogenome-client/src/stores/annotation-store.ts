import { defineStore } from 'pinia'

const initAnnotationForm:Record<string,any> = {
  name: '',
  assembly_accession: '',
  assembly_name: '',
  taxid: '',
  gff_gz_location: '',
  tab_index_location: '',
  gzipAnnotation: undefined,
  tabixAnnotation: undefined,
}

const initSearchForm = {
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useAnnotationStore = defineStore('annotation', {
  state: () => {
    return {
      annotationForm: { ...initAnnotationForm },
      searchForm: { ...initSearchForm },
      pagination: { ...initPagination },
    }
  },

  actions: {
    resetSeachForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
  },
})
