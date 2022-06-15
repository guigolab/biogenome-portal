<template>
<div class="row">
    <div class="flex">
        <TreeSideBar @on-toggle="toggleNode"  :toggle="toggle"/>
    </div>
    <div class="flex">
        <DataCards/>
        <div class="row">
            <div class="flex">
                <OrganismList :total="orgStore.total" :organisms="orgStore.organisms" :query="orgStore.query"/>
            </div>
            <div class="flex">
                <TaxonBreadCrumbs/>
            </div>
        </div>
    </div>

    <div class="flex">
        
    </div>

    <!-- <div v-if="orgStore.total > 0" class="flex">
        <BarChart/>
         <LastPublished/> 
    </div> -->
</div>

</template>
<script setup>
import BarChart from '../components/BarChart.vue'
import TaxonBreadCrumbs from '../components/TaxonBreadCrumbs.vue'
import OrganismList from '../components/OrganismList.vue'
import OrganismTable from '../components/OrganismTable.vue'
import TreeSideBar from '../components/TreeSideBar.vue'
import DataCards from '../components/DataCards.vue'
import OrganismForm from '../components/OrganismForm.vue'
import {organisms} from '../stores/organisms'
import {taxons} from '../stores/taxons'
import {onMounted,watch,ref} from 'vue'

const orgStore = organisms()
const taxStore = taxons()
const toggle = ref(false)

function toggleNode(value){
    toggle.value = value
}
function toggleCrumb(value){
    taxStore.taxonNav = [...value.taxonNav]
    taxStore.tree = {...value.tree}
    orgStore.query.parent_taxid = value.taxid
}
onMounted(()=>{
    orgStore.loadOrganisms()
})

watch(orgStore.query, ()=>{
    console.log('HELLOOOO')
    orgStore.loadOrganisms()
},{deep:true})

function updateQuery(dataKey){
    console.log(updateQuery)
    orgStore.query[dataKey] = orgStore.query[dataKey] ? null : true
}

</script>