<template>
<va-inner-loading :loading="isLoading">
  <div class="layout">
      <div class="row">
          <div class="flex">
              <h1 class="display-3">Manifest Import</h1>
          </div>
      </div>
      <va-divider/>
      <div v-if="showNotifications" class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <va-card class="custom-card">
            <va-card-title>
                Notifications
            </va-card-title>
            <va-card-content v-for="msg in response.messages" :key="msg">
              <va-alert v-for="key in Object.keys(msg)" :key="key" border="left" :title="key" :border-color="response.color">
                <va-list>
                  <va-list-item v-for="(value, index) in msg[key]" :key="index">
                    {{value}}
                  </va-list-item>
                </va-list>
              </va-alert>
            </va-card-content>
          </va-card>
        </div>
      </div>
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <va-card class="custom-card">
            <va-card-title>
              Import options
            </va-card-title>
            <va-card-content>
              <div class="row justify--space-between align--center">
                <div class="flex">
                  <va-file-upload file-types=".xlsx" v-model="excel.file" :disabled="fileLoaded" undo>
                    <va-chip :disabled="fileLoaded">Upload Excel</va-chip>
                  </va-file-upload>
                </div>
                <div class="flex">
                  <va-counter
                    :min="1"
                    v-model="excelData.header"
                    messages="Row number of the column definitions"
                  />
                </div>
              </div>
            </va-card-content>
            <va-divider/>
            <va-card-content>
              <va-form  
                ref="excelform"
                tag="form"
                @validation="validForm = $event"
                @submit.prevent="submitExcel"
              >
                <va-select
                  label="import options"
                  :options="importOptions"
                  value-by="value"
                  :messages="'SKIP or UPDATE existing samples'"
                  v-model="excelData.option"
                />
                <va-input
                  v-for="opt in formOptions"
                  :key="opt.key"
                  :label="opt.label"
                  v-model="excelData[opt.key]"
                  :success="excelData[opt.key]"
                  :messages="opt.message"
                  :rules="[value => (value && value.length > 0) || 'Field is required']"
                />
              </va-form>
          </va-card-content>
        </va-card>
      </div>
    </div>
    <div class="row justify--space-between">
      <div class="flex">
        <va-button color="danger" type="reset" @click="resetForm()">
          Reset Form
        </va-button>
      </div>
      <div class="flex">
        <va-button @click="$refs.excelform.validate()">
            Validate Form
        </va-button>
        <va-button @click="submitExcel()" :disabled="!validForm && fileLoaded === 1" type="submit">
            Submit
        </va-button>
      </div>
    </div>
  </div>
</va-inner-loading>
</template>
<script setup>
import { reactive,ref,computed } from 'vue'
import submissionService from '../../../services/SubmissionService'

const formOptions = [
  {label:'Local id',message:'column name of the unique identifier of the excel',key:'id'},
  {label:'NCBI Taxonomic Identifier',message:'column name of the taxonomic identifier',key:'taxid'},
  {label:'Scientific Name',message:'column name of the scientific name',key:'scientific_name'},
  {label:'Broker source',message:'lower case name of the broker service. Ex: copo; leave this field empty if data is only local',key:'source'}
]

const importOptions = [
  {value:'UPDATE',text:'UPDATE existing records'},
  {value:'SKIP',text:'SKIP existing records'},
]

const response = reactive({
  messages:[],
  color: ''
})

const showNotifications = ref(false)

const validForm = ref(null)

const fileLoaded = computed(()=>{
  return excel.file.length === 1
})

const excel = reactive({
  file:[]
})
const excelForm = {
    id:null,
    taxid:null,
    header:1,
    scientific_name:null,
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
    showNotifications.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' });
  })
  .catch(e => {
    response.messages = [...e.response.data]
    response.color = 'danger'
    showNotifications.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' });
  })
}

function resetForm(){
  excel.file = []
  Object.assign(excelData,excelForm)
}

</script>