<template>
    <h4 class="va-h4">Your Samples: {{ total }}</h4>
    <p class="light-paragraph mb-4">Delete your local samples, to update or add new local samples use the spreadsheet
        import form</p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input v-model="filter" label="search sample" class="flex lg4 md4 sm12 xs12"></va-input>
            <div class="flex">
                <va-button type="submit" icon="search" />
            </div>
            <div class="flex">
                <va-button type="reset" color="danger" icon="cancel" @click="reset" />
            </div>
        </div>
    </va-form>
    <va-data-table :items="localSamples" :columns="['local_id', 'scientific_name', 'delete']">
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
            <h2 class="va-text-danger">Delete {{ sampleToDelete.id }}</h2>
        </template>
        <div class="p-10">
            Are you sure you want to delete local sample: <strong>{{ sampleToDelete.id }}</strong> ?
        </div>
        <template #footer>
            <va-button color="danger" @click="deleteLocalSample"> Delete </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vuestic-ui'
import AuthService from '../../services/clients/AuthService'
import { useGlobalStore } from '../../stores/global-store';

const { init } = useToast()
const initPagination = {
    offset: 0,
    limit: 10,
}

const globalStore = useGlobalStore()

const showModal = ref(false)
const filter = ref('')
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const localSamples = ref([])
const total = ref(0)

const sampleToDelete = ref({
    id: null,
})
onMounted(async () => {
    await fetchData()
})

async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    await fetchData()
}
async function handleSubmit() {
    await fetchData()
    pagination.value = { ...initPagination }
}

async function fetchData() {
    try {
        const { data } = await AuthService.getUserSamples(globalStore.userName, { ...pagination.value, filter: filter.value })
        localSamples.value = data.data
        total.value = data.total
    } catch (e) {
        console.log(e)
    }
}

function deleteConfirmation(rowData: Record<string, any>) {
    sampleToDelete.value.id = rowData.local_id
    showModal.value = true
}

async function deleteLocalSample() {
    showModal.value = false
    try {
        await AuthService.deleteLocalSample(sampleToDelete.value.id)
        init({ message: `${sampleToDelete.value.id} succesfully deleted`, color: 'success' })
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