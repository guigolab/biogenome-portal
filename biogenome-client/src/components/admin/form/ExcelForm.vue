<template>
  <div class="row justify--space-between">
    <div class="flex custom-card">
      <!-- <va-card class="custom-card">
        <va-card-title>
          Notifications
        </va-card-title>
        <va-divider/>
        <va-card-content> -->
          <div v-for="msg in response.messages" :key="msg">
            <va-alert v-for="key in Object.keys(msg)" :key="key" border="left" :title="key" :border-color="response.color">
              <va-list>
                <va-list-item v-for="(value, index) in msg[key]" :key="index">
                  {{value}}
                </va-list-item>
              </va-list>
            </va-alert>
          </div>          
        <!-- </va-card-content>
      </va-card> -->
    </div>
    <div class="flex">
      <va-card class="custom-card">
        <va-card-title>
          EXCEL IMPORT
        </va-card-title>
        <va-card-content>
          <va-form  
            ref="excelform"
            tag="form"
            @validation="validForm = $event"
            @submit.prevent="submitExcel"
          >
            <div class="row">
              <div class="flex">
                <p style="text-align:start" class="title">Upload Excel (Mandatory)</p>
                <va-file-upload v-model="excel.file" dropzone undo/>
              </div>
            </div>
            <div class="row justify--space-between align--center">
              <div class="flex">
                <va-counter
                  :min="1"
                  v-model="excelData.header"
                  messages="Header Row"
                />
              </div>
              <div class="flex">
                <va-select
                  label="import options"
                  :options="importOptions"
                  value-by="value"
                  :messages="'SKIP or UPDATE already existing samples'"
                  v-model="excelData.option"
                />
              </div>
              <div class="flex">
                <va-input
                  label="Local ID"
                  v-model="excelData.id"
                  :messages="'column name of the unique identifier of the excel'"
                  :rules="[value => (value && value.length > 0) || 'Field is required']"
                />
              </div>
              <div class="flex">
                <va-input
                  label="NCBI TaxID"
                  v-model="excelData.taxid"
                  :messages="'column name of the taxonomic identifier'"
                  :rules="[value => (value && value.length > 0) || 'Field is required']"
                />
              </div>
              <div class="flex">
                <va-input
                  label="Scientific Name"
                  v-model="excelData.scientific_name"
                  :messages="'column name of the scientific name'"
                  :rules="[value => (value && value.length > 0) || 'Field is required']"
                />
              </div>
              <div class="flex">
                <va-input
                  label="Broker source"
                  :messages="'lower case name of the broker service. Ex: copo; leave this field empty if data is only local'"
                  v-model="excelData.source"
                />
              </div>
            </div> 
            <div class="row justify--space-between">
              <div class="flex">
                <va-button type="reset" @click="resetForm()">
                  Reset Form
                </va-button>
              </div>
              <div class="flex">
                <va-button @click="$refs.excelform.validate()">
                    Validate Form
                </va-button>
                <va-button :disabled="!validForm" type="submit">
                    Submit
                </va-button>
              </div>
            </div>
          </va-form>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup>
import { reactive,ref } from 'vue'
import submissionService from '../../../services/SubmissionService'

const importOptions = [
  {value:'UPDATE',text:'UPDATE existing records'},
  {value:'SKIP',text:'SKIP existing records'},
]

const response = reactive({
  messages:[],
  color: ''
})

const isError = ref(false)

const validForm = ref(null)

const excel = reactive({
  file:[]
})
const excelForm = {
    id:'',
    taxid:'',
    header:1,
    scientific_name:'',
    option: 'SKIP',
    source: null,
}

const excelData = reactive({...excelForm})

function submitExcel(){
  const formData = new FormData()
  formData.append('excel', excel.file[0])
  Object.keys(excelData).forEach(key => {
    if(excelData[key]){
      formData.append(key, excelData[key])
    }
  })
  submissionService.parseExcel(formData)
  .then(resp => {
    response.messages = [...resp.data]
    response.color = 'success'
    console.log(resp)
  })
  .catch(e => {
    response.messages = [...e.response.data]
    response.color = 'danger'
    console.log(e)
  })
}

function resetForm(){
  excel.file = []
  Object.assign(excelData,excelForm)
}

</script>