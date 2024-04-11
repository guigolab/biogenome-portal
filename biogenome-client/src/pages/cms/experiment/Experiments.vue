<template>
    <h4 class="va-h4">Experiments</h4>
    <p class="mb-4">Delete Experiments </p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input v-model="filter.filter" label="search experiment" class="flex lg4 md4 sm12 xs12"></va-input>
            <div class="flex">
                <va-button icon="search" @click="handleSubmit"> </va-button>
                <va-button icon="cancel" color="danger" @click="reset"> </va-button>
            </div>
        </div>
    </va-form>
    <va-data-table :items="experiments"
        :columns="['experiment_accession', 'scientific_name', 'experiment_title', 'delete']">
        <template #cell(experiment_title)="{ rowData }">
            {{ rowData.metadata.experiment_title }}
        </template>
        <template #cell(scientific_name)="{ rowData }">
            {{ rowData.metadata.scientific_name }}
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
            <h2 style="color: red">Delete {{ readToDelete.accession }}</h2>
        </template>
        <div style="padding: 10px">
            Are you sure you want to delete experiment: <strong>{{ readToDelete.accession }}</strong> ?
        </div>
        <template #footer>
            <va-button color="danger" @click="deleteRead"> Delete </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ExperimentService from '../../../services/clients/ExperimentService'
import AuthService from '../../../services/clients/AuthService';
import { useToast } from 'vuestic-ui/web-components';

const { init } = useToast()

const initPagination = {
    offset: 0,
    limit: 10,
}

const initFilter = {
    filter: '',
}

const showModal = ref(false)
const filter = ref({ ...initFilter })
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const experiments = ref([])
const total = ref(0)

const readToDelete = ref({
    accession: null,
})
onMounted(async () => {
    const { data } = await ExperimentService.getExperiments({ ...pagination.value })
    experiments.value = data.data
    total.value = data.total
})

async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await ExperimentService.getExperiments({ ...pagination.value, ...filter.value })
    experiments.value = data.data
    total.value = data.total
}
async function handleSubmit() {
    const { data } = await ExperimentService.getExperiments({ ...pagination.value, ...filter.value })
    experiments.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
}

function deleteConfirmation(rowData: Record<string, any>) {
    readToDelete.value.accession = rowData.experiment_accession
    showModal.value = true
}

async function deleteRead() {
    showModal.value = false
    try {
        await AuthService.deleteRead(readToDelete.value.accession)
        init({ message: `${readToDelete.value.accession} succesfully deleted`, color: 'success' })
        handleSubmit()
    } catch (error) {
        init({ message: "Something happened", color: 'danger' })
        console.log(error)
    }
}

function reset() {
    filter.value = { ...initFilter }
    pagination.value = { ...initPagination }
    handleSubmit()
}

</script>