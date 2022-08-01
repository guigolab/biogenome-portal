import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'

export const tree = defineStore('tree', {
    state: () => ({
        tree:reactive([]),
    }),
    actions: {
    }
  })