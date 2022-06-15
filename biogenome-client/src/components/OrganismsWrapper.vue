<template>
    <div class="flex">
        <div class="row align--end">
            <div class="flex">
                <TaxonBreadCrumbs/>
            </div>
        </div>
        <div class="row align--end">
            <div class="flex">
                <OrganismForm/>
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12">
                <OrganismList v-if="orgStore.organisms.length" :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query"/>
            </div>
        </div>
    </div>
</template>
<script setup>
import TaxonBreadCrumbs from './TaxonBreadCrumbs.vue'
import OrganismList from './OrganismList.vue'
import OrganismTable from './OrganismTable.vue'
import TreeSideBar from './TreeSideBar.vue'
import DataCards from './DataCards.vue'
import OrganismForm from './OrganismForm.vue'
import {onMounted,watch} from 'vue'

const orgStore = organisms()

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