import { defineStore } from 'pinia'
import { OrganismSearchForm } from '../data/types'

const initSearchForm: OrganismSearchForm = {
  insdc_status: '',
  goat_status: '',
  parent_taxid: '',
  bioproject: '',
  target_list_status: '',
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',
}

const initPagination = {
  offset: 0,
  limit: 10,
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
