import { defineStore } from 'pinia'
import { TreeNode } from '../data/types'

const initSearchForm = {
  filter: '',
  sort_column: '',
  sort_order: '',
  rank:''
}

const initPagination = {
  offset: 0,
  limit: 10,
}

export const useTaxonomyStore = defineStore('taxonomy', {
  state: () => {
    return {
      breadcrumbs: [] as TreeNode[],
      searchForm: { ...initSearchForm },
      pagination: { ...initPagination },
      ranks: []
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
