import {defineStore} from 'pinia'
import {reactive,ref} from 'vue'
import DataPortalService from '../services/DataPortalService'
export const organisms = defineStore('organisms', {
    state: () => ({
        organisms:reactive([]),
        stats:reactive({
            biosamples:ref(0),
            local_samples:ref(0),
            assemblies:ref(0),
            experiments:ref(0),
            annotations:ref(0),
        }),
        query:reactive({
            parent_taxid:null,
            offset:0,
            limit:20,
            filter:null,
            filter_option:null,//scientificName by default
            bioproject:null,
            coordinates:null,
            geo_location:null,
            biosamples:null,
            local_samples:null,
            assemblies:null,
            experiments:null,
            annotations:null,
            sort_order:null,
            sort_column:null
        }),
        total:ref(0)
    }),
    actions:{
        loadOrganisms(){
            DataPortalService.getOrganisms(this.query)
            .then(response => {
                this.organisms = response.data.data
                this.stats = {...response.data.stats}
                this.total = response.data.total
            })

        },
    }
})
