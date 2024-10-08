<template>
    <h4 class="va-h4">Assemblies: {{ total }}</h4>
    <p class="mb-4">Add genome annotations, chromosome aliases or delete assemblies </p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input v-model="filter" label="search assembly" class="flex lg4 md4 sm12 xs12"></va-input>
            <div class="flex">
                <va-checkbox indeterminate v-model="hasAliases" label="Has chromosome aliases?"></va-checkbox>
            </div>
            <div class="flex">
                <va-button icon="search" @click="handleSubmit"> </va-button>
                <va-button icon="cancel" color="danger" @click="reset"> </va-button>
            </div>
        </div>
    </va-form>
    <va-data-table :items="assemblies"
        :columns="['accession', 'scientific_name', 'assembly_name', 'metadata.assembly_info.assembly_level', 'chromosome_aliases', 'delete']">
        <template #cell(delete)="{ rowData }">
            <va-icon color="danger" name="delete" @click="deleteConfirmation(rowData)" />
        </template>
        <template #cell(chromosome_aliases)="{ rowData }">
            <div class="row">
                <div v-if="rowData.has_chromosomes_aliases" class="flex">
                    <va-button size="small" :href="`${baseURL}/assemblies/${rowData.accession}/chr_aliases`"
                        icon="download"></va-button>
                </div>
                <div v-if="rowData.metadata && rowData.metadata.assembly_info.assembly_level === 'Chromosome'" class="flex">
                    <va-button :to="{ name: 'chr-aliases', params: { accession: rowData.accession } }" size="small"
                        icon="add" />
                </div>
            </div>
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

const baseURL = import.meta.env.VITE_BASE_PATH ? import.meta.env.VITE_BASE_PATH + '/api' : '/api'


const { init } = useToast()
const initPagination = {
    offset: 0,
    limit: 10,
}

const showModal = ref(false)
const hasAliases = ref(null)
const filter = ref('')
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const assemblies = ref([])
const total = ref(0)

const assemblyToDelete = ref({
    accession: null,
    assemblyName: null,
})
onMounted(async () => {
    await fetchData()
})

async function fetchData() {
    try {
        const { data } = await AssemblyService.getAssemblies({ ...pagination.value, filter: filter.value, has_chromosomes_aliases: hasAliases.value })
        assemblies.value = data.data
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
    assemblyToDelete.value.accession = rowData.accession
    assemblyToDelete.value.assemblyName = rowData.assembly_name
    showModal.value = true
}

async function reset() {
    filter.value = ''
    hasAliases.value = null
    pagination.value = { ...initPagination }
    await fetchData()
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