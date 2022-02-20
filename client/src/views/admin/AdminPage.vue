<template>
 <b-row>
        <b-button-toolbar>
            <b-button-group class="mx-1">
                <b-button :disabled="show.excelForm" :pressed="show.sampleForm" @click="show.sampleForm = !show.sampleForm">Create sample</b-button>
                <b-button :disabled="show.excelForm" @click="updateSample()">Edit sample</b-button>
                <b-button @click="deleteSamples()">Delete samples</b-button>
            </b-button-group>
            <b-dropdown class="mx-1" right text="menu">
                <b-dropdown-item :disabled="show.sampleForm" :active="show.excelForm" @click="show.excelForm = !show.excelForm">Insert/Update from excel</b-dropdown-item>
                <b-dropdown-item href="https://github.com/ERGA-consortium/COPO-manifest/raw/main/ERGA_SAMPLE_MANIFEST_V1.xlsx">Download ERGA sample manifest</b-dropdown-item>
                <b-dropdown-item @click="downloadExcel()">Download samples to submit to COPO</b-dropdown-item>
                <b-dropdown-item>Edit species Status</b-dropdown-item>
                <b-dropdown-item>Edit species Names</b-dropdown-item>
            </b-dropdown>
        </b-button-toolbar>
        <b-col>
            <sample-form-component v-if="show.sampleForm"/>
            <parser-component v-if="show.excelForm" />
        </b-col>
</b-row>
</template>

<script>
import {BButtonToolbar,BButtonGroup,BButton, BDropdown, BDropdownItem} from 'bootstrap-vue'
import {mapFields} from '../../utils/helper'
import axios from 'axios'
import SampleFormComponent from '../../components/sample/SampleFormComponent.vue'
import ParserComponent from '../../components/ParserComponent.vue'
// import TableComponent from '../components/TableComponent.vue'
import submissionService from '../../services/SubmissionService'

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
        SampleFormComponent,ParserComponent,
        BDropdown, BDropdownItem,
        // TableComponent
    },
    mounted(){
        if(!localStorage.getItem('token')){
            this.$store.dispatch('submission/showLoginModal')
        }
    },
    methods: {
        createSample(){
            const data = new FormData
            data.append('test', this.test)
            axios.post(process.env.BASE_URL + "api"+"/organisms", data, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                }
            })
            // submissionService.createSample(data, this.token)
            .then(response => {
                console.log(response)
            })
            .catch(error => {
                if(error.response && error.response.status === 401){
                    this.user = ''
                    this.token = null
                }
            })
        },
        downloadExcel(){
            submissionService.downloadExcel()
            .then(response => {
                console.log(response)
                const url = window.URL.createObjectURL(new Blob([response.data], { type: { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }}));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'ERGA manifest.xlsx');
                link.click();
            })
            .catch(e =>{
                console.log(e)
            })
            
        },
        deleteSample(){

        },
        uploadExcel(){


        },
        deleteSamples(){


        }
    }
}
</script>