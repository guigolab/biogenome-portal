import { defineStore } from 'pinia'
import { SearchForm, TreeNode } from '../data/types'

const initSearchForm:SearchForm = {
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
      searchForm: { ...initSearchForm },
      pagination: { ...initPagination },
      ancestors: [],
      currentTaxon: null as TreeNode | null,
      taxidQuery:null as string | null,
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
