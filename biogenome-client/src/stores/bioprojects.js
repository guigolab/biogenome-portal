import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'

export const bioprojects = defineStore('bioprojects', {
    state: () => ({
        tree:reactive([]),
    }),
    actions: {
    }
  })