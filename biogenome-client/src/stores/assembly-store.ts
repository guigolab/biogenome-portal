import { defineStore } from 'pinia'
import { Contributor, BreadCrumb } from '../data/types'
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
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useAssemblyStore = defineStore('assembly', {
  state: () => {
    return {
      submitters: [] as Contributor[],
      breadcrumbs: [] as BreadCrumb[],
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
