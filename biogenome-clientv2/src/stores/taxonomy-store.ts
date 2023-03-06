import { defineStore } from 'pinia'
import { TreeNode } from '../data/types'

export const useTaxonomyStore = defineStore('taxonomy', {
  state: () => {
    return {
      breadcrumbs: [] as TreeNode[],
    }
  },

  actions: {},
})
