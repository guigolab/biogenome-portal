import {defineStore} from 'pinia'
import {reactive, ref} from 'vue'

export const tree = defineStore('tree', {
    state: () => ({
        tree:reactive([]),
        loadedSpecies: reactive([]),
        limit: 150
    }),
    actions:{
        addSpecies(organism){
            const existingSpecies = this.loadedSpecies.filter(spec => spec.taxid === organism.taxid)
            if(!existingSpecies){
                this.loadedSpecies.push(organism)
                localStorage.setItem('loadedSpecies',this.loadedSpecies)
            }
        },
        removeSpecies(organism){
            const index = this.loadedSpecies.findIndex(spec => spec.taxid === organism.taxid)
            this.loadedSpecies.splice(index,1)
            localStorage.setItem('loadedSpecies',this.loadedSpecies)
        },
        resetSpecies(){
            this.loadedSpecies = []
            localStorage.removeItem('loadedSpecies')
        }
    }
  })