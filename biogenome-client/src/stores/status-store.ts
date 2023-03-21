import { defineStore } from 'pinia'

const initSearchForm = {
  goat_status: '',
  target_list_status: '',
  filter: '',
  filter_option: '',
}

const initPagination = {
  offset: 0,
  limit: 15,
}

export const useStatusStore = defineStore('status', {
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
