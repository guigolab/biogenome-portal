<template>
 <b-row>
     <b-col>
        <b-button-toolbar>
            <b-button-group class="mx-1">
                <b-button :to="{name: 'sample-form'}">Create sample</b-button>
                <b-button :to="{name: 'excel-import'}">Import samples</b-button>
            </b-button-group>
            <b-dropdown class="mx-1" right text="Actions">
                <b-dropdown-item href="https://github.com/ERGA-consortium/COPO-manifest/raw/main/ERGA_SAMPLE_MANIFEST_V1.xlsx">Download ERGA sample manifest</b-dropdown-item>
                <b-dropdown-item @click="downloadExcel()">Download samples to submit to COPO</b-dropdown-item>
            </b-dropdown>
            <b-button-group class="mx-1">
                <b-button variant="danger" @click="dropData()">Drop Database</b-button>
            </b-button-group>
        </b-button-toolbar>
     </b-col>
    <b-row>
        <b-col>
            <organisms-component/>
        </b-col>
    </b-row>
</b-row>
</template>

<script>
import {BButtonToolbar,BButtonGroup,BButton, BDropdown, BDropdownItem} from 'bootstrap-vue'
import {mapFields, showConfirmationModal} from '../../utils/helper'
import submissionService from '../../services/SubmissionService'
import OrganismsComponent from '../../components/organism/OrganismsComponent.vue';


export default {
    data(){
        return {
            test:'test',
            show:{
                excelForm:false,
                sampleForm: false,
            }
        }
       },
    computed: {
        ...mapFields({
            fields: ['token','user'],
            module: 'submission',
            mutation: 'submission/setField' 
        })
    },
    components: {
        BButtonToolbar,BButtonGroup,BButton,
        BDropdown, BDropdownItem,
        OrganismsComponent
        // TableComponent
    },
    mounted(){
        if(!localStorage.getItem('token')){
            this.$store.dispatch('submission/showLoginModal')
        }
    },
    methods: {
        downloadExcel(){
            submissionService.downloadExcel()
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data], { type: { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }}));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'ERGA_manifest.xlsx');
                link.click();
            })
            .catch(e =>{
                console.log(e)
            })
        },
        dropData(){
            showConfirmationModal(this.$bvModal, 'This will permanently delete all data, are you sure')
            .then(value => {
                if(value){
                    return submissionService.deleteAll()
                } 
                return null
            })
            .then(response => {
                if (response){
                    this.$store.commit('submission/setAlert',{variant:'success', message: 'All data have been deleted'})
                    this.$store.dispatch('submission/showAlert') 
                    this.$router.go()
                }

            })
            .catch(e => {
                console.log(e)
            })
        }
    }
}
</script>