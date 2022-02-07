<template>
    <b-overlay opacity="1" :show="loading">
    <b-form @submit="sendForm">
        <b-card class="card-container" bg-variant="light">
            <div v-if="result">
                <b-alert v-for="error in result.RECEIPT.MESSAGES[0].ERROR" :key="error" dismissible :show="danger" variant="danger">
                    <p>{{error}}</p>
                </b-alert> 
                <b-alert dismissible :show="success" variant="success" v-for="sample in result.RECEIPT.SAMPLE" :key="sample.$.alias">
                    <p v-if="sample.EXT_ID">Primary Accession: {{sample.EXT_ID[0].$.accession}}</p>
                    <p v-if="sample.$.accession">Secondary Accession: {{sample.$.accession}}</p>
                    <p>Submission Alias: {{sample.$.alias}}</p>
                    <p>Status: {{sample.$.status}}</p>
                </b-alert> 
                <b-alert v-for="info in result.RECEIPT.MESSAGES[0].INFO" :key="info" dismissible :show="warning" variant="warning">
                    <p>{{info}}</p>
                </b-alert>
            </div>
            <b-form-group
            label-cols-lg="3"
            label="Submission Options"
            label-size="lg"
            label-class="font-weight-bold pt-0"
            class="mb-0"
            >
                <b-form-group v-if="!Boolean(xml)" label-cols-sm="3"
                    label-align-sm="right" label-for="sample-file" label="XML File"
                    description="Actions">
                    <b-form-file 
                        id="sample-file" 
                        accept=".xml"
                        :state="validSample"
                        v-model="form.sampleFile"
                    >
                    </b-form-file>
                </b-form-group>
                <b-form-group v-else 
                    label-cols-sm="3"
                    label-align-sm="right" label-for="sample-file" label="XML File"
                    description="Actions">
                    <b-input-group>
                        <b-form-input
                        id="sample-file" 
                        v-model="xml.name"
                        :state="true"
                        :disabled="true">
                    </b-form-input>
                    <b-input-group-append>
                        <b-button @click="downloadXML()">Download XML</b-button>
                    </b-input-group-append>
                    </b-input-group>
                </b-form-group>
                <b-form-group label-cols-sm="3"
                    label-align-sm="right" label-for="submission-type" label="Action"
                    description="Submission actions">   
                    <b-form-select
                        v-model="form.selectedType"
                        :options="typeOptions"
                        id="submission-type"
                        class="mb-3"
                        value-field="item"
                        text-field="name"
                    >
                    </b-form-select>
                </b-form-group>
                <b-form-group label-cols-sm="3"
                    label-align-sm="right" label-for="service-type" label="Service Type"
                    description="Choose which server">                          
                    <b-form-select
                        v-model="form.serviceType"
                        :options="serviceOptions"
                        id="service-type"
                        class="mb-3"
                        value-field="item"
                        text-field="name"
                    >
                    </b-form-select>
                </b-form-group>
            </b-form-group>
                <b-form-group
                    label-cols-lg="3"
                    label="User Credentials"
                    label-size="lg"
                    label-class="font-weight-bold pt-0"
                    class="mb-0"
                    >
                    <b-form-group label-cols-sm="3"
                        label-align-sm="right" label-for="username-input" label="Username"
                        description="Webin user name">    
                    <b-form-input id="username-input" v-model="form.user"></b-form-input>
                    </b-form-group>
                    <b-form-group label-cols-sm="3"
                        label-align-sm="right" label-for="password-input" label="Password"
                        description="Webin password">  
                        <b-form-input type="password" v-model="form.password"></b-form-input>
                    </b-form-group>
            </b-form-group>
            <template #footer>
                 <b-button-toolbar justify>
                    <b-button-group class="mx-1">
                    <b-button type="reset" variant="danger">Reset</b-button>
                    </b-button-group>
                    <b-button-group class="mx-1"> 
                        <b-button type="submit" variant="primary" style="float: inline-end">Submit</b-button>
                    </b-button-group>
                </b-button-toolbar>
            </template>
        </b-card>
    </b-form>
</template>
<script>
import {BButton,BFormGroup,BButtonToolbar,BButtonGroup,BInputGroupAppend,BFormInput,BFormSelect,BInputGroup, BForm, BAlert, BCard, BFormFile} from 'bootstrap-vue'
import submissionService from "../services/SubmissionService"
// import {xmlParser} from '../helper'

export default {
  components: { BButton,BFormGroup,BButtonToolbar,BButtonGroup,BInputGroupAppend,BFormInput,BFormSelect,BInputGroup, BForm, BAlert, BCard, BFormFile },
    name: "ena-form-component",
    data () {
        return {
            submissionPath: '/ena/submit/drop-box/submit',
            typeOptions: [
                { item: 'ADD', name: 'Create Sample' },
                // { item: 'UPDATE', name: 'Update Sample' },
            ],
            serviceOptions: [
                {item: 'https://wwwdev.ebi.ac.uk', name: 'Test Service'},
                {item: 'https://www.ebi.ac.uk', name: 'Production Service'}
            ],
            form:{
                sampleFile: null,
                submissionFile: null,
                selectedType: 'ADD',
                serviceType: 'https://wwwdev.ebi.ac.uk',
                user: '',
                password: ''
            },
            result: null,
            success: false,
            warning: false,
            danger: false
        }
    },
    mounted(){
        submissionService.getSubmissionFile(this.form.selectedType).then(response => {
            const blob = new Blob([response.data], { type: 'application/octet-stream'})
            this.form.submissionFile = new File([blob],"submission.xml",{type:"xml"})
        }).catch(e => {
            console.log(e);
        })
        //ERC000024 EXAMPLE GSC MIxS water
        //ERC000053 DTOL
    },
    computed: {
        validSample(){
            return this.form.sampleFile
        },
        xml(){
            return this.$store.getters['submission/getSampleXML']
        },
        url(){
            return this.form.serviceType + this.submissionPath
        }
    },
    methods: {
        downloadXML(){
            var xmlFile = "sample.xml"
            const url = window.URL.createObjectURL(new Blob([this.xml], { type: 'application/octet-stream'}));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', xmlFile);
            link.click();
        },
    //    sendForm(event){
    //     event.preventDefault()
    //         var formData = new FormData()
    //         if(this.xml){
    //             formData.append('SAMPLE',this.xml)
    //         }else {
    //             formData.append('SAMPLE',this.form.sampleFile)
    //         }
    //         formData.append('SUBMISSION', this.form.submissionFile)
    //         submissionService.submitSamples(this.url,formData, {user: this.form.user, password: this.form.password})
    //         .then(response => {
    //             return xmlParser(response.data)
    //         })
    //         .then(result => {
    //             this.result = result
    //             if(this.result && this.result.RECEIPT.$.success){
    //                 this.success = true
    //             }
    //             if(this.result && this.result.RECEIPT.MESSAGES.length > 0 && this.result.RECEIPT.MESSAGES[0].INFO){
    //                 this.warning = true
    //             }
    //             if(this.result && this.result.RECEIPT.MESSAGES.length > 0 && this.result.RECEIPT.MESSAGES[0].ERROR){
    //                 this.danger = true
    //             }
    //         })
    //         .catch(e => {
    //             console.log(e);
    //         })
    //    }
    }
}
</script>
<style>

</style>