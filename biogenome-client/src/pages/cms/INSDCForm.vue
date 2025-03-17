<template>
    <Header :title="title" :description="description" />
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <h2 class="va-h6">
                        Import Form
                    </h2>
                    <p class="va-text-secondary">
                        Type a valid accession to insert into the database, in case of experiment or assembly, the
                        related biosample will also be imported
                    </p>
                </VaCardContent>
                <VaCardContent>
                    <div class="row">
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaSelect label="INSDC MODEL" inner-label v-model="model" :options="options"></VaSelect>
                        </div>
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaInput v-model="input" placeholder="Type a INSDC accession">
                            </VaInput>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardActions>
                    <VaButton @click="submit" :loading="isLoading" :disabled="input.length < 3">Submit</VaButton>
                </VaCardActions>
            </VaCard>
        </div>
    </div>


</template>
<script setup lang="ts">
import { ref } from 'vue'
import AuthService from '../../services/AuthService'
import { useToast } from 'vuestic-ui'
import { AxiosError } from 'axios'
import Header from '../../components/cms/Header.vue'

const title = "Import from INSDC"
const description = "Import BioSamples, Experiments or Assemblies by their respective INSDC Accession"

const props = defineProps<{
    importModel?: 'biosamples' | 'assemblies' | 'experiments'
}>()


const { init } = useToast()

const isLoading = ref(false)
const options = ['biosamples', 'assemblies', 'experiments']

const model = ref(props.importModel ?? 'biosamples')

const input = ref('')

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
    isLoading.value = true
    try {
        if (model.value === 'assemblies') {
            await AuthService.importAssembly(input.value)
        } else if (model.value === 'biosamples') {
            await AuthService.importBioSample(input.value)
        } else {
            await AuthService.importRead(input.value)
        }

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