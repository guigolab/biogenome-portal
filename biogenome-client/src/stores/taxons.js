import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'

export const taxons = defineStore('taxons', {
    state: () => ({
        tree:reactive([]),
        taxonNav:reactive([])
    })
  })