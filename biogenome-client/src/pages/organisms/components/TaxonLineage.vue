<template>
    <div class="row row-equal">
        <div class="flex">
            <span v-for="(taxon, index) in taxons" :key="index" class="mr-2">
                <router-link class="va-text-secondary" :to="{ name: 'taxon', params: { taxid: taxon.taxid } }">
                    {{ taxon.name }}
                </router-link>
            </span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { TaxonNode } from '../../../data/types';
import OrganismService from '../../../services/clients/OrganismService';
import { ref } from 'vue'
const props = defineProps<{
    taxid: string
}>()
const taxons = ref<TaxonNode[]>([])
const { data } = await OrganismService.getOrganismLineage(props.taxid)
taxons.value = [...data]

</script>