import { defineStore } from 'pinia'
import { BreadCrumb, Contributor } from '../data/types'
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
