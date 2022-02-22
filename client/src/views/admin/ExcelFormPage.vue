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
            <b-button style="margin-bottom:15px"  variant="outline-primary" block @click="showOptions = !showOptions">
                Advanced Options
            </b-button>
            <b-collapse style="margin-bottom:10px" v-model="showOptions">
                <b-form-group
                    label-for="import-options"
                    label-align-sm="right"
                    label-cols-sm="3"
                    label="Import Options"
                >
                    <b-form-select
                    v-model="selectedOption"
                    :options="importOptions"
                    id="import-options"
                    />

                </b-form-group>
                <b-form-group
                    label-for="header-index"
                    label-align-sm="right"
                    label-cols-sm="3"
                    label="Header row"
                >
                    <b-form-input
                    v-model="headerIndex"
                    id="header-index"
                    type="number"
                    />

                </b-form-group>
            </b-collapse>
            <template #footer>
                <div>
                    <b-button @click="resetInput()" variant="danger">Reset</b-button>
                    <b-button v-if="!isValid" :disabled="!Boolean(excelFile)" @click="sendExcel()" variant="primary" style="float: right">Validate Excel</b-button>
                    <b-button v-else @click="onSubmit()" variant="primary" style="float: right">Submit to ENA</b-button>
                </div>
            </template>
        </b-card>
    </b-col>
</b-row>
</template>
<script>
import {BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BCollapse} from 'bootstrap-vue'
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
                {value: 'UPDATE', text:'Update already existing samples'},
            ],
            selectedOption:'SKIP',
            headerIndex:'1',

            
        }
    },
    components:{
        BCard,BButton,BFormGroup,BFormFile,BTabs,BTab,BCardText,BCollapse
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