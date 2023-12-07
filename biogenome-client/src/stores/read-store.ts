import { defineStore } from 'pinia'
import { ReadSearchForm } from '../data/types'

const initSearchForm: ReadSearchForm = {
  start_date: '',
  end_date: '',
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',
  center: '',
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useReadStore = defineStore('read', {
  state: () => {
    return {
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
