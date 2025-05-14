<template>
    <div class="row justify-space-between align-end">
        <div class="flex">
            <Header title="My BioSamples" description="List of BioSamples submitted to EBI" />
        </div>
        <div class="flex">
            <VaButton :to="{ name: 'publish-biosample' }">Create BioSample</VaButton>
        </div>
    </div>
    <div class="row justify-center">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row align-center">
                        <div v-if="isAdmin" class="flex lg4 md6 sm12 xs12">
                            <VaSelect v-model="view" :options="options" track-by="value" text-by="label"
                                value-by="value">
                            </VaSelect>
                        </div>
                        <div class="flex lg6 md6 sm12 xs12">
                            <VaInput clearable v-model="filter" @update:model-value="updateFilter" placeholder="Search">
                                <template #prependInner>
                                    <VaIcon name="fa-search" />
                                </template>
                            </VaInput>
                        </div>

                    </div>
                </VaCardContent>
                <VaCardContent>
                    <VaDataTable :loading="isLoading" :items="items"
                        :columns="['scientific_name', 'name', 'accession', 'user', 'view']">
                        <template #cell(accession)="{ rowData }">
                            <VaChip flat :to="{ name: 'item', params: { model: 'biosamples', id: rowData.accession } }">
                                {{
                                    rowData.accession }}</VaChip>
                        </template>
                        <template #cell(view)="{ rowData }">
                            <VaChip size="small" @click="handleClick(rowData)">View</VaChip>
                        </template>
                    </VaDataTable>
                </VaCardContent>
                <VaDivider style="margin: 0;" />
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
        <VaModal v-model="showDetails" hide-default-actions>
            <h3 class="va-h3">{{ selectedItem.accession }}</h3>

            <MetadataTreeCard :metadata="Object.entries(selectedItem)" :id="selectedItem.accession" />
        </VaModal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Header from '../../components/cms/Header.vue';
import { useGlobalStore } from '../../stores/global-store';
import EBIService from '../../services/EBIService';
import MetadataTreeCard from '../../components/MetadataTreeCard.vue';

const initPagination = {
    offset: 0,
    limit: 10,
}
const filter = ref('');
const pagination = ref({ ...initPagination });
const view = ref<'filtered' | 'all'>('filtered')
const offset = ref(1);
const items = ref<Record<string, any>[]>([]);
const total = ref(0);
const isLoading = ref(false)
const globalStore = useGlobalStore()
const showDetails = ref(false);
const selectedItem = ref<Record<string, any>>({})
const options = [
    { label: 'Your Submitted BioSamples', value: 'filtered' },
    { label: 'All Submitted BioSamples', value: 'all' },
]
const isAdmin = computed(() => globalStore.userRole === 'Admin')

onMounted(async () => await fetchData())

watch(() => view.value, async () => await updateFilter(""))

async function fetchData() {
    const query: Record<string, any> = { filter: filter.value, ...pagination.value }
    if (view.value === 'filtered') {
        query.user = globalStore.userName
    }
    const { data } = await EBIService.getSubmittedBioSamples(query)
    items.value = [...data.data]
    total.value = data.total

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

const handleClick = async (rowData: any) => {
    selectedItem.value = { ...rowData }
    showDetails.value = true
}
</script>