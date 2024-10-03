<template>
    <h4 class="va-h4">Users</h4>
    <p class="mb-4">Create, Edit or Delete your users</p>
    <va-form @submit.prevent="handleSubmit">
        <div class="row align-end">
            <va-input class="flex lg4 md6 sm12 xs12" v-model="filter.filter" label="search user">
                <template #append>
                    <va-button type="submit" :disabled="filter.filter.length < 2" icon="search">
                    </va-button>
                    <va-button type="reset" :disabled="filter.filter.length < 2" icon="cancel" @click="reset">
                    </va-button>
                </template>
            </va-input>
            <div class="flex">
                <va-button color="success" :to="{ name: 'create-user' }">New User</va-button>
            </div>
        </div>
    </va-form>
    <va-data-table :items="users" :columns="['name', 'role', 'edit', 'delete']">
        <template #cell(edit)="{ rowData }">
            <va-icon v-if="GlobalStore.userName !== rowData.name" :disabled="!isAdmin" color="primary" name="edit"
                @click="$router.push({ name: 'update-user', params: { name: rowData.name } })" />
        </template>
        <template #cell(delete)="{ rowData }">
            <va-icon v-if="GlobalStore.userName !== rowData.name" :disabled="!isAdmin" color="danger" name="delete"
                @click="deleteConfirmation(rowData)" />
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
            <h2 style="color: red">Delete {{ userToDelete.name }}</h2>
        </template>
        <div style="padding: 10px">
            Are you sure you want to delete user: <strong>{{ userToDelete.name }}</strong> ?
        </div>
        <template #footer>
            <va-button color="danger" @click="deleteUser"> Delete </va-button>
        </template>
    </va-modal>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import UserService from '../../../services/clients/UserService'
import { useGlobalStore } from '../../../stores/global-store';
import AuthService from '../../../services/clients/AuthService';
import { useToast } from 'vuestic-ui/web-components';


const { init } = useToast()
const GlobalStore = useGlobalStore()
const initPagination = {
    offset: 0,
    limit: 10,
}

const initFilter = {
    filter: '',
}

const isAdmin = computed(() => {
    return GlobalStore.userRole && GlobalStore.userRole === 'Admin'
})
const showModal = ref(false)
const filter = ref({ ...initFilter })
const pagination = ref({ ...initPagination })
const offset = ref(1 + pagination.value.offset)
const users = ref([])
const total = ref(0)

const userToDelete = ref({
    name: null,
})
onMounted(async () => {
    await fetchData()
})

async function fetchData() {
    try {
        const { data } = await UserService.getUsers({ ...pagination.value })
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
    await fetchData()

    pagination.value = { ...initPagination }
}
async function reset() {
    filter.value = { ...initFilter }
    pagination.value = { ...initPagination }
    await fetchData()

}
function deleteConfirmation(rowData: Record<string, any>) {
    userToDelete.value.name = rowData.name
    showModal.value = true
}

async function deleteUser() {
    showModal.value = false
    try {
        const { data } = await AuthService.deleteUser(userToDelete.value.name)
        init({ message: `${userToDelete.value.name} successfully deleted!` })
        handleSubmit()

    } catch (e) {

        init({ message: "Something happened" })
    }
}

</script>