<template>
  <div class="row justify-center">
    <div v-if="errors.length" class="flex lg4 md4">
      <va-card v-for="(ms, index) in errors" :key="index" stripe stripe-color="danger">
        <va-card-title>
          Error in row number: {{ ms.index }}
        </va-card-title>
        <va-card-content>
          {{ ms.message }}
        </va-card-content>
      </va-card>
    </div>
    <div v-if="savedSpecies.length" class="flex lg4 md4">
      <va-card stripe stripe-color="success">
        <va-card-title>
          number of species correctly saved/updated: {{ savedSpecies.length }}
        </va-card-title>
        <va-card-content>
          <ul style="height:300px;overflow:scroll">
            <li v-for="(sp, index) in savedSpecies" :key="index">
              <router-link :to="{ name: 'organism', params: { taxid: sp } }">{{ sp }}</router-link>
            </li>
          </ul>
        </va-card-content>
      </va-card>
    </div>
  </div>
  <div class="row justify-center">
    <div class="flex lg8 md8">
      <va-inner-loading :loading="isLoading">
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-title>
            GoaT Report Upload
          </va-card-title>
          <va-card-content>
            Upload a goat report, the format MUST be compliant with <a target="_blank"
              href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw">this</a>
          </va-card-content>
          <va-card-content>
            IMPORTANT: the species' related data (in case of insdc_submitted status) have to be imported manually!!
          </va-card-content>
          <va-card-content>
            <div class="row">
              <div class="flex lg3 md3">
                <va-file-upload v-model="tsv" file-types=".tsv" type="single" undo>
                </va-file-upload>
              </div>
            </div>
          </va-card-content>
          <va-card-actions align="between">
            <va-button color="danger" type="reset"> Reset </va-button>
            <va-button :disabled="!tsv" type="submit"> Submit </va-button>
          </va-card-actions>
        </va-form>
      </va-inner-loading>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import AuthService from '../../services/clients/AuthService'
const isLoading = ref(false)

const savedSpecies = ref<string[]>([])

const tsv = ref()
const errors = ref<Record<string, any>[]>([])
async function handleSubmit() {
  isLoading.value = true
  errors.value = []
  savedSpecies.value = []
  if (!tsv.value) return
  const formData = new FormData()
  formData.append('goat_report', tsv.value)
  try {
    const { data } = await AuthService.importGoatReport(formData)
    if (data.errors.length) errors.value = [...data.errors]
    if (data.saved_species.length) savedSpecies.value = [...data.saved_species]
  } catch (error) {
    console.log(error)
  } finally {
    isLoading.value = false
  }
}
</script>
  