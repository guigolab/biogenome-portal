import { defineStore } from 'pinia'

const initSearchForm = {
  filter: '',
  sort_column: '',
  sort_order: '',
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useBioProjectStore = defineStore('bioproject', {
  state: () => {
    return {
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
