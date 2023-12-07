import { defineStore } from 'pinia'
import { AssemblySearchForm } from '../data/types'

const initSearchForm: AssemblySearchForm = {
  start_date: '',
  end_date: '',
  filter: '',
  filter_option: '',
  sort_column: '',
  sort_order: '',
  assembly_level: '',
  submitter: '',
  blobtoolkit:false
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useAssemblyStore = defineStore('assembly', {
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
