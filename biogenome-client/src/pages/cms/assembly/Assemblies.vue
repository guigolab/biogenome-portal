<template>
    <h4 class="va-h4">Assemblies</h4>
    <p class="mb-4">Add genome annotations, chromosome aliases or delete assemblies </p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input v-model="filter.filter" label="search assembly" class="flex lg4 md4 sm12 xs12"></va-input>
            <div class="flex">
                <va-button icon="search" @click="handleSubmit"> </va-button>
                <va-button icon="cancel" color="danger" @click="reset"> </va-button>

            </div>
        </div>
    </va-form>
    <va-data-table :items="assemblies"
        :columns="['scientific_name', 'assembly_name', 'metadata.assembly_level', 'chromosome_aliases', 'delete']">
        <template #cell(delete)="{ rowData }">
            <va-icon color="danger" name="delete" @click="deleteConfirmation(rowData)" />
        </template>
        <template #cell(chromosome_aliases)="{ rowData }">
            <va-button :to="{ name: 'chr-aliases', params: { accession: rowData.accession } }" size="small"
                v-if="rowData.metadata.assembly_level === 'Chromosome'" icon="add" color="secondary" />
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
            <h2 style="color: red">Delete {{ assemblyToDelete.assemblyName }}</h2>
        </template>
        <div style="padding: 10px">
            Are you sure you want to delete assembly: <strong>{{ assemblyToDelete.assemblyName }}</strong> ?
        </div>
        <template #footer>
            <va-button color="danger" @click="deleteAssembly"> Delete </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AssemblyService from '../../../services/clients/AssemblyService'
import AuthService from '../../../services/clients/AuthService'
import { useToast } from 'vuestic-ui/web-components'

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
const assemblies = ref([])
const total = ref(0)

const assemblyToDelete = ref({
    accession: null,
    assemblyName: null,
})
onMounted(async () => {
    const { data } = await AssemblyService.getAssemblies({ ...pagination.value })
    assemblies.value = data.data
    total.value = data.total
})

async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await AssemblyService.getAssemblies({ ...pagination.value, ...filter.value })
    assemblies.value = data.data
    total.value = data.total
}
async function handleSubmit() {
    const { data } = await AssemblyService.getAssemblies({ ...pagination.value, ...filter.value })
    assemblies.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
}

function deleteConfirmation(rowData: Record<string, any>) {
    assemblyToDelete.value.accession = rowData.accession
    assemblyToDelete.value.assemblyName = rowData.assembly_name
    showModal.value = true
}

function reset() {
    filter.value = { ...initFilter }
    pagination.value = { ...initPagination }
    handleSubmit()
}

async function deleteAssembly() {
    showModal.value = false
    try {
        await AuthService.deleteAssembly(assemblyToDelete.value.accession)
        init({ message: `${assemblyToDelete.value.accession} succesfully deleted`, color: 'success' })
        handleSubmit()

    } catch (error) {
        init({ message: "Something happened", color: 'danger' })
        console.log(error)
    }
}

</script>