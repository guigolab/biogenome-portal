<template>
    <va-card >
        <va-card-title>
            {{ t('dashboard.tree') }}
        </va-card-title>
        <va-card-content class="chart" style="overflow: scroll;">
            <IndentedTree :data="data"/>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import TaxonService from '../../services/clients/TaxonService';
import IndentedTree from '../../components/tree/IndentedTree.vue';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const taxid = import.meta.env.VITE_ROOT_NODE ? import.meta.env.VITE_ROOT_NODE: '1'
const {data} = await TaxonService.getTree('8457')

</script>