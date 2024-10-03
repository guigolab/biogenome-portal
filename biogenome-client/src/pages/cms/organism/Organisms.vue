<template>
    <h2 class="va-h4">Your organisms: {{ total }}</h2>
    <p class="mb-4">Edit or delete your organisms</p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input v-model="filter.filter" label="search organism" class="flex lg4 md4 sm12 xs12"></va-input>
            <div class="flex">
                <va-button type="submit" :disabled="!isValidInput" icon="search" />
            </div>
            <div class="flex">
                <va-button type="reset" :disabled="!isValidInput" color="danger" icon="cancel" @click="reset" />
            </div>
        </div>
    </va-form>
    <va-data-table :items="organisms" :columns="['taxid', 'scientific_name', 'tolid_prefix', 'edit', 'delete']">
        <template #cell(edit)="{ rowData }">
            <va-icon @click="$router.push({ name: 'update-organism', params: { taxid: rowData.taxid } })" name="edit" />
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
            <h2 style="color: red">Delete {{ organismToDelete.scientific_name }}</h2>
        </template>
        <div style="padding: 10px">
            Are you sure you want to delete the organism: <strong>{{ organismToDelete.scientific_name }}</strong> ?
            <br />
            All its related data will be also deleted!!
        </div>
        <template #footer>
            <va-button color="danger" @click="deleteOrganism"> Delete </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AuthService from '../../../services/clients/AuthService'
import { useToast } from 'vuestic-ui/web-components'

const { init } = useToast()
const initPagination = {
    offset: 0,
    limit: 10,
}

const initFilter = {
    filter: '',
    user: ''
}

const isValidInput = computed(() => {
    return filter.value.filter.length > 2
})
const showModal = ref(false)
const filter = ref({ ...initFilter })
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const organisms = ref([])
const total = ref(0)

const organismToDelete = ref<{
    taxid: string | null,
    scientific_name: string | null
}>({
    taxid: null,
    scientific_name: null,
})

onMounted(async () => {
    await fetchData()
})

async function fetchData() {
    try {
        const { data } = await AuthService.getUserSpecies({ ...pagination.value, ...filter.value })
        organisms.value = data.data
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

async function reset() {
    filter.value.filter = ''
    pagination.value = { ...initPagination }
    await fetchData()
}

function deleteConfirmation(rowData: { taxid: string; scientific_name: string; }) {
    organismToDelete.value.taxid = rowData.taxid
    organismToDelete.value.scientific_name = rowData.scientific_name
    showModal.value = true
}

async function deleteOrganism() {
    showModal.value = false
    try {
        await AuthService.deleteOrganism(organismToDelete.value.taxid)
        init({ message: `${organismToDelete.value.scientific_name} successfully deleted!` })
    } catch (e) {
        init({ message: "Something happened" })
    } finally {
        organismToDelete.value.taxid = null
        organismToDelete.value.scientific_name = null
        filter.value.filter = ''
        handleSubmit()
    }
}
</script>