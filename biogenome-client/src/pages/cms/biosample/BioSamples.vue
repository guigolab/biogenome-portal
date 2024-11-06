<template>
    <h4 class="va-h4">BioSamples: {{ total }}</h4>
    <p class="light-paragraph mb-4">Delete BioSamples </p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input v-model="filter" label="search BioSample" class="flex lg4 md4 sm12 xs12"></va-input>
            <div class="flex">
                <va-button icon="search" @click="handleSubmit"> </va-button>
                <va-button icon="cancel" color="danger" @click="reset"> </va-button>
            </div>
        </div>
    </va-form>
    <va-data-table :items="biosamples" :columns="['accession', 'scientific_name', 'organism_part', 'delete']">
        <template #cell(organism_part)="{ rowData }">
            {{ rowData.metadata.tissue || rowData.metadata.organism_part || rowData.metadata['organism part'] }}
        </template>
        <template #cell(delete)="{ rowData }">
            <va-icon color="danger" name="delete" @click="deleteConfirmation(rowData)" />
        </template>
    </va-data-table>
    <div class="row justify-center">
        <div class="flex">
            <va-pagination v-model="offset" :page-size="pagination.limit" :total="total" :visible-pages="3"
                buttons-preset="secondary" rounded gapped border-color="primary"
                @update:model-value="handlePagination" />
        </div>
    </div>
    <va-modal v-model="showModal" hide-default-actions>
        <template #header>
            <h2 class="va-text-danger">Delete {{ sampleToDelete.accession }}</h2>
        </template>
        <div class="p-10">
            Are you sure you want to delete sample: <strong>{{ sampleToDelete.accession }}</strong> ?
        </div>
        <template #footer>
            <va-button color="danger" @click="deleteBioSample"> Delete </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BioSampleService from '../../../services/clients/BioSampleService'
import { useToast } from 'vuestic-ui'
import AuthService from '../../../services/clients/AuthService';
const { init } = useToast()
const initPagination = {
    offset: 0,
    limit: 10,
}

const showModal = ref(false)
const filter = ref('')
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const biosamples = ref([])
const total = ref(0)

const sampleToDelete = ref({
    accession: null,
})
onMounted(async () => {
    await fetchData()
})

async function fetchData() {
    try {
        const { data } = await BioSampleService.getBioSamples({ ...pagination.value, filter: filter.value })
        biosamples.value = data.data
        total.value = data.total
    } catch (e) {
        console.log(e)
    }
}
async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    await fetchData()

}
async function handleSubmit() {
    await fetchData()
    pagination.value = { ...initPagination }
}

function deleteConfirmation(rowData: Record<string, any>) {
    sampleToDelete.value.accession = rowData.accession
    showModal.value = true
}

async function deleteBioSample() {
    showModal.value = false
    try {
        await AuthService.deleteBioSample(sampleToDelete.value.accession)
        init({ message: `${sampleToDelete.value.accession} succesfully deleted`, color: 'success' })
        handleSubmit()
    } catch (error) {
        init({ message: "Something happened", color: 'danger' })
        console.log(error)
    }
}

async function reset() {
    filter.value = ''
    pagination.value = { ...initPagination }
    await fetchData()
}
</script>