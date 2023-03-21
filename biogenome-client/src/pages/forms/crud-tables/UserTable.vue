<template>
  <div class="row align-center justify-space-between">
    <div class="flex lg4 md6 sm12 xs12">
      <va-input v-model="filter.filter" label="search user">
        <template #append>
          <va-button :disabled="filter.filter.length <= 2" icon="search" @click="handleSubmit"> Search </va-button>
        </template>
      </va-input>
    </div>
    <div class="flex">
      <va-button :disabled="!isAdmin" @click="showCreationModal = true" color="info">Create a new User</va-button>
    </div>
  </div>
  <va-data-table :items="users" :columns="['name', 'role', 'actions']">
    <template #cell(actions)="{ rowData }">
      <va-chip v-if="GlobalStore.userName !== rowData.name" :disabled="!isAdmin" color="danger" icon="delete" @click="deleteConfirmation(rowData)">Delete User</va-chip>
    </template>
  </va-data-table>
  <div class="row justify-center">
    <div class="flex">
      <va-pagination
        v-model="offset"
        :page-size="pagination.limit"
        :total="total"
        :visible-pages="3"
        buttons-preset="secondary"
        rounded
        gapped
        border-color="primary"
        @update:model-value="handlePagination"
      />
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
      <va-button color="danger" @click="deleteUser()"> Delete </va-button>
    </template>
  </va-modal>
  <va-modal v-model="showCreationModal" hide-default-actions>
    <template #header>
      <h2 class="va-h3">User Creation</h2>
    </template>
    <va-form tag="form" @submit.prevent="createUser">
      <va-input class="mb-4" label="user name" v-model="newUser.name"></va-input>
      <va-input class="mb-4" label="user password" v-model="newUser.password"></va-input>
      <va-select class="mb-4" label="user role" v-model="newUser.role" :options="['SampleManager', 'DataManager', 'Admin']"></va-select>
      <va-card-actions align="between">
        <va-button type="reset" color="danger">reset</va-button>
        <va-button type="submit" >Submit</va-button>

      </va-card-actions>
    </va-form>
  </va-modal>
</template>
<script setup lang="ts">
  import { ref, onMounted, computed, reactive } from 'vue'
  import UserService from '../../../services/clients/UserService'
  import { useGlobalStore } from '../../../stores/global-store';
  import { useToast } from 'vuestic-ui'
import AuthService from '../../../services/clients/AuthService';
const { init } = useToast()
  const GlobalStore = useGlobalStore()
  const initPagination = {
    offset: 0,
    limit: 10,
  }

  const newUser = ref({
    name:'',
    password:'',
    role: ''
  })
  const initFilter = {
    filter: '',
  }

  const isAdmin = computed(()=>{
    return GlobalStore.userRole && GlobalStore.userRole === 'Admin'
  })
  const showModal = ref(false)
  const showCreationModal=ref(false)
  const filter = ref({ ...initFilter })
  const pagination = ref({ ...initPagination })
  const offset = ref(1 + pagination.value.offset)
  const users = ref([])
  const total = ref(0)

  const userToDelete = ref({
    name: null,
  })
  onMounted(async () => {
    const { data } = await UserService.getUsers({ ...pagination.value })
    users.value = data.data
    total.value = data.total
  })

  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    const { data } = await UserService.getUsers({ ...pagination.value, ...filter.value })
    users.value = data.data
    total.value = data.total
  }
  async function handleSubmit() {
    const { data } = await UserService.getUsers({ ...pagination.value, ...filter.value })
    users.value = data.data
    total.value = data.total
    pagination.value = { ...initPagination }
  }

  function deleteConfirmation(rowData) {
    userToDelete.value.name = rowData.name
    showModal.value = true
  }

  async function deleteUser() {
    const { data } = await AuthService.deleteUser(userToDelete.value.name)
    pagination.value = { ...initPagination }
    filter.value = {...initFilter}
    const response = await UserService.getUsers({ ...pagination.value, ...filter.value })
    users.value = response.data.data
    total.value = response.data.total
    showModal.value=false
    init({message:data, color:'success'})
  }

  async function createUser(){
    const {data} = await AuthService.createUser(newUser.value)
    showCreationModal.value =false
    pagination.value = { ...initPagination }
    filter.value = {...initFilter}
    const response = await UserService.getUsers({ ...pagination.value, ...filter.value })
    users.value = response.data.data
    total.value = response.data.total
    init({message:data, color:'success'})
  }
</script>
