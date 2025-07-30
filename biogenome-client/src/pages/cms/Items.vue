<template>
    <div class="row justify-space-between align-end">
        <div class="flex">
            <Header :title="currentConfig.title" :description="currentConfig.description" />
        </div>
        <div v-if="buttonAction" class="flex">
            <VaButton :to="buttonAction.route">
                {{ buttonAction.label }}
            </VaButton>
        </div>
    </div>
    <div class="row justify-center">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex lg12 md12">
                            <VaInput clearable v-model="filter" @update:model-value="updateFilter" placeholder="Search">
                                <template #prependInner>
                                    <VaIcon name="fa-search" />
                                </template>
                            </VaInput>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <VaDataTable hoverable :items="items" :columns="currentConfig.columns">
                        <template #cell(experiment_title)="{ rowData }">
                            {{ rowData.metadata.experiment_title }}
                        </template>
                        <template #cell(scientific_name)="{ rowData }">
                            {{ rowData.scientific_name || rowData.metadata.scientific_name }}
                        </template>
                        <template #cell(organism_part)="{ rowData }">
                            {{ rowData.metadata.tissue || rowData.metadata.organism_part ||
                                rowData.metadata['organism part'] }}
                        </template>
                        <template #cell(view)="{ rowData }">
                            <VaChip size="small" @click="handleClick(rowData)">View</VaChip>
                        </template>
                        <template #cell(delete)="{ rowData }">
                            <VaChip size="small" color="secondary"
                                v-if="isOrganisms && !isAdmin && rowData.pending_deletion">
                                Pending Deletion
                            </VaChip>
                            <VaChip v-else @click="deleteConfirmation(rowData[currentConfig.idField])" size="small"
                                color="danger" icon="delete">{{ isOrganisms && !isAdmin ? 'Send delete request' :
                                    'Delete' }}</VaChip>
                        </template>
                        <template v-if="currentConfig.editRoute" #cell(edit)="{ rowData }">
                            <VaChip color="secondary" @click="router.push(currentConfig.editRoute(rowData))"
                                size="small" icon="edit">Edit
                            </VaChip>
                        </template>
                    </VaDataTable>
                </VaCardContent>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <p class="va-text-secondary">Number of results: {{ total }}</p>
                        </div>
                        <div class="flex">
                            <va-pagination v-model="offset" :page-size="pagination.limit" :total="total"
                                :visible-pages="3" buttons-preset="secondary" rounded gapped border-color="primary"
                                @update:model-value="handlePagination" />
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
    </div>
    <VaModal v-model="showModal" hide-default-actions>
        <template #header>
            <h2 class="va-text-danger">Delete {{ deleteItem }}</h2>
        </template>
        <div class="p-10">
            Are you sure you want to delete: <strong>{{ deleteItem }}</strong> ?
            <br />
            <p v-if="!isAdmin && model === 'organisms'">
                This will send a request to an admin user to delete the organism
            </p>
            <p v-else>
                All its related data will be also deleted!!
            </p>
        </div>
        <template #footer>
            <VaButton color="danger" @click="handleDelete"> Delete </VaButton>
        </template>
    </VaModal>
    <VaModal v-model="showDetails" hide-default-actions>
        <h3 class="va-h3">{{ selectedItem[currentConfig.idField] }}</h3>
        <MetadataTreeCard :metadata="Object.entries(selectedItem)" :id="selectedItem[currentConfig.idField]" />
    </VaModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Header from '../../components/cms/Header.vue';
import { useToast } from 'vuestic-ui';
import { DataModels } from '../../data/types';
import { config } from '../../composable/cmsConfig'
import ItemService from '../../services/CommonService';
import AuthService from '../../services/AuthService';
import { useRouter } from 'vue-router';
import { useGlobalStore } from '../../stores/global-store';
import MetadataTreeCard from '../../components/MetadataTreeCard.vue';
import { AxiosError } from 'axios';

const { init } = useToast();

const router = useRouter()
const props = defineProps<{ model: DataModels }>();
const initPagination = {
    offset: 0,
    limit: 10,
}
const filter = ref('');
const pagination = ref({ ...initPagination });
const offset = ref(1);
const items = ref<Record<string, any>[]>([]);
const total = ref(0);
const gStore = useGlobalStore()
const showModal = ref(false);
const deleteItem = ref<string | null>(null);
const currentConfig = computed(() => config[props.model])
const isOrganisms = computed(() => props.model === 'organisms')
const isAdmin = computed(() => gStore.userRole === 'Admin')
const selectedItem = ref<Record<string, any>>({})
const showDetails = ref(false)


const buttonAction = computed(() => {
    if (props.model === 'annotations') {
        return { label: 'Create Annotation', route: { name: 'create-annotation' } }
    } else if (props.model === 'assemblies') {
        return { label: 'Import Assembly', route: { name: 'insdc-form', params: { importModel: 'assemblies' } } }
    } else if (props.model === 'experiments') {
        return { label: 'Import Experiments', route: { name: 'insdc-form', params: { importModel: 'experiments' } } }
    } else if (props.model === 'biosamples') {
        return { label: 'Import BioSample', route: { name: 'insdc-form', params: { importModel: 'biosamples' } } }
    } else if (props.model === 'submitted_biosamples') {
        return { label: 'Publish BioSample', route: { name: 'publish-biosample' } }
    } else if (props.model === 'local_samples') {
        return { label: 'Import Local Samples', route: { name: 'spreadsheet-upload' } }
    } else if (props.model === 'organisms') {
        return { label: 'Create Organism', route: { name: 'create-organism' } }

    }
})


watch(() => props.model, async () => {
    await reset()
}, { immediate: true })

async function fetchData() {
    const query = { ...pagination.value, filter: filter.value }
    if (isOrganisms.value && !isAdmin.value) {
        const { data } = await AuthService.getUserSpecies(gStore.userName, query)
        items.value = [...data.data]
        total.value = data.total
    }
    else if (props.model === 'local_samples' && !isAdmin.value) {
        const { data } = await AuthService.getUserSamples(gStore.userName, query)
        items.value = [...data.data]
        total.value = data.total
    }

    else {
        const { data } = await ItemService.getItems(props.model, query);
        items.value = [...data.data];
        total.value = data.total;
    }

}

async function updateFilter(f: string) {
    filter.value = f
    pagination.value = { ...initPagination }
    handleSubmit()
}
async function handlePagination(value: number) {
    pagination.value.offset = value - 1;
    await fetchData();
}

async function handleSubmit() {
    pagination.value.offset = 0;
    await fetchData();
}

async function reset() {
    filter.value = '';
    pagination.value.offset = 0;
    await fetchData();
}

function deleteConfirmation(id: string) {
    deleteItem.value = id;
    showModal.value = true;
}

async function handleDelete() {
    if (!deleteItem.value) return
    try {
        if (!isAdmin.value && props.model === 'organisms') {
            await AuthService.createOrganismToDeleteRequest(deleteItem.value)
            init({ message: `Request to delete ${deleteItem.value} successfull` })
        } else {
            await AuthService.deleteItem(props.model, deleteItem.value)
            init({ message: `Successfully deleted`, color: 'success' });
        }
        await fetchData();

    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.response?.data as string ?? 'An error occurred', color: 'danger' });
        console.error(error);
    } finally {
        showModal.value = false
    }
}

const handleClick = async (rowData: any) => {
    selectedItem.value = { ...rowData }
    showDetails.value = true
}
</script>