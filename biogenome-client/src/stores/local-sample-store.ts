import { defineStore } from 'pinia'
import { models } from '../../config.json'
import { Filter } from '../data/types'

const parsedFilters = models.local_samples ? models.local_samples.filters as Filter[] : []

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
const initLocalSampleForm = {
  local_id: '',
  taxid: '',
  scientific_name: '',
  metadata: {} as Record<string, string>,
}

export const useLocalSampleStore = defineStore('local-sample', {
  state: () => {
    return {
      localSampleForm: { ...initLocalSampleForm },
      pagination: { ...initPagination },
      searchForm: { ...initSearchForm }
    }
  },
  actions: {
    resetSearchForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
  },
})
