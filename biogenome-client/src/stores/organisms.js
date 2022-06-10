import {defineStore} from 'pinia'
import {reactive} from 'vue'
import DataPortalService from '../services/DataPortalService'
export const organisms = defineStore('organisms', {
    state: () => ({
        organisms:reactive([]),
        query:reactive({
            taxid:null,
            offset:0,
            limit:20,
            filter:'',
        }),
        total:0
    }),
    actions:{
        loadOrganisms(){
            DataPortalService.getOrganisms(this.query)
            .then(response => {
                this.organisms = response.data.data
                this.total = response.data.total
            })

        },
    }
})

