<template>
 <b-row>
     <b-col>
        <b-button-toolbar>
            <b-button-group class="mx-1">
                <b-button :to="{name: 'sample-form'}">Create sample</b-button>
                <b-button :to="{name: 'excel-import'}">Import samples</b-button>
            </b-button-group>
              <b-button-group class="mx-1">
                <b-button :to="{name: 'excel-import'}">Import samples</b-button>
            </b-button-group>
            <b-dropdown id="dropdown-form" right text="Insert a BioSample Accession" ref="dropdown" class="mx-1">
                <b-dropdown-form>
                    <b-form-group label="BioSamples accession" label-for="biosample-accession" @submit.stop.prevent>
                    <b-form-input
                        id="biosample-accession"
                        size="sm"
                        v-model="accession"
                    ></b-form-input>
                    </b-form-group>
                    <b-button :disabled="!accession" variant="primary" size="sm" @click="insertSample()">Insert sample</b-button>
                </b-dropdown-form>
            </b-dropdown>
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
        <b-col lg="4">
            <tree-browser-component/>
        </b-col>
        <b-col lg="8">
            <organisms-component/>
        </b-col>
        <router-view/>
    </b-row>
    <sample-to-submit-modal :sample="metadata"/>
</b-row>
</template>

<script>
import {BButtonToolbar,BButtonGroup,BButton, BDropdown,BDropdownForm,BFormGroup,BFormInput, BDropdownItem} from 'bootstrap-vue'
import {mapFields, showConfirmationModal} from '../../utils/helper'
import submissionService from '../../services/SubmissionService'
import OrganismsComponent from '../../components/organism/OrganismsComponent.vue';
import TreeBrowserComponent from '../../components/taxon/TreeBrowserComponent.vue';
import enaService from '../../services/ENAClientService'
import SampleToSubmitModal from '../../components/modal/SampleToSubmitModal.vue';

export default {
    data(){
        return {
            test:'test',
            show:{
                excelForm:false,
                sampleForm: false,
            },
            accession:'',
            metadata:{},

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
        BButtonToolbar,BButtonGroup,BButton,BDropdownForm,BFormGroup,BFormInput,
        BDropdown, BDropdownItem,OrganismsComponent,TreeBrowserComponent,
        SampleToSubmitModal,
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
        insertSample(){
            enaService.getBioSample(this.accession)
            .then(response => {
                const data = response.data
                if(data && data._embedded && data._embedded.samples){
                    this.metadata = data._embedded.samples[0]
                    this.metadata.taxid = this.metadata.taxId
                    // this.metadata.accession = data._embedded.samples[0].accession
                    // this.metadata.name =  data._embedded.samples[0].name
                    // Object.keys(characteristics).forEach(key=>{
                    //     this.metadata[key] = characteristics[key][0].text
                    // })
                    this.$nextTick(() => {
                        this.$bvModal.show('sample-to-submit')
                    })
                }else {
                    this.$store.commit('submission/setAlert',{variant:'warning', message: this.accession+ ' not found in EBI/BioSamples'})
                    this.$store.dispatch('submission/showAlert') 
                }
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