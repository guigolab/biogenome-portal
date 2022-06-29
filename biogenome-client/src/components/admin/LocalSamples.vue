<template>
<div class="row">
  <div class="flex lg12 md12 sm12 xs12">
    <ExcelForm/>
  </div>
</div>

  <!-- <va-data-table :items="users" :columns="columns" striped>
    <template #cell(actions)="{ rowIndex }">
      <va-button flat icon="edit" @click="openModalToEditItemById(rowIndex)" />
      <va-button flat icon="delete" @click="deleteItemById(rowIndex)" />
    </template>
  </va-data-table> -->

  <!-- <va-modal
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
  </va-modal> -->

</template>


<script setup>
import ExcelForm from './form/ExcelForm.vue'
import { computed, onMounted, reactive,ref } from 'vue'
import submissionService from '../../services/SubmissionService'

// const columns = [
//       { key: 'local_id', sortable: true },
//       { key: 'scientific_name', sortable: true},
//       { key: 'taxid', sortable: true },
//       { key: 'coordinates'},
//       { key: 'valid', sortable: true},
//       { key: 'actions', width: 80 },
//     ]

// var sampleData = []

// onMounted(()=>{

// })


</script>