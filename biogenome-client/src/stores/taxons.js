import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'

export const taxons = defineStore('taxons', {
    state: () => ({
        tree:reactive([]),
        taxonNav:reactive([])
    }),
    actions: {
        initializeTaxNav(){
            this.taxonNav.push({name:this.tree.name, taxid:this.tree.taxid, rank:this.tree.rank})
        },
        resetNav(){
            this.taxonNav = []
        }

    }
  })