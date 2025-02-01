<template>
    <Header title="Users" description="Create, Edit or Delete your users"></Header>
    <div class="row">
        <div class="flex lg12 md12 sm12 xs12">
            <VaCard>
                <VaCardContent>
                    <div class="row justify-space-between align-center">
                        <div class="flex">
                            <h2 class="va-h6">
                                Users List
                            </h2>
                        </div>
                        <div class="flex">
                            <VaButton icon="fa-plus" :to="{ name: 'create-user' }">New User</VaButton>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <div class="row">
                        <div class="flex lg12 md12 sm12 xs12">
                            <VaInput v-model="filter" @update:model-value="debouncedUpdateSearch" clearable
                                placeholder="Search users by name">
                            </VaInput>
                        </div>
                    </div>
                </VaCardContent>
                <VaCardContent>
                    <VaDataTable :items="users" :columns="['name', 'role', 'email', 'edit', 'delete']">
                        <template #cell(edit)="{ rowData }">
                            <VaIcon v-if="GlobalStore.userName !== rowData.name" :disabled="!isAdmin" color="primary"
                                name="edit"
                                @click="$router.push({ name: 'update-user', params: { name: rowData.name } })" />
                        </template>
                        <template #cell(delete)="{ rowData }">
                            <VaIcon v-if="GlobalStore.userName !== rowData.name" :disabled="!isAdmin" color="danger"
                                name="delete" @click="deleteConfirmation(rowData)" />
                        </template>
                        <template #cell(email)="{ rowData }">
                            <VaChip flat :href="`mailto:${rowData.email}`">{{ rowData.email }}</VaChip>
                        </template>
                    </VaDataTable>
                    <div class="row justify-center">
                        <div class="flex">
                            <VaPagination v-model="offset" :page-size="pagination.limit" :total="total"
                                :visible-pages="3" buttons-preset="secondary" rounded gapped border-color="primary"
                                @update:model-value="handlePagination" />
                        </div>
                    </div>
                </VaCardContent>
            </VaCard>
        </div>
        <VaModal v-model="showModal" hide-default-actions>
            <template #header>
                <h2 class="va-text-danger">Delete {{ userToDelete.name }}</h2>
            </template>
            <div class="p-10">
                Are you sure you want to delete user: <strong>{{ userToDelete.name }}</strong> ?
            </div>
            <template #footer>
                <VaButton color="danger" @click="deleteUser"> Delete </VaButton>
            </template>
        </VaModal>
    </div>

</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useGlobalStore } from '../../stores/global-store';
import AuthService from '../../services/AuthService';
import { useToast } from 'vuestic-ui/web-components';
import Header from '../../components/cms/Header.vue';

const { init } = useToast()
const GlobalStore = useGlobalStore()
const initPagination = {
    offset: 0,
    limit: 10,
}

const isAdmin = computed(() => {
    return GlobalStore.userRole && GlobalStore.userRole === 'Admin'
})
const showModal = ref(false)
const filter = ref('')
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const users = ref<Record<string, any>[]>([])
const total = ref(0)

const userToDelete = ref({
    name: null,
})
onMounted(async () => {
    await fetchData()
})

function debounce(fn: any, delay: number) {
    let timeoutId: any;
    return function (...args: any) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}
const debouncedUpdateSearch = debounce(async () => {
    await handleSubmit()

}, 500);
async function fetchData() {
    try {
        const { data } = await AuthService.getUsers({ ...pagination.value, filter: filter.value })
        users.value = data.data
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
    pagination.value = { ...initPagination }
    await fetchData()
}

function deleteConfirmation(rowData: Record<string, any>) {
    userToDelete.value.name = rowData.name
    showModal.value = true
}

async function deleteUser() {
    showModal.value = false
    if (!userToDelete.value.name) return
    try {
        const { data } = await AuthService.deleteUser(userToDelete.value.name)
        init({ message: `${userToDelete.value.name} successfully deleted!` })
        handleSubmit()
    } catch (e) {
        init({ message: "Something happened" })
    }
}

</script>