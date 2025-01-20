<template>
    <va-divider> GoaT Information</va-divider>
    <va-card-content>
        <va-select v-model="organismStore.organismForm.goat_status" label="Goat Status" :options="STATUS" class="mt-3"
            :disabled="organismStore.organismForm.goat_status === 'INSDC Submitted' ||
                organismStore.organismForm.goat_status === 'Publication Available'
                ">
        </va-select>
        <va-select v-model="organismStore.organismForm.target_list_status" label="Target List Status" :options="LIST"
            class="mt-3">
        </va-select>
    </va-card-content>
</template>
<script setup lang="ts">
import { useOrganismStore } from '../../../stores/organism-store';

const organismStore = useOrganismStore()
const STATUS = ['Sample Collected', 'Sample Acquired', 'Data Generation', 'In Assembly']
const LIST = ['long_list', 'family_representative', 'other_priority']


</script>