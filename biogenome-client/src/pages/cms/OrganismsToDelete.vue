<template>
    <div class="row justify-space-between align-end">
        <div class="flex">
            <Header title="Organisms To Delete" description="The list of organisms requested to be deleted" />
        </div>
    </div>
    <div class="row justify-center">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <p>Approve the deletion request or deny it, approving the request will delete the organism and all
                        its related data. This action is irreversible</p>
                </VaCardContent>
                <VaDivider style="margin: 0;" />
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex lg6 md6">
                            <VaInput clearable v-model="filter" @update:model-value="updateFilter" placeholder="Search">
                            </VaInput>
                        </div>
                        <div class="flex">
                            <p class="va-text-secondary">Number of results: {{ total }}</p>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <VaDataTable :loading="isLoading" :items="items"
                        :columns="['taxid', 'scientific_name', 'approve', 'deny']">
                        <template #cell(approve)="{ rowData }">
                            <VaChip @click="approveRequest(rowData.taxid)" size="small" color="danger">Approve
                            </VaChip>
                        </template>
                        <template #cell(deny)="{ rowData }">
                            <VaChip @click="denyRequest(rowData.taxid)" size="small" color="warning">Deny</VaChip>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Header from '../../components/cms/Header.vue';
import { useToast } from 'vuestic-ui';
import AuthService from '../../services/AuthService';
import { AxiosError } from 'axios';
import CommonService from '../../services/CommonService';

const { init } = useToast();

const initPagination = {
    offset: 0,
    limit: 10,
}

const filter = ref('');
const pagination = ref({ ...initPagination });
const offset = ref(1);
const items = ref<Record<string, any>[]>([]);
const total = ref(0);
const isLoading = ref(false)

onMounted(async () => await fetchData())

async function fetchData() {
    const { data } = await CommonService.getItems('organisms', { pending_deletion: true, filter: filter.value, ...pagination.value })
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

async function approveRequest(taxid: string) {
    try {
        isLoading.value = true
        const { data } = await AuthService.deleteItem('organisms', taxid)
        init({ message: 'Organism deleted', color: 'success' })
        await updateFilter("")
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.response?.data as string ?? 'An error occurred', color: 'danger' });
        console.error(error);
    } finally {
        isLoading.value = false
    }
}

async function denyRequest(taxid: string) {
    try {
        isLoading.value = true
        const { data } = await AuthService.deleteOrganismsToDeleteRequest(taxid)
        init({ message: 'Request denied', color: 'success' })
        await updateFilter("")
    } catch (error) {
        const axiosError = error as AxiosError
        init({ message: axiosError.response?.data as string ?? 'An error occurred', color: 'danger' });
        console.error(error);
    } finally {
        isLoading.value = false
    }
}

</script>