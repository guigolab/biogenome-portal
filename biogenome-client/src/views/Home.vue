<template>
<div class="row">
    <div class="flex"/>
    <div class="flex">
        <DataCards @on-data-selection="updateQuery" :query="orgStore.query"/>
    </div>
</div>

<div class="row align--end">
    <div class="flex">
        <TaxonBreadCrumbs/>
    </div>
</div>
<div class="row">
    <div class="flex">
        <TreeSideBar/>
    </div>
    <div class="flex">
        <OrganismList v-if="orgStore.organisms.length" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query"/>
    </div>
    <div class="flex">
        <OrganismForm />
    </div>
</div>
</template>
<script setup>
import TaxonBreadCrumbs from '../components/TaxonBreadCrumbs.vue'
import OrganismList from '../components/OrganismList.vue'
import OrganismTable from '../components/OrganismTable.vue'
import TreeSideBar from '../components/TreeSideBar.vue'
import DataCards from '../components/DataCards.vue'
import OrganismForm from '../components/OrganismForm.vue'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'
import {onMounted,watch} from 'vue'

const orgStore = organisms()
const taxStore = taxons()

onMounted(()=>{
    orgStore.loadOrganisms()
})
watch(orgStore.query, ()=>{
    orgStore.loadOrganisms()
})
function updateQuery(dataKey){
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>