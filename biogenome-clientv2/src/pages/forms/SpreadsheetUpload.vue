<template>
  <p class="va-title">Spreadsheet Upload</p>
  <va-divider />
  <div class="row justify-center">
    <div v-if="messages.length" class="flex lg4 md4">
      <va-card
        v-for="(ms, index) in messages"
        :key="index"
        class="d-flex mt-3"
        stripe
        :stripe-color="isError ? 'danger' : 'success'"
      >
        <div v-for="(k, i) in Object.keys(ms)" :key="i">
          <va-card-title>
            {{ k }}
          </va-card-title>
          <va-card-content v-for="v in ms[k]" :key="v" style="word-break: break-all">
            {{ v }}
          </va-card-content>
        </div>
      </va-card>
    </div>
    <div class="flex lg8 md8">
      <va-inner-loading :loading="isLoading">
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-title>Import Options</va-card-title>
          <va-card-content>
            <div class="row">
              <div class="flex lg4 md4">
                <va-input
                  v-model="excelData.id"
                  label="ID column name"
                  :messages="['Column name of the ID of the samples']"
                ></va-input>
              </div>
              <div class="flex lg4 md4">
                <va-input
                  v-model="excelData.taxid"
                  label="TAXID column name"
                  :messages="['Column name of the Taxonomic identifier (NCBI) of the samples']"
                ></va-input>
              </div>
              <div class="flex lg4 md4">
                <va-input
                  v-model="excelData.scientific_name"
                  label="Scientific Name column name"
                  :messages="['Column name of the Scientific Name of the samples']"
                ></va-input>
              </div>
              <!-- <div class="flex lg4 md4">
                  <va-input label="latitude column name" v-model="excelData.latitude" :messages="['latitude column name: it must be a valid decimal value']"
                    
                  ></va-input>    
                </div>
                <div class="flex lg4 md4">
                  <va-input label="longitude column name" v-model="excelData.longitude" :messages="['longitude column name: it must be a valid decimal value']"
                    
                  ></va-input>    
                </div> -->
            </div>
          </va-card-content>
          <va-divider>File Options</va-divider>
          <va-card-content>
            <div class="row">
              <div class="flex lg6 md6">
                <va-select
                  v-model="excelData.option"
                  :options="['SKIP', 'UPDATE']"
                  label="Existing ID behaviour"
                  :messages="['SKIP or UPDATE existing samples (related to ID column name)']"
                ></va-select>
              </div>
              <div class="flex lg3 md3">
                <va-counter v-model="excelData.header" :min="1" :messages="['Row number of the column definitions']" />
              </div>
              <div class="flex lg3 md3">
                <va-file-upload v-model="excel" file-types=".xlsx" type="single" undo>
                  <!-- <va-chip color="info" icon="upload" flat :disabled="fileLoaded">Upload Spreadsheet</va-chip> -->
                </va-file-upload>
              </div>
            </div>
          </va-card-content>
          <va-card-actions align="between">
            <va-button color="danger" type="reset"> Reset Form </va-button>
            <va-button :disabled="!excel" type="submit"> Submit Spreadsheet </va-button>
          </va-card-actions>
        </va-form>
      </va-inner-loading>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import AuthService from '../../services/clients/AuthService'

  const isLoading = ref(false)

  const messages = ref<string[]>([])
  const isError = ref(false)

  const excel = ref({})

  const excelForm = {
    id: null,
    taxid: null,
    header: 1,
    scientific_name: null,
    latitude: null,
    longitude: null,
    option: 'SKIP',
  }

  const excelData = reactive({ ...excelForm })

  async function handleSubmit() {
    isLoading.value = true
    messages.value = []
    isError.value = false
    const formData = new FormData()
    formData.append('excel', excel.value)
    Object.keys(excelData).forEach((key) => {
      if (excelData[key]) {
        formData.append(key, excelData[key])
      }
    })
    try {
      const { data } = await AuthService.importSpreadsheet(formData)
      messages.value.push(...data)
    } catch (error) {
      if(error && error.response && error.response.data){
        const { data } = error.response
        messages.value.push(...data)
      }
      isError.value = true
      console.log(error)
    }
    isLoading.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
</script>
