import {defineStore} from 'pinia'
import {reactive,ref} from 'vue'
import DataPortalService from '../services/DataPortalService'
const ROOTNODE = import.meta.env.VITE_ROOT_NODE
const PROJECT_ACCESSION = import.meta.env.VITE_PROJECT_ACCESSION
export const organisms = defineStore('organisms', {
    state: () => ({
        organisms:reactive([]),
        selectedNode:reactive({
            name:'',
            metadata:{},
            children:[]
        }),
        isLoading:false,
        stats:reactive({
            biosamples:0,
            local_samples:0,
            assemblies:0,
            experiments:0,
            annotations:0,
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
            this.isLoading=true
            DataPortalService.getOrganisms(this.query)
            .then(response => {
                this.organisms = [...response.data.data]
                this.stats = {...response.data.stats}
                if(response.data.total !== this.total){
                    this.query.offset = 0
                    this.total = response.data.total
                }
                this.isLoading = false
            }).catch(e => {
                this.isLoading = false
            })
        },
        getTaxonNode(){
            DataPortalService.getTaxonChildren(this.query.parent_taxid)
            .then(resp => {
                this.selectedNode.name = resp.data.name
                this.selectedNode.metadata = {taxid:resp.data.taxid, rank: resp.data.rank}
                if(resp.data.leaves){
                    this.selectedNode.metadata.leaves = resp.data.leaves
                }
                this.selectedNode.children = resp.data.children
            })
        },
        getProjectNode(){
            const accession = this.query.bioproject? this.query.bioproject : PROJECT_ACCESSION
            DataPortalService.getBioProjectChildren(accession)
            .then(resp => {
                this.selectedNode.name = resp.data.title
                this.selectedNode.metadata = {accession:resp.data.accession}
                this.selectedNode.children = resp.data.children

            })
        },
        resetQuery(){
            this.query = reactive({
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
            })
        }
    }
})

