import { defineStore } from 'pinia'
import { SearchForm, TreeNode } from '../data/types'
import TaxonService from '../services/clients/TaxonService'
import { AxiosError } from 'axios'
import { useToast } from 'vuestic-ui'

const initSearchForm: SearchForm = {
  filter: '',
  sort_column: '',
  sort_order: '',
  rank: ''
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
      currentTaxon: null as TreeNode | null,
      taxidQuery: null as string | null,
      taxons: [] as TreeNode[],
      isTreeLoading: false,
      isContentLoading: false,
      showTree: false,
      treeData: null as Record<string, any> | null,
      init: useToast().init
    }
  },

  actions: {
    resetSearchForm() {
      this.searchForm = { ...initSearchForm }
    },
    resetPagination() {
      this.pagination = { ...initPagination }
    },
    async getTree() {
      this.isTreeLoading = true
      try {
        const { data } = await TaxonService.getComputedTree()
        this.treeData = { ...data }
      } catch (error) {
        console.log(error)
      } finally {
        this.isTreeLoading = false
      }
    },
    async handleSearch(v: string) {
      if (v.length < 2) return
      this.isContentLoading = true
      try {
        const { data } = await TaxonService.getTaxons({ filter: v })
        if (data.data) this.taxons = [...data.data]
      } catch (error) {
        console.log(error)
        const axiosError = error as AxiosError
        this.init({ message: axiosError.message, color: 'danger' })
      } finally {
        this.isContentLoading = false
      }
    }
  },
})
