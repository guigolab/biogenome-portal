<template>
<b-row>
    <b-col>
        <b-card v-if="errors && errors.length > 0" text-variant="danger">
            <b-tabs  v-model="tabIndex" small pills card vertical>
                <b-tab :title-link-class="linkClass(index)" v-for="(sample,index) in errors" :key="sample" :title="'Row '+sample.index" >
                    <b-card-text v-for="er in sample.errors" :key="er">
                            <strong>{{er.label}}: </strong> {{er.message}}
                    </b-card-text>
                </b-tab>
            </b-tabs>
        </b-card>
        <b-dropdown id="dropdown-form" text="Advanced Options" ref="dropdown" class="m-2">
            <b-dropdown-form>
                <b-form-group label="Existing samples" label-for="import-options">
                    <b-form-select
                        v-model="selectedOption"
                        :options="importOptions"
                        id="import-options"
                        size="sm"
                    />
                </b-form-group>
                <b-form-group label="Header row" label-for="header-row">
                <b-form-input
                    id="header-row"
                    type="number"
                    size="sm"
                    v-model="headerIndex"
                ></b-form-input>
                </b-form-group>
                <div id="accession-infos" style="width: fit-content">
                    <b-form-checkbox
                        switch
                        id="accessions-import"
                        v-model="importAccessions"
                        name="checkbox-1"
                        >
                        Import accessions
                    </b-form-checkbox>
                </div>
                  <b-tooltip target="accession-infos" triggers="hover">
                    This expects an accession column in the excel file containing the accession of samples already public
                </b-tooltip>               
            </b-dropdown-form>
        </b-dropdown>
        <b-card class="card-container" bg-variant="light">
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
import {BCard,BButton,BDropdown,BDropdownForm,BFormGroup,BFormFile,BTooltip,BTabs,BTab,BCardText,BFormInput,BFormCheckbox,BFormSelect} from 'bootstrap-vue'
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
                {value: 'UPDATE_ALL', text: 'Update all fields'},
                {value: 'UPDATE_NON_EMPTY',text: 'Update only non-empty fields'}
            ],
            selectedOption:'SKIP',
            headerIndex:1,
            importAccessions:false

            
        }
    },
    components:{
        BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BTooltip,BFormInput,BFormSelect,BFormCheckbox,BDropdown,BDropdownForm
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
            formData.append('importAccessions', this.importAccessions)
            this.$store.dispatch('portal/showLoading')
            submissionService.parseExcel(formData)
            .then(response => {
                this.errors=[]
                this.$store.commit('submission/setAlert',{variant:'success', message: 'samples IDs correctly saved: ' + response.data.join()})
                this.$store.dispatch('submission/showAlert') 
                this.$store.dispatch('portal/hideLoading')
            })
            .catch(e => {
                console.log(e.response)
                this.errors = e.response.data.message
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