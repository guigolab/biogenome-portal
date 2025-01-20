import { defineStore } from 'pinia'
import { DataModels, SearchForm, TaxonNode } from '../data/types'
import TaxonService from '../services/TaxonService'
import { AxiosError } from 'axios'
import { TreeNode, useToast } from 'vuestic-ui'

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
      currentTaxon: null as TaxonNode | null,
      rootNode: null as TaxonNode | null,
      taxidQuery: null as string | null,
      taxons: [] as TaxonNode[],
      children: [] as TaxonNode[],
      ancestors: [] as TaxonNode[],
      coordinates: 0,
      wikiSummary: "",
      stats: [] as [DataModels, number][],
      isTreeLoading: false,
      isContentLoading: false,
      isOutOfBoundaries: false,
      isWikiLoading: false,
      showTree: false,
      showSidebar: false,
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
    resetTaxon(){
      this.currentTaxon = null
      this.showSidebar = false
    },
    async getAncestors(taxid: string) {
      const { data } = await TaxonService.getAncestors(taxid)
      this.ancestors = [...data]
    },
    async getChildren(taxid: string) {
      const { data } = await TaxonService.getTaxonChildren(taxid)
      this.children = [...data]
    },
    async fetchTaxon(taxid: string) {
      try {
        const { data } = await TaxonService.getTaxon(taxid)
        this.currentTaxon = { ...data }
      } catch (e) {
        console.error(e)
      } finally {
        this.isWikiLoading = false
      }
    },
    async getStats(taxid: string) {
      const { data } = await TaxonService.getTaxonStats(taxid)
      this.stats = [...Object.entries(data) as [DataModels, number][]]
    },
    async getSummary(lang: string, name: string) {
      try {
        this.isWikiLoading = true
        const url = `${lang}.m.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
        const response = await fetch(url)

        // Check if the response is okay (status code 200-299)
        if (response.ok) {
          const data = await response.json()
          if (data.extract) {
            this.wikiSummary = data.extract
          } else {
            this.wikiSummary = ""
          }
        } else {
          this.wikiSummary = ""
        }

      } catch (e) {
        console.error(e)
      } finally {
        this.isWikiLoading = false
      }
    },
    async getTree() {
      this.isTreeLoading = true
      try {
        const { data } = await TaxonService.getComputedTree()
        this.treeData = { ...data }
        if (!this.rootNode) {
          const { name, rank, taxid } = this.treeData as TreeNode
          this.rootNode = { name, rank, taxid }
        }
      } catch (error) {
        console.log(error)
      } finally {
        this.isTreeLoading = false
      }
    }
  },
})
