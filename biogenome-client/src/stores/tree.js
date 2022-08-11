import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'

export const tree = defineStore('tree', {
    state: () => ({
        taxonomyTree:reactive([]),
        bioprojectsTree:reactive([])
    }),
    actions: {
    }
  })