<template>
<div class="row">
    <div class="flex lg3 md3"/>
    <div class="flex lg6 md6">
        <DataCards @onDataSelection="updateQuery"/>
    </div>
</div>
<div class="row align--end">
    <div class="flex lg3 md3"/>
    <div class="flex lg6 md6">
        <TaxonBreadCrumbs/>
    </div>
</div>
<div class="row">
    <div class="flex lg3 md3">
        <TreeSideBar/>
    </div>
    <div class="flex lg6 md6">
        <OrganismList v-if="orgStore.organisms.length" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query"/>
    </div>
</div>
</template>
<script setup>
import TaxonBreadCrumbs from '../components/TaxonBreadCrumbs.vue'
import OrganismList from '../components/OrganismList.vue'
import OrganismTable from '../components/OrganismTable.vue'
import TreeSideBar from '../components/TreeSideBar.vue'
import DataCards from '../components/DataCards.vue'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'
import {onMounted,watch} from 'vue'

const orgStore = organisms()
const taxStore = taxons()

onMounted(()=>{
    orgStore.loadOrganisms()
})

function updateQuery(dataKey){
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}
watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
})
</script>