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

const initSearchForm = {
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',
  start_date:'',
  end_date:''
}

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
    resetForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
  },
})
