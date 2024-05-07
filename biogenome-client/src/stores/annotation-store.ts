import { defineStore } from 'pinia'
import { models } from '../../config.json'
import { Filter } from '../data/types'


const parsedFilters = models.annotations ? models.annotations.filters as Filter[] : []

const formEntries = parsedFilters.map(f => {
  if (f.type === "date") {
    return [[`${f.key}__gte`, ""], [`${f.key}__lte`, ""]]
  }
  return [[f.key, f.type === 'checkbox' ? false : ""]]
}).flat()

const initSearchForm = {
  filter: "",
  sort_order: "",
  sort_column: "",
  ...Object.fromEntries(formEntries)
}

const initPagination = {
  offset: 0,
  limit: 10,
}

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
      annotationForm: { ...initAnnotationForm },
      searchForm: { ...initSearchForm },
      pagination: { ...initPagination },
    }
  },

  actions: {
    resetSearchForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
    resetForm() {
      this.annotationForm = { ...initAnnotationForm }
    }
  },
})
