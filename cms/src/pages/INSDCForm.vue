<template>
    <Header :title="title" :description="description" />
    <div class="row">
        <div class="flex">
            <va-select v-model="model" :options="options"></va-select>
        </div>
        <div class="flex">
            <va-input v-model="input" placeholder="Type a INSDC accession">
            </va-input>
        </div>
        <div class="flex">
            <va-button @click="submit" :loading="isLoading" :disabled="input.length < 3"
                type="submit">Submit</va-button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import AuthService from '../services/AuthService'
import { useToast } from 'vuestic-ui'
import { AxiosError } from 'axios'
import Header from '../components/Header.vue'

const title = "Import from INSDC"
const description = "Import BioSamples, Experiments or Assemblies by their respective INSDC Accession"

const { init } = useToast()

const options = ['biosamples', 'assemblies', 'experiments']

const model = ref('biosamples')

const input = ref('')

const isLoading = ref(false)


const crudList = [
    {
        label: 'Import BioSample',
        value: 'biosamples',
        postDB: AuthService.importBioSample,
    },
    {
        label: 'Import Assembly',
        value: 'assemblies',
        postDB: AuthService.importAssembly,
    },
    {
        label: 'Import Experiment',
        value: 'experiments',
        postDB: AuthService.importRead,
    },
]

async function submit() {
    const obj = crudList.find(c => c.value === model.value)
    if (!obj) return
    try {
        isLoading.value = true

        await obj.postDB(input.value)
        init({ message: `${obj.value} with id ${input.value} saved!`, color: 'success' })
        reset()
    } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response && axiosError.response.data)
            init({ message: axiosError.response.data as string, color: 'danger' })
    } finally {
        isLoading.value = false
    }

}

function reset() {
    input.value = ''
}
</script>