<template>
    <Header :title="currentConfig.title" :description="currentConfig.description" />
    <div class="row justify-center">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex lg6 md6">
                            <VaInput clearable @update:model-value="updateFilter" v-model="filter" placeholder="Search">
                            </VaInput>
                        </div>
                        <div class="flex">
                            <p class="va-text-secondary">Number of results: {{ total }}</p>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <VaDataTable :items="items" :columns="currentConfig.columns">
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
                        <template #cell(delete)="{ rowData }">
                            <VaIcon color="danger" name="delete"
                                @click="deleteConfirmation(rowData[currentConfig.idField])" />
                        </template>
                        <template v-if="currentConfig.editRoute" #cell(edit)="{ rowData }">
                            <VaIcon @click="router.push(currentConfig.editRoute(rowData))" name="edit" />
                        </template>

                    </VaDataTable>
                </VaCardContent>
                <VaCardContent>
                    <div class="row justify-center">
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
            Are you sure you want to delete the organism: <strong>{{ deleteItem }}</strong> ?
            <br />
            All its related data will be also deleted!!
        </div>
        <template #footer>
            <VaButton color="danger" @click="handleDelete"> Delete </VaButton>
        </template>
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

watch(() => props.model, async () => {
    await reset()
}, { immediate: true })

async function fetchData() {
    if (isOrganisms.value && !isAdmin.value) {
        const { data } = await AuthService.getUserSpecies(gStore.userName, {})
        items.value = [...data.data]
        total.value = data.total
    } else {
        const { data } = await ItemService.getItems(props.model, {
            ...pagination.value,
            filter: filter.value,
        });
        items.value =[...data.data];
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
        await AuthService.deleteItem(props.model, deleteItem.value)
        init({ message: `Successfully deleted`, color: 'success' });
        await fetchData();
    } catch (error) {
        init({ message: 'Error occurred', color: 'danger' });
        console.error(error);
    } finally {
        showModal.value = false
    }
}
</script>