<template>
  <div class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <h1 class="va-h1">GoaT Report Upload</h1>
    </div>
  </div>

  <div class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <VaCard>
        <VaCardContent>
          <div class="row justify-space-between align-center">
            <div class="flex">
              <h2 class="va-h6">
                Upload a goat report
              </h2>
              <p class="va-text-secondary">The TSV format must be compliant with <a class="va-link" target="_blank"
                  href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw"><b>this
                    template</b></a></p>
            </div>
          </div>
        </VaCardContent>
        <VaInnerLoading :loading="isLoading">
          <VaForm tag="form" @submit.prevent="handleSubmit">
            <VaCardContent>
              <div class="row">
                <div class="flex lg12 md12 sm12 xs12">
                  <VaFileUpload dropzone uploadButtonText="Clik to upload a TSV" v-model="tsv" file-types=".tsv"
                    type="single" undo>
                  </VaFileUpload>
                </div>
              </div>
            </VaCardContent>
            <VaCardActions>
              <VaButton block preset="true" :disabled="!tsv" type="submit"> Submit </VaButton>
            </VaCardActions>
          </VaForm>
        </VaInnerLoading>

      </VaCard>
    </div>
  </div>
  <div v-if="messages.length" class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <VaCard :stripe="!!messages.length" :stripe-color="isError ? 'danger' : 'success'">
        <VaCardContent>
          <p class="va-text-bold" v-if="uploadState">{{ uploadState }}</p>
          <p class="va-text-bold" v-else-if="isError">
            {{ isError ? 'Error' : 'Success' }}
          </p>
        </VaCardContent>
        <VaCardContent style="max-height: 90vh;overflow: scroll;">
          <p v-for="message in messages">
            {{ message }}
          </p>
        </VaCardContent>
      </VaCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import AuthService from '../../services/AuthService'
import { AxiosError } from 'axios'
import { useToast, VaFileUpload, VaInnerLoading } from 'vuestic-ui';

const isLoading = ref(false)
const messages = ref<Record<string, string>[]>([])
const tsv = ref()
const isError = ref(false)
const intervalId = ref<number | null>(null);
const pollingInterval = 5000; // Interval in milliseconds (e.g., 5000 ms = 5 seconds)
const jobID = ref()
const uploadState = ref("")
const { init } = useToast()


onUnmounted(() => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value);
  }
})

async function fetchStatus() {
  const { data } = await AuthService.taskStatus(jobID.value)
  const state = data.state
  if (state === 'SUCCESS' && intervalId.value) {
    clearInterval(intervalId.value)
    init({ message: 'Success', color: 'success' })
    isLoading.value = false
  }
  messages.value = [...data.messages]
  uploadState.value = data.state
}

async function handleSubmit() {
  isError.value = false
  isLoading.value = true
  messages.value = []
  if (!tsv.value) return
  const formData = new FormData()
  formData.append('goat_report', tsv.value)

  try {
    const { data } = await AuthService.importGoatReport(formData)
    uploadState.value = data.state
    jobID.value = data.id
    intervalId.value = window.setInterval(fetchStatus, pollingInterval);

  } catch (error) {
    isError.value = true
    const axiosError = error as AxiosError
    if (axiosError.response && axiosError.response.data && axiosError.response.data.message) {
      messages.value = [...axiosError.response.data.message.split(';')]
    } else if (axiosError.response && axiosError.response.data && Array.isArray(axiosError.response.data)) {
      messages.value = [...axiosError.response.data as Record<string, string>[]]
    }
    else messages.value = [{ error: axiosError.message }]
    isLoading.value = false
  }
}
</script>
