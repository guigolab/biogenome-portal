<template>
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
            <va-card-content>
              <div class="row">
                <div class="flex lg3 md3">
                  <va-file-upload v-model="excel" file-types=".xlsx" type="single" undo>
                     <va-chip color="info" icon="upload" flat >Upload GoaT Report</va-chip> 
                  </va-file-upload>
                </div>
              </div>
            </va-card-content>
            <va-card-actions align="between">
              <va-button color="danger" type="reset"> Reset </va-button>
              <va-button :disabled="!excel" type="submit"> Submit </va-button>
            </va-card-actions>
          </va-form>
        </va-inner-loading>
      </div>
    </div>
  </template>
  <script setup lang="ts">
    import { reactive, ref } from 'vue'
    import GoaTService from '../../services/clients/GoaTService'
    const isLoading = ref(false)
  
    const messages = ref<string[]>([])
    const isError = ref(false)
  
    const excel = ref({})
    
    async function handleSubmit() {
      isLoading.value = true
      messages.value = []
      isError.value = false
      const formData = new FormData()
      formData.append('goat_report', excel.value)
      try {
        const { data } = await GoaTService.uploadGoatReport(formData)
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
  