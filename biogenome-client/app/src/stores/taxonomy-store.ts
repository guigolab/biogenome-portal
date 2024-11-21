import { defineStore } from 'pinia'
import { DataModels, TaxonNode } from '../data/types'
import TaxonService from '../services/TaxonService'
import { useToast } from 'primevue/usetoast';

export const useTaxonomyStore = defineStore('taxonomy', {
  state: () => {
    return {
      ancestors: [] as TaxonNode[],
      children: [] as TaxonNode[],
      stats: [] as [DataModels, number][],
      taxid: null as string | null,
      isTreeLoading: false,
      isAncestorsLoading: false,
      isChildrenLoading: false,
      isOutOfBoundaries: false,
      isStatsLoading: false,
      treeData: null as Record<string, any> | null,
      toast: useToast()
    }
  },

  actions: {

    isNew(taxid:string){
      return !this.taxid || this.taxid !== taxid
    },

    async getAncestors(taxid: string) {
      if(!this.isNew(taxid) && this.ancestors.length) return
      this.taxid = taxid
      this.isAncestorsLoading = true
      try {
        const { data } = await TaxonService.getAncestors(taxid)
        this.ancestors = [...data]
      } catch (error) {
        this.toast.add({ severity: 'error', summary: 'Error retrieving Ancestors', detail: 'An error occurred while fetching the ancestors', life: 3000 })
        console.log(error)
      } finally {
        this.isAncestorsLoading = false
      }
    },
    async getChildren(taxid: string) {
      if(!this.isNew(taxid) && this.children.length) return
      this.taxid = taxid
      this.isChildrenLoading = true
      try {
        const { data } = await TaxonService.getTaxonChildren(taxid)
        this.children = [...data]
      } catch (error) {
        this.toast.add({ severity: 'error', summary: 'Error retrieving Children', detail: 'An error occurred while fetching the children', life: 3000 })
        console.log(error)
      } finally {
        this.isChildrenLoading = false
      }
    },

    async getStats(taxid: string) {
      if(!this.isNew(taxid) && this.children.length) return
      this.taxid = taxid
      this.isStatsLoading = true
      try {
        const { data } = await TaxonService.getTaxonStats(taxid)
        this.stats = [...Object.entries(data) as [DataModels, number][]]
      } catch (error) {
        this.toast.add({ severity: 'error', summary: 'Error retrieving Stats', detail: 'An error occurred while fetching the stats', life: 3000 })
        console.log(error)
      } finally {
        this.isStatsLoading = false
      }
    },

    async getTree() {
      this.isTreeLoading = true
      try {
        const { data } = await TaxonService.getComputedTree()
        this.treeData = { ...data }
      } catch (error) {
        this.toast.add({ severity: 'error', summary: 'Error retrieving tree', detail: 'An error occurred while fetching the taxonomic tree, try to refresh the page, or see the console for the error details', life: 3000 })
        console.log(error)
      } finally {
        this.isTreeLoading = false
      }
    }
  },
})
