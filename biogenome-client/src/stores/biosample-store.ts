import { defineStore } from 'pinia'
import { BioSampleSearchForm } from '../data/types'

const initSearchForm: BioSampleSearchForm = {
  start_date: '',
  end_date: '',
  filter: '',
  sort_column: '',
  sort_order: '',
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useBioSampleStore = defineStore('biosample', {
  state: () => {
    return {
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
  },
})
