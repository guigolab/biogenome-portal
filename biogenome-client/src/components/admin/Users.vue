<template>
<div/>
<!-- <div class="row">
<div class="flex">
  <va-data-table :items="users" :columns="columns" striped>
    <template #headerAppend>
      <tr class="table-example--slot">
        <th
          v-for="key in ['name','password']"
          :key="key"
          colspan="1"
        >
          <va-input
            :placeholder="key"
            v-model="authStore.user[key]"
          />
        </th>
        <th
          colspan="1"
        >
          <va-select
            :options="ROLES"
            value-by="value"
            v-model="authStore.user.role"
          />
        </th>
        <th colspan="1">
          <va-button
            @click="addNewUser()"
            :disabled="!isNewData"
          >
            Add
          </va-button>
        </th>
      </tr>
    </template>

    <template #cell(actions)="{ rowIndex }">
      <va-button flat icon="edit" @click="openModalToEditItemById(rowIndex)" />
      <va-button flat icon="delete" @click="deleteItemById(rowIndex)" />
    </template>
  </va-data-table>

  <va-modal
    :model-value="!!editedItem"
    message="Edit item"
    @ok="editItem"
    @cancel="resetEditedItem"
  >
    <slot>
      <va-input
        v-for="key in Object.keys(editedItem)"
        :key="key"
        class="my-3"
        :label="key"
        v-model="editedItem[key]"
      />
    </slot>
  </va-modal>
    </div>
</div> -->
</template>


<script setup>
// import { computed, onMounted, reactive,ref } from 'vue'
// import {ROLES} from '../../../config'
// import submissionService from '../../services/SubmissionService'
// import {auth} from '../../stores/auth'

// const authStore = auth()

// const columns = [
//       { key: 'name', sortable: true },
//       { key: 'password', sortable: true},
//       { key: 'role', sortable: true },
//       { key: 'actions', width: 80 },
//     ]

// const isNewData = computed(()=>{
//     return Object.keys(user).every((key) => !!user[key])
// })

// const alert = reactive({
//     color:'',
//     message:''
// })

// const showAlert = ref(false)

// const initialUser = {
//     name:'',
//     password:'',
//     role:''
// }

// const user = reactive({
//    ...initialUser
// })
// const editedUser = reactive({
//     id:null,
//     data:null,
// })

// const userData = reactive({
//     users:null
// })

// onMounted(()=>{
//     submissionService.getUsers()
//     .then(resp => {
//         userData.users = resp.data
//     })

// })

// function resetEditedItem() {
//       editedUser.id = null
//       editedUser.data = null
//     }
// function resetForm() {
//     Object.assign(user, initialUser);
// }
// function deleteItemById(id) {
//     }
// function addNewUser(){
//     submissionService.createUser(user)
//     .then(resp => {
//         alert.color = 'successe'
//         alert.message = resp.data
//         showAlert.value = true
//     })
//     .catch(e => {
//         alert.color = 'warning'
//         alert.message = e
//         showAlert.value = true
//     })
//     //   this.items = [...this.items, { ...this.createdItem }]
//       resetForm()
//     }
// function editUser(){
//     // userData.users = [
//     //     ...this.items.slice(0, this.editedItemId),
//     //     { ...this.editedItem },
//     //     ...this.items.slice(this.editedItemId + 1),
//     //   ]
//     //   this.resetEditedItem()
//     }

// function openModalToEditItemById(id){
//       editedUser.id = id
//       editedUser.data = { ...userData.users[id] }
// }
</script>