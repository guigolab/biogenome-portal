<template>
    <div class="row">
        <div class="flex">
            <va-select v-model="organismStore.organismForm.goat_status" label="Goat Status" :options="STATUS"
                class="mt-3" :disabled="organismStore.organismForm.goat_status === 'INSDC Submitted' ||
                    organismStore.organismForm.goat_status === 'Publication Available'
                    ">
            </va-select>
        </div>
        <div class="flex">
            <va-select v-model="organismStore.organismForm.target_list_status" label="Target List Status"
                :options="LIST" class="mt-3">
            </va-select>
        </div>
    </div>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../stores/organism-store';

const organismStore = useOrganismStore()
const STATUS = ['Sample Collected', 'Sample Acquired', 'Data Generation', 'In Assembly']
const LIST = ['long_list', 'family_representative', 'other_priority']


</script>