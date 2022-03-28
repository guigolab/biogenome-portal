<template>
<b-row>
    <b-col>
        <b-card v-if="Object.keys(errors).length" text-variant="danger">
            <b-tabs v-model="tabIndex" small pills card vertical>
                <b-tab :title-link-class="linkClass(index)" v-for="(key,index) in Object.keys(errors)" :key="key" :title="'Row '+key" >
                    <b-card-text v-for="er in errors[key]" :key="er">
                        <strong>{{er.label}}: </strong> {{er.message}}
                    </b-card-text>
                </b-tab>
            </b-tabs>
        </b-card>
        <b-card class="card-container" bg-variant="light">
            <b-form-group
                label-cols-lg="3"
                label="Advanced Options"
                label-size="lg"
                label-class="font-weight-bold pt-0"
                class="mb-0"
                >
                <b-form-group label="Existing samples" label-cols-sm="3" label-for="import-options">
                    <b-form-select
                        v-model="selectedOption"
                        :options="importOptions"
                        id="import-options"
                    />
                </b-form-group>
                <b-form-group label="Header row" label-cols-sm="3" label-for="header-row">
                <b-form-input
                    id="header-row"
                    type="number"
                    v-model="headerIndex"
                ></b-form-input>
                </b-form-group>          
            </b-form-group>
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
                    <b-button v-if="!isValid" :disabled="!Boolean(excelFile)" @click="sendExcel()" variant="primary" style="float: right">Submit Excel</b-button>
                </div>
            </template>
        </b-card>
    </b-col>
</b-row>
</template>
<script>
import {BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BFormInput,BFormSelect} from 'bootstrap-vue'
import submissionService from '../../services/SubmissionService'
export default {
    data(){
        return {
            excelFile:null,
            samples:[],
            errors:[],
            tabIndex: 0,
            isValid:false,
            loading:false,
            showOptions:false,
            importOptions: [
                {value: 'SKIP', text:'Skip already existing samples'},
                {value: 'UPDATE', text: 'Update all fields'},
            ],
            selectedOption:'SKIP',
            headerIndex:1,
        }
    },
    components:{
        BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BFormInput,BFormSelect
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
            formData.append('headerIndex', this.headerIndex)
            formData.append('importOption', this.selectedOption)
            this.$store.dispatch('portal/showLoading')
            submissionService.parseExcel(formData)
            .then(response => {
                this.errors=[]
                const resp = response.data
                console.log(resp)
                if(resp){
                    const updated = resp.updated ? 'Updated ids: '+ resp.updated.join()+'; ': null
                    const saved = resp.saved? 'Saved ids: '+resp.saved.join()+'; ': null
                    const message = saved && updated ? saved + updated : saved ? saved : updated ? updated : null
                    if(message){
                        this.$store.commit('submission/setAlert',{variant:'success', message: message})
                    }else {
                        this.$store.commit('submission/setAlert',{variant:'warning', message: 'no samples have been saved'})
                    }
                    this.$store.dispatch('submission/showAlert') 
                    this.$store.dispatch('portal/hideLoading')
                }
            })
            .catch(e => {
                if(e.response.status === 400){
                    this.$store.commit('submission/setAlert',{variant:'danger', message: 'validation errors'})
                    this.errors = e.response.data.message
                }
                else if(e.response.status === 304){
                    this.$store.commit('submission/setAlert',{variant:'info', message: 'No samples created'})
                }
                else{
                    this.$store.commit('submission/setAlert',{variant:'danger', message: e})
                }
                this.$store.dispatch('submission/showAlert') 
                this.$store.dispatch('portal/hideLoading')
            })
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