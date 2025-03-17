<template>
  <div class="row justify-space-between align-end">
    <div class="flex">
      <h1 class="va-h1">GoaT Report Upload</h1>
    </div>
    <div class="flex">
      <VaButton color="info" @click="showModal = !showModal">Guidelines</VaButton>
    </div>
  </div>
  <div class="row">
    <div class="flex lg12 md12 sm12 xs12">
      <VaCard>
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
              <VaButton :disabled="!tsv" type="submit"> Submit </VaButton>
            </VaCardActions>
          </VaForm>
        </VaInnerLoading>
      </VaCard>
    </div>
  </div>
  <VaModal v-model="showModal">
    <template #header>
      <h2 class="va-h3">GoaT Upload Guidelines</h2>
    </template>
    <div class="layout va-gutter-1 fluid">
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <p>
            Use goat report (in TSV format), to upload organisms in the portal database
          </p>
        </div>
        <div class="flex lg12 md12 sm12 xs12">
          <p>The TSV format must be compliant with <a class="va-link" target="_blank"
              href="https://docs.google.com/spreadsheets/d/1eC6jQctRoUaeGWWDbb1qsWs-7ajC462nnJdHK4N3ivw"><b>this
                template</b></a>. Note that you have to <span class="va-text-danger">delete</span> the <span
              class="va-text-highlighted">Click here
              for
              complete
              Guidelines text </span> in the
            TSV template</p>
        </div>
      </div>
      <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
          <h4 class="va-h6">
            About the template header:
          </h4>
        </div>
        <div class="flex lg12 md12 sm12 xs12">
          <p>Except for the <span class="va-text-bold"> sub_project</span> row, the template header—although required
            for
            compatibility with any existing
            GoaT report—is not actually used in the portal.</p>
        </div>
        <div class="flex lg12 md12 sm12 xs12">
          <p>If you are part of a subproject, enter the subproject name (e.g., principal investigator, entity, or
            research
            institution) in the sub_project row. </p>
        </div>
      </div>
    </div>
  </VaModal>
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
import { useToast } from 'vuestic-ui';

const isLoading = ref(false)
const messages = ref<Record<string, string>[]>([])
const tsv = ref()
const isError = ref(false)
const intervalId = ref<number | null>(null);
const pollingInterval = 5000; // Interval in milliseconds (e.g., 5000 ms = 5 seconds)
const jobID = ref()
const uploadState = ref("")
const { init } = useToast()
const showModal = ref(false)

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
    if (axiosError.response && axiosError.response.data) {
      const d = axiosError.response.data as any
      if (d.message) {
        messages.value = [...d.message.split(';')]
      } else if (Array.isArray(d)) {
        messages.value = [...d as Record<string, string>[]]
      }
    }
    else messages.value = [{ error: axiosError.message }]
    isLoading.value = false
  }
}
</script>
