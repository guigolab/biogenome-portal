<template>
    <va-card >
        <va-card-title>
            phylogenetic tree
        </va-card-title>
        <va-card-content class="chart" style="overflow: scroll;">
            <IndentedTree :data="data"/>
        </va-card-content>
    </va-card>
</template>
<script setup lang="ts">
import TaxonService from '../../services/clients/TaxonService';
import IndentedTree from '../organisms/IndentedTree.vue';

const {data} = await TaxonService.getTree('131567')

</script>