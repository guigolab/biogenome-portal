<template>
<div>
    <b-card class="card-container" v-if="errors.length > 0" no-body
        border-variant="danger"
        header="Errors"
        header-border-variant="danger"
        header-text-variant="danger"
        text-variant="danger"
        title-tag="h3"
        >
        <b-tabs style="min-height:50vh" v-model="tabIndex" small pills card vertical>
            <b-tab :title-link-class="linkClass(index)" v-for="(sample, index) in errors" :key="sample" :title="'Row '+sample.index" >
                <b-card-text v-for="er in sample.errors" :key="er">
                        <strong>{{er.label}}: </strong> {{er.message}}
                </b-card-text>
            </b-tab>
        </b-tabs>
    </b-card>
    <b-card class="card-container" bg-variant="light">
        <b-alert dismissible variant="success" :show="isValid">The excel is valid!</b-alert>
        <b-form-group
        label-cols-lg="3"
        label="Upload an Excel File"
        label-size="lg"
        label-class="font-weight-bold pt-0"
        class="mb-0"
        >
            <b-form-group label-cols-sm="3"
                label-align-sm="right" 
                label-for="excel-file" label="File Input" 
            >
                <b-form-file
                    v-model="excelFile"
                    :state="Boolean(excelFile)"
                    placeholder="Choose a file or drop it here..."
                    drop-placeholder="Drop file here..."
                    id="excel-file"
                    accept=".xlsx"
                    :disabled="isValid"
                    >
                </b-form-file>
            </b-form-group>
            </b-form-group>
        <template #footer>
            <div>
                <b-button @click="resetInput()" variant="danger">Reset</b-button>
                <b-button v-if="!isValid" :disabled="!Boolean(excelFile)" @click="sendExcel()" variant="primary" style="float: right">Validate Excel</b-button>
                <b-button v-else @click="onSubmit()" variant="primary" style="float: right">Submit to ENA</b-button>
            </div>
        </template>
    </b-card>
</div>
</template>
<script>
import {BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BAlert} from 'bootstrap-vue'
import submissionService from '../services/SubmissionService'
export default {
    data(){
        return {
            excelFile:null,
            samples:[],
            errors:[],
            tabIndex: 0,
            isValid:false,
            loading:false,
        }
    },
    components:{
        BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BAlert
    },
    mounted(){
    },
    methods: {
        linkClass(idx) {
            if (this.tabIndex === idx) {
                return ['bg-danger', 'text-light']
            } else {
                return ['bg-light', 'text-danger']
            }
        },
        sendExcel(){
            this.loading=true
            var formData = new FormData()
            formData.append('excelFile', this.excelFile)
            submissionService.parseExcel(formData).then(response => {
                if(response.data.length > 0){
                    this.errors = response.data.filter(sample => sample.errors)
                    if (this.errors.length > 0){
                        this.loading=false
                        return
                    } else{
                        this.isValid=true
                        this.samples = response.data
                        console.log(this.samples)
                    }
                }
                this.loading=false
                
            })

        },
        onSubmit() {
            submissionService.sendForm(this.samples).then(response => {
                const blob = new Blob([response.data], { type: 'application/octet-stream'})
                const file = new File([blob],"samples.xml",{type:"xml"})
                this.$emit('xml-generated', file)
            }).catch(e => {
                console.log(e);
            })
            // if (!this.form.scientificName){
            //     this.taxonNotFound = true
            //     return
            // }else{
            //     this.taxonNotFound = false
            // }
            // Object.keys(this.form.fields).forEach((key) => (this.form.fields[key].value == null) && delete this.form.fields[key])
            // submissionService.sendForm(this.form).then(response => {
            //     const blob = new Blob([response.data], { type: 'application/octet-stream'})
            //     const file = new File([blob],"samples.xml",{type:"xml"})
            //     // var xmlFile = "sample.xml"
            //     console.log(file)
            //     // const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/octet-stream'}));
            //     this.$emit('xml-generated', file)
            //     // const link = document.createElement('a');
            //     // link.href = url;
            //     // link.setAttribute('download', xmlFile);
            //     // link.click();
            // }).catch(e => {
            //     console.log(e);
            // })
        },
        resetInput(){
            this.excelFile = null
            this.errors = []
        }
    }
}
</script>
<style>
.card-container{
    margin-top: 10px;
    margin-bottom: 10px;
    min-height: 50vh;
}
</style>