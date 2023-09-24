<template>
    <va-breadcrumbs>
        <va-breadcrumbs-item v-for="(bc, index) in breadcrumbs" :key="index" :active="bc.active"
            :label="t(bc.name)" :to="bc.path"/>
    </va-breadcrumbs>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BreadCrumb } from '../../data/types';
const { t } = useI18n()


const props = defineProps<{
    breadcrumbs: BreadCrumb[]
}>()

</script>