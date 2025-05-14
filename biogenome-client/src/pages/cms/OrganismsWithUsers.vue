<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header title="Organism Access Overview" description="List of assigned and unassigned organisms">
                </Header>
            </div>
        </div>
        <div class="row align-center justify-space-between">
            <div class="flex">
                <div class="row">
                    <div class="flex">
                        <VaButtonToggle preset="secondary" border-color="primary" v-model="toggle"
                            :options="toggleOptions">
                        </VaButtonToggle>
                    </div>
                    <div class="flex">
                        <VaInput v-model="filter" clearable @update:model-value="debouncedUpdate"
                            placeholder="Filter by scientific name or taxid"></VaInput>
                    </div>

                    <div v-if="toggle === 'assigned'" class="flex">
                        <VaSelect :loading="fetchingUsers" multiple clearable placeholder="Filter by users"
                            v-model="selectedUsers" :options="users" track-by="name" value-by="name" text-by="name"
                            @update:model-value="debouncedUpdate">
                        </VaSelect>
                    </div>
                </div>
            </div>
            <div class="flex">
                <VaButtonDropdown stick-to-edges :close-on-content-click="false" :loading="downloadingData"
                    icon="fa-file-arrow-down" preset="primary" label="Download Report">
                    <div class="layout va-gutter-3">
                        <div style="max-width: 200px;" class="row">
                            <div class="flex lg12 md12 sm12 xs12">
                                <VaCheckbox color="primary" label="Apply current filters" v-model="applyFilters">
                                </VaCheckbox>
                            </div>
                            <div class="flex lg12 md12 sm12 xs12">
                                <VaButton icon="fa-download" block @click="downloadReport">Download</VaButton>
                            </div>
                        </div>
                    </div>
                </VaButtonDropdown>
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <VaDataTable :items="organisms" :columns="currentCols" :loading="isLoading">
                            <template #cell(assigned_users)="{ rowData }">
                                <VaChip icon="fa-edit" size="small" :to="{ name: 'update-user', params: { name } }"
                                    style="margin: 0 3px 0 3px;" v-for="name in rowData.assigned_users">
                                    {{ name }}
                                </VaChip>
                            </template>
                        </VaDataTable>
                    </VaCardContent>
                    <VaCardContent>
                        <div class="row justify-space-between align-center">
                            <div class="flex">
                                Results: {{ total }}
                            </div>
                            <div class="flex">
                                <VaPagination color="textPrimary" v-model="offset" @update:modelValue="fetchData"
                                    :page-size="pagination.limit" :total="total" :visible-pages="3"
                                    buttons-preset="primary" gapped />
                            </div>
                        </div>
                    </VaCardContent>
                </VaCard>
            </div>
        </div>
    </div>

</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import OrganismService from '../../services/OrganismService';
import Header from '../../components/cms/Header.vue';
import UserService from '../../services/UserService';


const initPagination = {
    offset: 0,
    limit: 10,
}
const usersQuery = ref<string>('')
const toggleOptions = [
    { label: 'Assigned', value: 'assigned' },
    { label: 'Unassigned', value: 'unassigned' }
]
const toggle = ref<'assigned' | 'unassigned'>('assigned')

const isLoading = ref(false)
const fetchingUsers = ref(false)
const downloadingData = ref(false)
const organisms = ref<Record<string, any>[]>([])
const total = ref(0)
const pagination = ref({ ...initPagination })
const columns = ['taxid', 'scientific_name', 'assigned_users', 'sub_project', 'sequencing_type', 'goat_status', 'insdc_status', 'target_list_status']
const applyFilters = ref(false)
const currentCols = computed(() => toggle.value === 'assigned' ? columns : columns.filter(c => c !== 'assigned_users'))

const filter = ref('')
const users = ref<Record<string, any>[]>([])
const callback = computed(() => toggle.value === 'assigned' ? OrganismService.getOrganismsWithUsers : OrganismService.getUnassignedOrganisms)

const offset = computed({
    get() {
        return pagination.value.offset + 1
    },
    set(v: number) {
        pagination.value.offset = v - 1
    }
})

const selectedUsers = computed({
    get() {
        return usersQuery.value.split(',')
    },
    set(v: string[]) {
        usersQuery.value = v.join(',')
    }
})


const query = computed(() => (toggle.value === 'assigned' ?
    { name__in: usersQuery.value, filter: filter.value, ...pagination.value } : { filter: filter.value, ...pagination.value }))


watch(toggle, async () => {
    selectedUsers.value = []
    filter.value = ""
    await handleUpdate()
}, { immediate: true })

onMounted(async () => {
    await getUsers()
})

async function getUsers() {
    try {
        fetchingUsers.value = true
        const { data } = await UserService.getUsers({ limit: 10000 })
        users.value = [...data.data.filter((u: any) => u.role !== 'Admin')]
    } catch (e) {
        console.error(e)
    } finally {
        fetchingUsers.value = false
    }

}

async function handleUpdate() {
    pagination.value = { ...initPagination }
    await fetchData()
}

async function downloadReport() {
    try {
        downloadingData.value = true
        const { data } = await callback.value({ format: 'tsv', ...query.value }, true)
        const href = URL.createObjectURL(data);

        const filename = `${toggle.value}_species.tsv`
        // create "a" HTML element with href to file & click
        const link = document.createElement('a');
        link.href = href;
        link.setAttribute('download', filename); //or any other extension
        document.body.appendChild(link);
        link.click();
        // clean up "a" element & remove ObjectURL
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    } catch (err) {
        console.error(err)
    } finally {
        downloadingData.value = false
    }
}

async function fetchData() {
    try {
        isLoading.value = true
        const { data } = await callback.value({ ...query.value })
        organisms.value = data.data
        total.value = data.total
    } catch (e) {
        console.log(e)
    } finally {
        isLoading.value = false
    }
}
function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

const debouncedUpdate = debounce(async () => {
    await handleUpdate()
}, 500);


</script>