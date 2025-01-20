<template>
    <h4 class="va-h4">Import from INSDC</h4>
    <p class="mb-4">Import BioSamples, Experiments and Assemblies by their respective INSDC Accession </p>
    <va-inner-loading :loading="isLoading">
        <va-form @submit.prevent="submit">
            <div class="row align-center">
                <va-input class="flex lg12 md12 sm12 xs12" v-model="input" label="INSDC Accession">
                    <template #prepend>
                        <va-select v-model="model" :options="crudList.map(c => c.value)"></va-select>
                    </template>
                    <template #append>
                        <va-button :disabled="input.length < 3" type="submit">Submit</va-button>
                        <va-button color="danger" type="reset" icon="cancel" @click="reset()" />
                    </template>
                </va-input>
            </div>
        </va-form>
    </va-inner-loading>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import AssemblyService from '../../services/clients/AssemblyService'
import BioSampleService from '../../services/clients/BioSampleService'
import ExperimentService from '../../services/clients/ExperimentService'
import AuthService from '../../services/clients/AuthService'
import { useToast } from 'vuestic-ui'
import { AxiosError } from 'axios'

const { init } = useToast()

const model = ref('biosample')

const input = ref('')

const isLoading = ref(false)

const crudObj = computed(() => {
    return crudList.find((it) => it.value === model.value)
})

const metadata = ref()

const crudList = [
    {
        label: 'Import BioSample',
        value: 'biosample',
        postDB: AuthService.importBioSample,
    },
    {
        label: 'Import Assembly',
        value: 'assembly',
        postDB: AuthService.importAssembly,
    },
    {
        label: 'Import Experiment',
        value: 'experiment',
        postDB: AuthService.importRead,
    },
]

async function submit() {
    if (crudObj.value === undefined) return
    try {
        isLoading.value = true
        await crudObj.value.postDB(input.value)
        init({ message: `${crudObj.value.value} with id ${input.value} saved!`, color: 'success' })
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
    metadata.value = null
}
</script>