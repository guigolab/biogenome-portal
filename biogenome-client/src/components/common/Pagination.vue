<template>
    <va-pagination v-model="offset" :page-size="pagination.limit" :total="total" :visible-pages="3"
        buttons-preset="secondary" rounded gapped border-color="primary"
        @update:model-value="(v: number) => emits('handlePagination', v)" />
</template>
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    pagination: {
        offset: number,
        limit: number
    },
    total: number
}>()

const offset = ref(1 + props.pagination.offset)

const emits = defineEmits(['handlePagination'])

</script>