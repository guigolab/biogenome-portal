<template>
    <VaCollapse v-model="showCollapse" :header="'Filters for ' + t(`tabs.${model}`)">
        <FilterForm :model="model" />
    </VaCollapse>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import FilterForm from '../forms/FilterForm.vue';
import { DataModels } from '../../data/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const showCollapse = ref(true)
const props = defineProps<{
    model: DataModels
}>()



</script>